import crypto from "crypto";
import { db } from "@/infrastructure/database/client";
import {
  orders,
  orderItems,
  orderTenders,
  inventoryPositions,
  stockMovements,
  appointments,
  appointmentStatusHistory,
  journalEntries,
  journalLines,
  auditLogs,
  outboxEvents,
  subscriptionInvoices,
  tenantSubscriptions,
  subscriptionStatusHistory,
} from "@/infrastructure/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { IPaymentRepository } from "../domain/payment.repository.interface";
import { PaymentProviderFactory } from "../infrastructure/providers/provider-factory";
import { PaymentWebhookEvent } from "../domain/payment-webhook-event";
import { PaymentAttempt } from "../domain/payment-attempt";
import { PaymentProviderType } from "../domain/payment-provider.interface";
import {
  PaymentSignatureInvalidError,
  PaymentNotFoundError,
} from "../domain/payment-errors";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { STANDARD_ACCOUNT_CODES } from "@/modules/finance/domain/financial-account";

export interface ProcessWebhookInput {
  providerType: PaymentProviderType;
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface ProcessWebhookOutput {
  status: "PROCESSED" | "IGNORED_DUPLICATE" | "FAILED";
  message: string;
  paymentIntentId?: string;
  providerEventId: string;
}

export class ProcessWebhookUseCase {
  private readonly financeRepository = new DrizzleFinanceRepository();

  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(input: ProcessWebhookInput): Promise<ProcessWebhookOutput> {
    const provider = PaymentProviderFactory.getProvider(input.providerType);

    // 1. Signature Verification
    const isValid = await provider.verifyWebhook({
      rawBody: input.rawBody,
      headers: input.headers,
    });

    const payloadHash = crypto
      .createHash("sha256")
      .update(input.rawBody)
      .digest("hex");

    if (!isValid) {
      // Record failed security attempt
      const failedEvent = new PaymentWebhookEvent({
        provider: input.providerType,
        providerEventId: `invalid-sig-${Date.now()}`,
        eventType: "unverified",
        payloadHash,
        signatureValid: false,
        processingStatus: "FAILED",
        errorCode: "INVALID_SIGNATURE",
      });
      await this.paymentRepository.saveWebhookEvent(failedEvent);

      throw new PaymentSignatureInvalidError();
    }

    // 2. Parse Webhook Event
    const event = await provider.parseWebhook({
      rawBody: input.rawBody,
      headers: input.headers,
    });

    // 3. Webhook Replay Protection
    const existingEvent = await this.paymentRepository.findWebhookEvent(
      input.providerType,
      event.providerEventId
    );

    if (existingEvent && existingEvent.processingStatus === "PROCESSED") {
      return {
        status: "IGNORED_DUPLICATE",
        message: "Event already processed",
        providerEventId: event.providerEventId,
      };
    }

    // 4. Atomic Execution within Database Transaction
    return await db.transaction(async (tx) => {
      // Register or update webhook event row
      const webhookEventRecord = new PaymentWebhookEvent({
        id: existingEvent?.id,
        provider: input.providerType,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        payloadHash,
        signatureValid: true,
        processingStatus: "RECEIVED",
      });
      await this.paymentRepository.saveWebhookEvent(webhookEventRecord, tx);

      // Lock PaymentIntent by reference or transaction ID
      let intent = await this.paymentRepository.findIntentByReference(
        input.providerType,
        event.providerReference,
        tx
      );

      if (!intent && event.providerTransactionId) {
        intent = await this.paymentRepository.findIntentByTransactionId(
          input.providerType,
          event.providerTransactionId,
          tx
        );
      }

      if (!intent) {
        webhookEventRecord.markFailed("PAYMENT_NOT_FOUND");
        await this.paymentRepository.saveWebhookEvent(webhookEventRecord, tx);
        throw new PaymentNotFoundError(event.providerReference || event.providerTransactionId);
      }

      // Re-fetch intent FOR UPDATE
      intent = (await this.paymentRepository.findIntentByIdForUpdate(intent.id!, tx))!;

      // Idempotency: If already succeeded, return immediately
      if (intent.status === "SUCCEEDED") {
        webhookEventRecord.markProcessed();
        await this.paymentRepository.saveWebhookEvent(webhookEventRecord, tx);
        return {
          status: "IGNORED_DUPLICATE",
          message: "Payment intent already in SUCCEEDED status",
          paymentIntentId: intent.id,
          providerEventId: event.providerEventId,
        };
      }

      // Handle Provider Outcome
      if (event.status === "APPROVED") {
        intent.markSucceeded(event.providerTransactionId, event.paymentMethodType, event.finalizedAt);
        await this.paymentRepository.savePaymentIntent(intent, tx);

        // Record approved attempt
        const attempt = new PaymentAttempt({
          paymentIntentId: intent.id!,
          providerTransactionId: event.providerTransactionId,
          paymentMethodType: event.paymentMethodType,
          status: "APPROVED",
          rawResponseSanitized: event.rawPayload,
          completedAt: new Date(),
        });
        await this.paymentRepository.savePaymentAttempt(attempt, tx);

        if (intent.orderId) {
          // Update Order Tender to PROVIDER_VERIFIED
          await tx
            .update(orderTenders)
            .set({
              verificationStatus: "PROVIDER_VERIFIED",
              method: event.paymentMethodType ?? "EXTERNAL_CARD",
              reference: event.providerTransactionId,
            })
            .where(eq(orderTenders.paymentIntentId, intent.id!));

          // Lock and load Order
          const [order] = await tx
            .select()
            .from(orders)
            .where(eq(orders.id, intent.orderId))
            .for("update")
            .limit(1);

          // Convert Inventory Reservations
          const reservations = await this.paymentRepository.listReservationsByPaymentIntent(
            intent.id!,
            tx
          );

          for (const res of reservations) {
            if (res.status === "ACTIVE") {
              const [position] = await tx
                .select()
                .from(inventoryPositions)
                .where(
                  and(
                    eq(inventoryPositions.productVariantId, res.productVariantId),
                    eq(inventoryPositions.locationId, res.locationId),
                    eq(inventoryPositions.ownerTenantId, res.ownerTenantId)
                  )
                )
                .for("update")
                .limit(1);

              if (position) {
                await tx
                  .update(inventoryPositions)
                  .set({
                    reserved: Math.max(0, position.reserved - res.quantity),
                    onHand: Math.max(0, position.onHand - res.quantity),
                    updatedAt: new Date(),
                  })
                  .where(eq(inventoryPositions.id, position.id));

                // Insert stock movement
                await tx.insert(stockMovements).values({
                  ownerTenantId: res.ownerTenantId,
                  locationId: res.locationId,
                  productVariantId: res.productVariantId,
                  movementType: "SALE",
                  quantity: res.quantity,
                  sourceType: "PAYMENT",
                  sourceId: intent.id,
                  reason: `Sold via Payment #${intent.id?.slice(0, 8)}`,
                });
              }

              res.markConverted();
              await this.paymentRepository.saveReservation(res, tx);
            }
          }

          // Verify total tenders against order total
          const allTenders = await tx
            .select()
            .from(orderTenders)
            .where(eq(orderTenders.orderId, order.id));

          let paidTotal = 0n;
          for (const t of allTenders) {
            if (t.verificationStatus === "PROVIDER_VERIFIED" || t.verificationStatus === "MANUAL_DECLARED") {
              paidTotal += BigInt(t.amountMinor);
            }
          }

          const isFullyPaid = paidTotal >= BigInt(order.grandTotalMinor);

          if (isFullyPaid) {
            await tx
              .update(orders)
              .set({
                status: "COMPLETED",
                completedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(orders.id, order.id));

            // If linked to appointment, complete appointment
            if (order.appointmentId) {
              await tx
                .update(appointments)
                .set({
                  status: "COMPLETED",
                  updatedAt: new Date(),
                })
                .where(eq(appointments.id, order.appointmentId));

              await tx.insert(appointmentStatusHistory).values({
                appointmentId: order.appointmentId,
                fromStatus: "IN_PROGRESS",
                toStatus: "COMPLETED",
                reason: `Completed via Payment Intent #${intent.id?.slice(0, 8)}`,
              });
            }
          }

          // Financial Posting into Double-Entry Ledger
          // Ensure chart of accounts for collector tenant
          const accounts = await this.financeRepository.getOrCreateDefaultAccounts(
            intent.collectorTenantId,
            order.currency,
            tx
          );

          const clearingAcc = accounts.get(STANDARD_ACCOUNT_CODES.PAYMENT_PROVIDER_CLEARING)!;
          const revenueAcc = accounts.get(STANDARD_ACCOUNT_CODES.PRODUCT_SALES_REVENUE)!;
          const cogsAcc = accounts.get(STANDARD_ACCOUNT_CODES.COST_OF_GOODS_SOLD)!;
          const inventoryAcc = accounts.get(STANDARD_ACCOUNT_CODES.INVENTORY_ASSET)!;

          const entryNumber = `JE-PAY-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
          const [journal] = await tx
            .insert(journalEntries)
            .values({
              tenantId: intent.collectorTenantId,
              entryNumber,
              entryType: "PAYMENT",
              currency: order.currency,
              sourceType: "PAYMENT",
              sourceId: intent.id,
              description: `Payment confirmed via ${intent.provider} for Order #${order.orderNumber}`,
              status: "POSTED",
            })
            .returning();

          // DEBIT Payment Clearing
          await tx.insert(journalLines).values({
            journalEntryId: journal.id,
            financialAccountId: clearingAcc.id,
            tenantId: intent.collectorTenantId,
            direction: "DEBIT",
            amountMinor: intent.amountMinor,
            memo: `Payment Clearing - Order #${order.orderNumber}`,
          });

          // CREDIT Revenue
          await tx.insert(journalLines).values({
            journalEntryId: journal.id,
            financialAccountId: revenueAcc.id,
            tenantId: intent.collectorTenantId,
            direction: "CREDIT",
            amountMinor: intent.amountMinor,
            memo: `Sales Revenue recognized via ${intent.provider}`,
          });

          // COGS recognition if items have cost basis
          const items = await tx
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));

          let totalCogs = 0n;
          for (const it of items) {
            if (it.itemType === "PRODUCT" && it.unitCostMinor) {
              totalCogs += BigInt(it.unitCostMinor) * BigInt(it.quantity);
            }
          }

          if (totalCogs > 0n && isFullyPaid) {
            await tx.insert(journalLines).values({
              journalEntryId: journal.id,
              financialAccountId: cogsAcc.id,
              tenantId: intent.collectorTenantId,
              direction: "DEBIT",
              amountMinor: totalCogs,
              memo: `COGS recognized for Order #${order.orderNumber}`,
            });

            await tx.insert(journalLines).values({
              journalEntryId: journal.id,
              financialAccountId: inventoryAcc.id,
              tenantId: intent.collectorTenantId,
              direction: "CREDIT",
              amountMinor: totalCogs,
              memo: `Inventory Asset reduction for Order #${order.orderNumber}`,
            });
          }

          // Audit & Outbox
          await tx.insert(auditLogs).values({
            tenantId: intent.collectorTenantId,
            action: "payment.succeeded",
            entityType: "payment_intent",
            entityId: intent.id,
            metadata: {
              orderId: order.id,
              providerTransactionId: event.providerTransactionId,
              amountMinor: intent.amountMinor.toString(),
              provider: input.providerType,
            },
          });

          await tx.insert(outboxEvents).values({
            tenantId: intent.collectorTenantId,
            aggregateId: intent.id!,
            eventType: "payment.succeeded.v1",
            payload: {
              paymentIntentId: intent.id,
              orderId: order.id,
              orderNumber: order.orderNumber,
              providerTransactionId: event.providerTransactionId,
              amountMinor: intent.amountMinor.toString(),
              currency: order.currency,
            },
          });
        } else if (intent.subscriptionInvoiceId) {
          // SaaS Subscription Invoice Payment
          const [invoice] = await tx
            .select()
            .from(subscriptionInvoices)
            .where(eq(subscriptionInvoices.id, intent.subscriptionInvoiceId))
            .for("update")
            .limit(1);

          if (invoice && invoice.status !== "PAID") {
            const now = new Date();
            await tx
              .update(subscriptionInvoices)
              .set({
                status: "PAID",
                paidAt: now,
                updatedAt: now,
              })
              .where(eq(subscriptionInvoices.id, invoice.id));

            const [sub] = await tx
              .select()
              .from(tenantSubscriptions)
              .where(eq(tenantSubscriptions.id, invoice.subscriptionId))
              .for("update")
              .limit(1);

            if (sub) {
              const fromStatus = sub.status;
              const updates: any = {
                status: "ACTIVE",
                currentPeriodStart: invoice.periodStart,
                currentPeriodEnd: invoice.periodEnd,
                pastDueAt: null,
                graceEndsAt: null,
                suspendedAt: null,
                updatedAt: now,
              };

              if (sub.pendingPlanId) {
                updates.planId = sub.pendingPlanId;
                updates.pendingPlanId = null;
                updates.pendingPlanEffectiveAt = null;
              }

              await tx
                .update(tenantSubscriptions)
                .set(updates)
                .where(eq(tenantSubscriptions.id, sub.id));

              if (fromStatus !== "ACTIVE") {
                await tx.insert(subscriptionStatusHistory).values({
                  subscriptionId: sub.id,
                  tenantId: sub.tenantId,
                  fromStatus,
                  toStatus: "ACTIVE",
                  reason: `Subscription payment confirmed for invoice ${invoice.invoiceNumber}`,
                  source: "PAYMENT_WEBHOOK",
                  metadata: {
                    paymentIntentId: intent.id,
                    invoiceNumber: invoice.invoiceNumber,
                  },
                });
              }

              // Post Double-Entry Journal Entry to Platform Ledger
              const accounts = await this.financeRepository.getOrCreateDefaultAccounts(
                intent.collectorTenantId,
                intent.currency,
                tx
              );

              const clearingAcc = accounts.get(STANDARD_ACCOUNT_CODES.PAYMENT_PROVIDER_CLEARING)!;
              const saasRevAcc = accounts.get(STANDARD_ACCOUNT_CODES.SAAS_SUBSCRIPTION_REVENUE)!;

              const entryNumber = `JE-SAAS-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
              const [journal] = await tx
                .insert(journalEntries)
                .values({
                  tenantId: intent.collectorTenantId,
                  entryNumber,
                  entryType: "SUBSCRIPTION_BILLING",
                  currency: intent.currency,
                  sourceType: "SUBSCRIPTION_INVOICE",
                  sourceId: invoice.id,
                  description: `SaaS subscription revenue - Invoice #${invoice.invoiceNumber} (${invoice.planCodeSnapshot})`,
                  status: "POSTED",
                })
                .returning();

              // DEBIT Payment Clearing
              await tx.insert(journalLines).values({
                journalEntryId: journal.id,
                financialAccountId: clearingAcc.id,
                tenantId: intent.collectorTenantId,
                direction: "DEBIT",
                amountMinor: intent.amountMinor,
                memo: `Provider clearing for SaaS invoice #${invoice.invoiceNumber}`,
              });

              // CREDIT SaaS Subscription Revenue
              await tx.insert(journalLines).values({
                journalEntryId: journal.id,
                financialAccountId: saasRevAcc.id,
                tenantId: intent.collectorTenantId,
                direction: "CREDIT",
                amountMinor: intent.amountMinor,
                memo: `SaaS subscription revenue from workspace ${invoice.tenantId}`,
              });

              // Audit & Outbox
              await tx.insert(auditLogs).values({
                tenantId: intent.collectorTenantId,
                action: "subscription.payment_succeeded",
                entityType: "subscription_invoice",
                entityId: invoice.id,
                metadata: {
                  invoiceId: invoice.id,
                  invoiceNumber: invoice.invoiceNumber,
                  subscriptionId: sub.id,
                  providerTransactionId: event.providerTransactionId,
                  amountMinor: intent.amountMinor.toString(),
                },
              });

              await tx.insert(outboxEvents).values({
                tenantId: invoice.tenantId,
                aggregateId: sub.id,
                eventType: fromStatus === "SUSPENDED" ? "subscription.reactivated.v1" : "subscription.activated.v1",
                payload: {
                  subscriptionId: sub.id,
                  tenantId: invoice.tenantId,
                  invoiceId: invoice.id,
                  invoiceNumber: invoice.invoiceNumber,
                  providerTransactionId: event.providerTransactionId,
                  amountMinor: intent.amountMinor.toString(),
                  currency: invoice.currency,
                },
              });
            }
          }
        }

        webhookEventRecord.markProcessed();
        await this.paymentRepository.saveWebhookEvent(webhookEventRecord, tx);

        return {
          status: "PROCESSED",
          message: "Payment successfully approved and settled",
          paymentIntentId: intent.id,
          providerEventId: event.providerEventId,
        };
      } else {
        // DECLINED / ERROR / VOIDED
        intent.markFailed(event.providerTransactionId);
        await this.paymentRepository.savePaymentIntent(intent, tx);

        // Record failed attempt
        const attempt = new PaymentAttempt({
          paymentIntentId: intent.id!,
          providerTransactionId: event.providerTransactionId,
          paymentMethodType: event.paymentMethodType,
          status: "DECLINED",
          failureCode: event.status,
          failureMessageSanitized: event.statusMessage,
          rawResponseSanitized: event.rawPayload,
          completedAt: new Date(),
        });
        await this.paymentRepository.savePaymentAttempt(attempt, tx);

        // Release inventory reservations
        const reservations = await this.paymentRepository.listReservationsByPaymentIntent(
          intent.id!,
          tx
        );

        for (const res of reservations) {
          if (res.status === "ACTIVE") {
            const [position] = await tx
              .select()
              .from(inventoryPositions)
              .where(
                and(
                  eq(inventoryPositions.productVariantId, res.productVariantId),
                  eq(inventoryPositions.locationId, res.locationId),
                  eq(inventoryPositions.ownerTenantId, res.ownerTenantId)
                )
              )
              .for("update")
              .limit(1);

            if (position) {
              await tx
                .update(inventoryPositions)
                .set({
                  reserved: Math.max(0, position.reserved - res.quantity),
                  updatedAt: new Date(),
                })
                .where(eq(inventoryPositions.id, position.id));
            }

            res.markReleased();
            await this.paymentRepository.saveReservation(res, tx);
          }
        }

        // Audit & Outbox
        await tx.insert(auditLogs).values({
          tenantId: intent.collectorTenantId,
          action: "payment.failed",
          entityType: "payment_intent",
          entityId: intent.id,
          metadata: {
            reason: event.statusMessage ?? event.status,
            providerTransactionId: event.providerTransactionId,
          },
        });

        await tx.insert(outboxEvents).values({
          tenantId: intent.collectorTenantId,
          aggregateId: intent.id!,
          eventType: "payment.failed.v1",
          payload: {
            paymentIntentId: intent.id,
            status: event.status,
            reason: event.statusMessage,
          },
        });

        webhookEventRecord.markProcessed();
        await this.paymentRepository.saveWebhookEvent(webhookEventRecord, tx);

        return {
          status: "PROCESSED",
          message: `Payment failed with status '${event.status}'`,
          paymentIntentId: intent.id,
          providerEventId: event.providerEventId,
        };
      }
    });
  }
}
