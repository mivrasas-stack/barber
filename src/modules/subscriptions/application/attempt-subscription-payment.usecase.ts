import crypto from "crypto";
import { db } from "@/infrastructure/database/client";
import {
  paymentIntents,
  paymentAttempts,
  subscriptionInvoices,
  tenantSubscriptions,
  subscriptionStatusHistory,
  journalEntries,
  journalLines,
  auditLogs,
  outboxEvents,
} from "@/infrastructure/database/schema";
import { eq } from "drizzle-orm";
import { SubscriptionRepository } from "../domain/subscription-repository.interface";
import { IPaymentRepository } from "@/modules/payments/domain/payment.repository.interface";
import { PaymentProviderFactory } from "@/modules/payments/infrastructure/providers/provider-factory";
import { PaymentProviderType } from "@/modules/payments/domain/payment-provider.interface";
import {
  InvoiceNotFoundError,
  InvoiceAlreadyPaidError,
  InvoiceNotPayableError,
  SubscriptionNotFoundError,
} from "../domain/subscription-errors";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { STANDARD_ACCOUNT_CODES } from "@/modules/finance/domain/financial-account";

export interface AttemptSubscriptionPaymentInput {
  invoiceId: string;
  collectorTenantId?: string;
  providerType: PaymentProviderType;
  idempotencyKey?: string;
  actorUserId?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethodToken?: string;
  redirectUrl?: string;
}

export interface AttemptSubscriptionPaymentOutput {
  intentId: string;
  invoiceId: string;
  invoiceNumber: string;
  amountMinor: string;
  currency: string;
  status: string;
  checkoutUrl?: string;
  publicKey?: string;
  integritySignature?: string;
}

export class AttemptSubscriptionPaymentUseCase {
  private readonly financeRepository = new DrizzleFinanceRepository();

  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly paymentRepo: IPaymentRepository
  ) {}

  async execute(input: AttemptSubscriptionPaymentInput): Promise<AttemptSubscriptionPaymentOutput> {
    const invoice = await this.subscriptionRepo.findInvoiceById(input.invoiceId);
    if (!invoice) {
      throw new InvoiceNotFoundError(`Invoice ${input.invoiceId} not found`);
    }

    if (invoice.status === "PAID") {
      throw new InvoiceAlreadyPaidError(`Invoice ${invoice.invoiceNumber} is already paid`);
    }

    if (invoice.status === "VOID") {
      throw new InvoiceNotPayableError(`Invoice ${invoice.invoiceNumber} is voided and cannot be paid`);
    }

    const sub = await this.subscriptionRepo.findSubscriptionById(invoice.subscriptionId);
    if (!sub) {
      throw new SubscriptionNotFoundError(`Subscription ${invoice.subscriptionId} not found`);
    }

    // Platform tenant acts as collector for SaaS revenue
    const collectorTenantId = input.collectorTenantId ?? invoice.tenantId;

    // 1. Idempotency Check
    let keyHash: string | undefined;
    if (input.idempotencyKey) {
      keyHash = crypto
        .createHash("sha256")
        .update(
          `${input.idempotencyKey}:${invoice.id}:${collectorTenantId}:${input.providerType}:${invoice.totalMinor.toString()}`
        )
        .digest("hex");

      const existingIntent = await this.paymentRepo.findIntentByIdempotencyKeyHash(keyHash);
      if (existingIntent) {
        return {
          intentId: existingIntent.id!,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amountMinor: existingIntent.amountMinor.toString(),
          currency: existingIntent.currency,
          status: existingIntent.status,
          checkoutUrl: existingIntent.metadata?.checkoutUrl as string | undefined,
        };
      }
    }

    // 2. Call Provider for Checkout URL / Credentials
    const intentId = crypto.randomUUID();
    const provider = PaymentProviderFactory.getProvider(input.providerType);
    const providerResult = await provider.createPaymentIntent({
      intentId,
      orderNumber: invoice.invoiceNumber,
      collectorTenantId,
      amountMinor: invoice.totalMinor,
      currency: invoice.currency,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      redirectUrl: input.redirectUrl,
    });

    const isImmediateSuccess = input.providerType === "TEST";

    return await db.transaction(async (tx) => {
      // 3. Create PaymentIntent record in database
      const [intentRecord] = await tx
        .insert(paymentIntents)
        .values({
          id: intentId,
          orderId: null,
          subscriptionInvoiceId: invoice.id,
          paymentPurpose: "SUBSCRIPTION_INVOICE",
          collectorTenantId,
          provider: input.providerType,
          amountMinor: invoice.totalMinor,
          currency: invoice.currency,
          status: isImmediateSuccess ? "SUCCEEDED" : "PENDING",
          providerReference: providerResult.providerReference,
          providerTransactionId: providerResult.providerTransactionId,
          idempotencyKeyHash: keyHash,
          createdByUserId: input.actorUserId,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            planCodeSnapshot: invoice.planCodeSnapshot,
            checkoutUrl: providerResult.checkoutUrl,
          },
        })
        .returning();

      // 4. Create PaymentAttempt record
      await tx.insert(paymentAttempts).values({
        paymentIntentId: intentRecord.id,
        attemptNumber: 1,
        providerTransactionId: providerResult.providerTransactionId,
        paymentMethodType: "CARD",
        status: isImmediateSuccess ? "APPROVED" : "INITIATED",
        completedAt: isImmediateSuccess ? new Date() : null,
        rawResponseSanitized: {
          reference: providerResult.providerReference,
          transactionId: providerResult.providerTransactionId,
          invoiceNumber: invoice.invoiceNumber,
        },
      });

      // 5. If immediate success (e.g. TEST), settle invoice and post ledger entry immediately
      if (isImmediateSuccess) {
        const now = new Date();
        await tx
          .update(subscriptionInvoices)
          .set({
            status: "PAID",
            paidAt: now,
            updatedAt: now,
          })
          .where(eq(subscriptionInvoices.id, invoice.id));

        const fromStatus = sub.status;
        const subUpdates: any = {
          status: "ACTIVE",
          currentPeriodStart: invoice.periodStart,
          currentPeriodEnd: invoice.periodEnd,
          pastDueAt: null,
          graceEndsAt: null,
          suspendedAt: null,
          updatedAt: now,
        };

        if (sub.pendingPlanId) {
          subUpdates.planId = sub.pendingPlanId;
          subUpdates.pendingPlanId = null;
          subUpdates.pendingPlanEffectiveAt = null;
        }

        await tx
          .update(tenantSubscriptions)
          .set(subUpdates)
          .where(eq(tenantSubscriptions.id, sub.id));

        if (fromStatus !== "ACTIVE") {
          await tx.insert(subscriptionStatusHistory).values({
            subscriptionId: sub.id,
            tenantId: sub.tenantId,
            fromStatus,
            toStatus: "ACTIVE",
            reason: `Subscription invoice ${invoice.invoiceNumber} paid via ${input.providerType}`,
            source: "PAYMENT",
            actorUserId: input.actorUserId,
            metadata: {
              paymentIntentId: intentRecord.id,
              invoiceNumber: invoice.invoiceNumber,
            },
          });
        }

        // Post Double-Entry Journal Entry in Platform Ledger
        const accounts = await this.financeRepository.getOrCreateDefaultAccounts(
          collectorTenantId,
          invoice.currency,
          tx
        );

        const clearingAcc = accounts.get(STANDARD_ACCOUNT_CODES.PAYMENT_PROVIDER_CLEARING)!;
        const saasRevenueAcc = accounts.get(STANDARD_ACCOUNT_CODES.SAAS_SUBSCRIPTION_REVENUE)!;

        const entryNumber = `JE-SUB-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
        const [journal] = await tx
          .insert(journalEntries)
          .values({
            tenantId: collectorTenantId,
            entryNumber,
            entryType: "SUBSCRIPTION_BILLING",
            currency: invoice.currency,
            sourceType: "SUBSCRIPTION_INVOICE",
            sourceId: invoice.id,
            description: `SaaS subscription revenue recognized for Invoice #${invoice.invoiceNumber}`,
            status: "POSTED",
          })
          .returning();

        // DEBIT Clearing Account
        await tx.insert(journalLines).values({
          journalEntryId: journal.id,
          financialAccountId: clearingAcc.id,
          tenantId: collectorTenantId,
          direction: "DEBIT",
          amountMinor: invoice.totalMinor,
          memo: `SaaS Payment Clearing - Invoice #${invoice.invoiceNumber}`,
        });

        // CREDIT SaaS Revenue Account
        await tx.insert(journalLines).values({
          journalEntryId: journal.id,
          financialAccountId: saasRevenueAcc.id,
          tenantId: collectorTenantId,
          direction: "CREDIT",
          amountMinor: invoice.totalMinor,
          memo: `SaaS Subscription Revenue - Invoice #${invoice.invoiceNumber}`,
        });

        // Emit outbox events
        await tx.insert(outboxEvents).values({
          tenantId: sub.tenantId,
          aggregateId: invoice.id,
          eventType: "subscription.invoice.paid.v1",
          payload: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            subscriptionId: sub.id,
            tenantId: sub.tenantId,
            amountMinor: invoice.totalMinor.toString(),
            currency: invoice.currency,
          },
        });

        await tx.insert(outboxEvents).values({
          tenantId: sub.tenantId,
          aggregateId: sub.id,
          eventType: fromStatus === "SUSPENDED" ? "subscription.reactivated.v1" : "subscription.activated.v1",
          payload: {
            subscriptionId: sub.id,
            tenantId: sub.tenantId,
            planId: sub.planId,
            status: "ACTIVE",
          },
        });

        await tx.insert(auditLogs).values({
          tenantId: collectorTenantId,
          actorUserId: input.actorUserId,
          action: "subscription.invoice.paid",
          entityType: "subscription_invoice",
          entityId: invoice.id,
          metadata: {
            paymentIntentId: intentRecord.id,
            provider: input.providerType,
            amountMinor: invoice.totalMinor.toString(),
          },
        });
      }

      return {
        intentId: intentRecord.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amountMinor: invoice.totalMinor.toString(),
        currency: invoice.currency,
        status: isImmediateSuccess ? "SUCCEEDED" : "PENDING",
        checkoutUrl: providerResult.checkoutUrl,
        publicKey: providerResult.publicKey,
        integritySignature: providerResult.integritySignature,
      };
    });
  }
}
