import { createHash } from "crypto";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  orders,
  orderItems,
  orderTenders,
  inventoryPositions,
  stockMovements,
  appointments,
  appointmentStatusHistory,
  auditLogs,
  outboxEvents,
  idempotencyKeys,
  OrderRow,
  OrderItemRow,
} from "@/infrastructure/database/schema";
import { IOrderRepository } from "@/modules/orders/domain/order.repository";
import { IFinanceRepository } from "@/modules/finance/domain/finance-repository.interface";
import { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository";
import { Order, OrderStatus } from "@/modules/orders/domain/order";
import { OrderTenderMethod } from "@/modules/orders/domain/order-tender";
import { InsufficientStockError } from "@/modules/inventory/domain/inventory-errors";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors/app-error";
import { JournalEntry } from "@/modules/finance/domain/journal-entry";
import { JournalLine } from "@/modules/finance/domain/journal-line";
import { Money } from "@/modules/finance/domain/money";
import { STANDARD_ACCOUNT_CODES } from "@/modules/finance/domain/financial-account";

export interface TenderDeclarationInput {
  method: OrderTenderMethod;
  amountMinor: bigint;
  amountReceivedMinor?: bigint | null;
  changeDueMinor?: bigint | null;
  reference?: string | null;
}

export interface CompleteOrderInput {
  orderId: string;
  tenders: TenderDeclarationInput[];
  actorUserId?: string | null;
  idempotencyKey?: string;
  notes?: string;
}

export class CompleteOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly inventoryRepository: IInventoryRepository,
    private readonly financeRepository: IFinanceRepository
  ) {}

  async execute(input: CompleteOrderInput): Promise<Order> {
    const normalizedPayload = {
      orderId: input.orderId,
      tenders: (input.tenders || [])
        .map((t) => ({
          method: t.method,
          amountMinor: t.amountMinor.toString(),
          amountReceivedMinor: t.amountReceivedMinor != null ? t.amountReceivedMinor.toString() : null,
          reference: t.reference || null,
        }))
        .sort((a, b) => a.method.localeCompare(b.method) || a.amountMinor.localeCompare(b.amountMinor)),
      notes: input.notes || null,
    };
    const payloadFingerprint = createHash("sha256")
      .update(JSON.stringify(normalizedPayload))
      .digest("hex")
      .slice(0, 64);

    return await db.transaction(async (tx) => {
      // 1. Lock Order row FOR UPDATE first to serialize concurrent checkouts on the same order
      const [lockedOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .for("update");

      if (!lockedOrder) {
        throw new NotFoundError("Order", input.orderId);
      }

      // 2. Check Idempotency-Key if provided
      if (input.idempotencyKey) {
        const [existingIdemp] = await tx
          .select()
          .from(idempotencyKeys)
          .where(
            and(
              eq(idempotencyKeys.tenantId, lockedOrder.contextTenantId),
              eq(idempotencyKeys.key, input.idempotencyKey),
              eq(idempotencyKeys.operation, "pos.complete_order")
            )
          )
          .limit(1)
          .for("update");

        if (existingIdemp) {
          // Reject with 409 Conflict if payload fingerprint does not match
          if (existingIdemp.requestHash !== payloadFingerprint) {
            throw new ConflictError(
              "Idempotency key was already used with a different request payload"
            );
          }
          // Replay the completed order if already COMPLETED
          if (existingIdemp.status === "COMPLETED") {
            const completed = await this.orderRepository.findById(lockedOrder.id, tx);
            if (completed) return completed;
          }
        }
      }

      // 3. Check Order current status
      if (lockedOrder.status === "COMPLETED") {
        const existingCompleted = await this.orderRepository.findById(input.orderId, tx);
        if (existingCompleted) return existingCompleted;
      }

      if (lockedOrder.status === "CANCELLED") {
        throw new ConflictError("Cannot complete a cancelled order");
      }

      // 4. Anti-double-financialization check for appointments
      if (lockedOrder.appointmentId) {
        const existingApptEntry = await this.financeRepository.findJournalEntryBySource(
          "APPOINTMENT",
          lockedOrder.appointmentId,
          "SERVICE_REVENUE",
          lockedOrder.contextTenantId,
          tx
        );
        if (existingApptEntry) {
          throw new ConflictError(
            `Appointment ${lockedOrder.appointmentId} has already been financialized directly as APPOINTMENT. Cannot re-financialize via POS Order.`
          );
        }
      }

      // 3. Fetch Order Items
      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, lockedOrder.id))
        .orderBy(orderItems.position);

      if (items.length === 0) {
        throw new ValidationError("Order contains no items to complete");
      }

      // 4. Recalculate totals server-side
      let subtotalMinor = 0n;
      let discountTotalMinor = 0n;
      let taxTotalMinor = 0n;
      let tipTotalMinor = 0n;

      for (const item of items) {
        if (item.itemType === "TIP") {
          tipTotalMinor += item.lineTotalMinor;
        } else {
          subtotalMinor += item.unitPriceMinor * BigInt(item.quantity);
          discountTotalMinor += item.discountMinor;
          taxTotalMinor += item.taxMinor;
        }
      }

      const grandTotalMinor =
        subtotalMinor - discountTotalMinor + taxTotalMinor + tipTotalMinor;

      // 5. Validate Tenders
      if (!input.tenders || input.tenders.length === 0) {
        throw new ValidationError("Payment tenders must be declared to complete order");
      }

      let totalTenderedMinor = 0n;
      for (const tender of input.tenders) {
        totalTenderedMinor += tender.amountMinor;
      }

      if (totalTenderedMinor !== grandTotalMinor) {
        throw new ValidationError(
          `Declared tender total (${totalTenderedMinor}) does not match grand total (${grandTotalMinor})`
        );
      }

      // Record tenders
      for (const tender of input.tenders) {
        let changeDueMinor = tender.changeDueMinor ?? null;
        if (tender.method === "CASH" && tender.amountReceivedMinor) {
          changeDueMinor =
            tender.amountReceivedMinor > tender.amountMinor
              ? tender.amountReceivedMinor - tender.amountMinor
              : 0n;
        }

        await tx.insert(orderTenders).values({
          orderId: lockedOrder.id,
          method: tender.method,
          amountMinor: tender.amountMinor,
          amountReceivedMinor: tender.amountReceivedMinor ?? null,
          changeDueMinor,
          currency: lockedOrder.currency || "COP",
          reference: tender.reference || null,
          declaredByUserId: input.actorUserId || null,
        });
      }

      // 6. Inventory Deduction & Atomic Concurrency Guard
      const productItems = items.filter(
        (i) => i.itemType === "PRODUCT" && i.productVariantId
      );

      for (const item of productItems) {
        const variantId = item.productVariantId!;
        const sellerTenantId = item.sellerTenantId;
        const locationId = lockedOrder.locationId;

        if (!locationId) {
          throw new ValidationError(
            "Order location is required for inventory-tracked products"
          );
        }

        // Lock inventory position FOR UPDATE
        const [position] = await tx
          .select()
          .from(inventoryPositions)
          .where(
            and(
              eq(inventoryPositions.ownerTenantId, sellerTenantId),
              eq(inventoryPositions.locationId, locationId),
              eq(inventoryPositions.productVariantId, variantId)
            )
          )
          .for("update");

        if (!position || position.onHand < item.quantity) {
          const available = position ? position.onHand : 0;
          throw new InsufficientStockError(
            `Insufficient stock for '${item.descriptionSnapshot}'. Available: ${available}, requested: ${item.quantity}`
          );
        }

        // Decrement on_hand atomically
        await tx
          .update(inventoryPositions)
          .set({
            onHand: position.onHand - item.quantity,
            version: position.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(inventoryPositions.id, position.id));

        // Insert immutable stock movement
        await tx.insert(stockMovements).values({
          ownerTenantId: sellerTenantId,
          locationId,
          productVariantId: variantId,
          movementType: "SALE",
          quantity: item.quantity,
          unitCostMinor: item.unitCostMinor ?? null,
          currency: lockedOrder.currency,
          sourceType: "ORDER",
          sourceId: lockedOrder.id,
          correlationId: `order_${lockedOrder.id}`,
          reason: `Sale via order ${lockedOrder.orderNumber}`,
          createdByUserId: input.actorUserId || null,
          occurredAt: new Date(),
        });
      }

      // 7. Double-Entry Financial Integration into Certified Financial Core
      await this.postOrderFinancials({
        order: lockedOrder,
        items,
        grandTotalMinor,
        tx,
        actorUserId: input.actorUserId,
      });

      // 8. Appointment Synchronization (Anti-Double-Financialization)
      if (lockedOrder.appointmentId) {
        const [appt] = await tx
          .select()
          .from(appointments)
          .where(eq(appointments.id, lockedOrder.appointmentId))
          .for("update");

        if (appt && appt.status !== "COMPLETED") {
          await tx
            .update(appointments)
            .set({
              status: "COMPLETED",
              completedAt: new Date(),
              version: appt.version + 1,
              updatedAt: new Date(),
            })
            .where(eq(appointments.id, appt.id));

          await tx.insert(appointmentStatusHistory).values({
            appointmentId: appt.id,
            fromStatus: appt.status,
            toStatus: "COMPLETED",
            reason: `Completed via POS Order ${lockedOrder.orderNumber}`,
          });
        }
      }

      // 9. Mark Order as COMPLETED
      const now = new Date();
      const [completedOrderRow] = await tx
        .update(orders)
        .set({
          status: "COMPLETED",
          subtotalMinor,
          discountTotalMinor,
          taxTotalMinor,
          tipTotalMinor,
          grandTotalMinor,
          completedAt: now,
          version: lockedOrder.version + 1,
          updatedAt: now,
        })
        .where(eq(orders.id, lockedOrder.id))
        .returning();

      // 10. Audit Log & Outbox Event
      await tx.insert(auditLogs).values({
        tenantId: lockedOrder.contextTenantId,
        actorUserId: input.actorUserId || null,
        action: "ORDER_COMPLETED",
        entityType: "ORDER",
        entityId: lockedOrder.id,
        metadata: {
          orderNumber: lockedOrder.orderNumber,
          grandTotalMinor: grandTotalMinor.toString(),
          itemCount: items.length,
        },
      });

      await tx.insert(outboxEvents).values({
        tenantId: lockedOrder.contextTenantId,
        locationId: lockedOrder.locationId || null,
        aggregateId: lockedOrder.id,
        eventType: "order.completed",
        payload: {
          orderId: lockedOrder.id,
          orderNumber: lockedOrder.orderNumber,
          grandTotalMinor: grandTotalMinor.toString(),
          appointmentId: lockedOrder.appointmentId,
        },
      });

      // 11. Save Idempotency if provided
      if (input.idempotencyKey) {
        const actingUserId =
          input.actorUserId ||
          lockedOrder.createdByUserId ||
          lockedOrder.customerUserId;
        if (actingUserId) {
          await tx
            .insert(idempotencyKeys)
            .values({
              tenantId: lockedOrder.contextTenantId,
              userId: actingUserId,
              key: input.idempotencyKey,
              operation: "pos.complete_order",
              requestHash: payloadFingerprint,
              status: "COMPLETED",
              responseCode: 200,
              responseBody: { orderId: lockedOrder.id, status: "COMPLETED" },
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            })
            .onConflictDoUpdate({
              target: [
                idempotencyKeys.tenantId,
                idempotencyKeys.userId,
                idempotencyKeys.operation,
                idempotencyKeys.key,
              ],
              set: {
                status: "COMPLETED",
                requestHash: payloadFingerprint,
                responseCode: 200,
                responseBody: { orderId: lockedOrder.id, status: "COMPLETED" },
              },
            });
        }
      }

      // 12. Return full domain Order
      return (await this.orderRepository.findById(lockedOrder.id, tx))!;
    });
  }

  private async postOrderFinancials({
    order,
    items,
    grandTotalMinor,
    tx,
    actorUserId,
  }: {
    order: OrderRow;
    items: OrderItemRow[];
    grandTotalMinor: bigint;
    tx: any;
    actorUserId?: string | null;
  }): Promise<void> {
    const currency = (order.currency || "COP").toUpperCase();
    const hostTenantId = order.contextTenantId;

    // Load or create default accounts for host workspace
    const hostAccounts = await this.financeRepository.getOrCreateDefaultAccounts(
      hostTenantId,
      currency,
      tx
    );

    const hostCashAccount =
      hostAccounts.get(STANDARD_ACCOUNT_CODES.CASH) ||
      hostAccounts.get(STANDARD_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE);
    if (!hostCashAccount) {
      throw new Error(`Host cash account not found for currency ${currency}`);
    }

    // Group items by sellerTenantId
    const itemsBySeller = new Map<string, OrderItemRow[]>();
    for (const item of items) {
      const sellerId = item.sellerTenantId || hostTenantId;
      const list = itemsBySeller.get(sellerId) || [];
      list.push(item);
      itemsBySeller.set(sellerId, list);
    }

    const entryNumberSuffix = `${Date.now().toString(36).toUpperCase()}-${Math.floor(
      Math.random() * 900 + 100
    )}`;

    // Process Host-owned items & host revenue/cost
    const hostItems = itemsBySeller.get(hostTenantId) || [];
    let hostProductRevenue = 0n;
    let hostProductCost = 0n;
    let hostServiceRevenue = 0n;
    let hostTips = 0n;

    for (const item of hostItems) {
      if (item.itemType === "PRODUCT") {
        hostProductRevenue += item.lineTotalMinor;
        if (item.unitCostMinor) {
          hostProductCost += item.unitCostMinor * BigInt(item.quantity);
        }
      } else if (item.itemType === "SERVICE") {
        hostServiceRevenue += item.lineTotalMinor;
      } else if (item.itemType === "TIP") {
        hostTips += item.lineTotalMinor;
      }
    }

    // Foreign sellers (affiliated professionals) items collected by host
    let payableToForeignSellers = 0n;
    for (const [sellerId, sellerItems] of itemsBySeller.entries()) {
      if (sellerId !== hostTenantId) {
        for (const item of sellerItems) {
          payableToForeignSellers += item.lineTotalMinor;
        }
      }
    }

    // Build Host Journal Entry Lines
    const hostLines: JournalLine[] = [];

    // Debit Cash for total collected by host
    if (grandTotalMinor > 0n) {
      hostLines.push(
        new JournalLine({
          financialAccountId: hostCashAccount.id,
          tenantId: hostTenantId,
          direction: "DEBIT",
          amount: Money.fromMinor(grandTotalMinor, currency),
          memo: `POS Order ${order.orderNumber} Total Collection`,
        })
      );
    }

    // Credit Host Product Sales Revenue
    if (hostProductRevenue > 0n) {
      const prodRevAccount = hostAccounts.get(
        STANDARD_ACCOUNT_CODES.PRODUCT_SALES_REVENUE
      );
      if (!prodRevAccount) {
        throw new Error("Product sales revenue account not found");
      }
      hostLines.push(
        new JournalLine({
          financialAccountId: prodRevAccount.id,
          tenantId: hostTenantId,
          direction: "CREDIT",
          amount: Money.fromMinor(hostProductRevenue, currency),
          memo: `Product Sales Revenue - Order ${order.orderNumber}`,
        })
      );
    }

    // Host COGS dual-effect: DEBIT COGS, CREDIT INVENTORY_ASSET
    if (hostProductCost > 0n) {
      const cogsAccount = hostAccounts.get(STANDARD_ACCOUNT_CODES.COST_OF_GOODS_SOLD);
      const inventoryAssetAccount = hostAccounts.get(
        STANDARD_ACCOUNT_CODES.INVENTORY_ASSET
      );
      if (cogsAccount && inventoryAssetAccount) {
        hostLines.push(
          new JournalLine({
            financialAccountId: cogsAccount.id,
            tenantId: hostTenantId,
            direction: "DEBIT",
            amount: Money.fromMinor(hostProductCost, currency),
            memo: `COGS recognition - Order ${order.orderNumber}`,
          })
        );
        hostLines.push(
          new JournalLine({
            financialAccountId: inventoryAssetAccount.id,
            tenantId: hostTenantId,
            direction: "CREDIT",
            amount: Money.fromMinor(hostProductCost, currency),
            memo: `Inventory reduction - Order ${order.orderNumber}`,
          })
        );
      }
    }

    // Credit Host Service Revenue
    if (hostServiceRevenue > 0n) {
      const srvRevAccount = hostAccounts.get(
        STANDARD_ACCOUNT_CODES.SERVICE_REVENUE
      );
      if (!srvRevAccount) {
        throw new Error("Service revenue account not found");
      }
      hostLines.push(
        new JournalLine({
          financialAccountId: srvRevAccount.id,
          tenantId: hostTenantId,
          direction: "CREDIT",
          amount: Money.fromMinor(hostServiceRevenue, currency),
          memo: `Service Revenue - Order ${order.orderNumber}`,
        })
      );
    }

    // Credit Tips Payable
    if (hostTips > 0n) {
      const tipsAccount =
        hostAccounts.get(STANDARD_ACCOUNT_CODES.TIPS_PAYABLE) ||
        hostAccounts.get(STANDARD_ACCOUNT_CODES.ACCOUNTS_PAYABLE);
      if (tipsAccount) {
        hostLines.push(
          new JournalLine({
            financialAccountId: tipsAccount.id,
            tenantId: hostTenantId,
            direction: "CREDIT",
            amount: Money.fromMinor(hostTips, currency),
            memo: `Tips liability - Order ${order.orderNumber}`,
          })
        );
      }
    }

    // Credit Accounts Payable for foreign seller amounts
    if (payableToForeignSellers > 0n) {
      const apAccount = hostAccounts.get(
        STANDARD_ACCOUNT_CODES.ACCOUNTS_PAYABLE
      );
      if (!apAccount) {
        throw new Error("Accounts payable account not found");
      }
      hostLines.push(
        new JournalLine({
          financialAccountId: apAccount.id,
          tenantId: hostTenantId,
          direction: "CREDIT",
          amount: Money.fromMinor(payableToForeignSellers, currency),
          memo: `Obligation to independent sellers - Order ${order.orderNumber}`,
        })
      );
    }

    if (hostLines.length >= 2) {
      const hostEntry = new JournalEntry({
        tenantId: hostTenantId,
        entryNumber: `JE-HOST-POS-${entryNumberSuffix}`,
        entryType: "PRODUCT_SALE",
        currency,
        sourceType: "ORDER",
        sourceId: order.id,
        description: `POS Checkout Order ${order.orderNumber}`,
        status: "POSTED",
        occurredAt: new Date(),
        postedAt: new Date(),
        createdByUserId: actorUserId || null,
        lines: hostLines,
      });

      await this.financeRepository.postJournalEntry(hostEntry, tx);
    }

    // Process each foreign seller tenant's financial effects
    for (const [sellerId, sellerItems] of itemsBySeller.entries()) {
      if (sellerId === hostTenantId) continue;

      const sellerAccounts = await this.financeRepository.getOrCreateDefaultAccounts(
        sellerId,
        currency,
        tx
      );

      const sellerReceivable = sellerAccounts.get(
        STANDARD_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE
      );
      if (!sellerReceivable) {
        throw new Error(`Seller receivable account not found for seller ${sellerId}`);
      }

      let sellerProductRev = 0n;
      let sellerProductCost = 0n;
      let sellerServiceRev = 0n;

      for (const item of sellerItems) {
        if (item.itemType === "PRODUCT") {
          sellerProductRev += item.lineTotalMinor;
          if (item.unitCostMinor) {
            sellerProductCost += item.unitCostMinor * BigInt(item.quantity);
          }
        } else if (item.itemType === "SERVICE") {
          sellerServiceRev += item.lineTotalMinor;
        }
      }

      const totalSellerRev = sellerProductRev + sellerServiceRev;
      const sellerLines: JournalLine[] = [];

      // Debit Receivable from Host
      if (totalSellerRev > 0n) {
        sellerLines.push(
          new JournalLine({
            financialAccountId: sellerReceivable.id,
            tenantId: sellerId,
            direction: "DEBIT",
            amount: Money.fromMinor(totalSellerRev, currency),
            memo: `Receivable from Host for Order ${order.orderNumber}`,
          })
        );
      }

      // Credit Product Sales Revenue
      if (sellerProductRev > 0n) {
        const prodRev = sellerAccounts.get(
          STANDARD_ACCOUNT_CODES.PRODUCT_SALES_REVENUE
        );
        if (prodRev) {
          sellerLines.push(
            new JournalLine({
              financialAccountId: prodRev.id,
              tenantId: sellerId,
              direction: "CREDIT",
              amount: Money.fromMinor(sellerProductRev, currency),
              memo: `Product Sales Revenue - Order ${order.orderNumber}`,
            })
          );
        }
      }

      // Credit Service Revenue
      if (sellerServiceRev > 0n) {
        const srvRev = sellerAccounts.get(
          STANDARD_ACCOUNT_CODES.SERVICE_REVENUE
        );
        if (srvRev) {
          sellerLines.push(
            new JournalLine({
              financialAccountId: srvRev.id,
              tenantId: sellerId,
              direction: "CREDIT",
              amount: Money.fromMinor(sellerServiceRev, currency),
              memo: `Service Revenue - Order ${order.orderNumber}`,
            })
          );
        }
      }

      // Seller COGS dual-effect
      if (sellerProductCost > 0n) {
        const cogsAccount = sellerAccounts.get(
          STANDARD_ACCOUNT_CODES.COST_OF_GOODS_SOLD
        );
        const invAssetAccount = sellerAccounts.get(
          STANDARD_ACCOUNT_CODES.INVENTORY_ASSET
        );
        if (cogsAccount && invAssetAccount) {
          sellerLines.push(
            new JournalLine({
              financialAccountId: cogsAccount.id,
              tenantId: sellerId,
              direction: "DEBIT",
              amount: Money.fromMinor(sellerProductCost, currency),
              memo: `COGS recognition - Order ${order.orderNumber}`,
            })
          );
          sellerLines.push(
            new JournalLine({
              financialAccountId: invAssetAccount.id,
              tenantId: sellerId,
              direction: "CREDIT",
              amount: Money.fromMinor(sellerProductCost, currency),
              memo: `Inventory reduction - Order ${order.orderNumber}`,
            })
          );
        }
      }

      if (sellerLines.length >= 2) {
        const sellerEntry = new JournalEntry({
          tenantId: sellerId,
          entryNumber: `JE-SELLER-POS-${entryNumberSuffix}-${sellerId.slice(0, 4)}`,
          entryType: "PRODUCT_SALE",
          currency,
          sourceType: "ORDER",
          sourceId: order.id,
          description: `POS Checkout Order ${order.orderNumber} (Solo Seller)`,
          status: "POSTED",
          occurredAt: new Date(),
          postedAt: new Date(),
          createdByUserId: actorUserId || null,
          lines: sellerLines,
        });

        await this.financeRepository.postJournalEntry(sellerEntry, tx);
      }
    }
  }
}
