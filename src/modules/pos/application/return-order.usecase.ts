import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  orders,
  orderItems,
  inventoryPositions,
  auditLogs,
  outboxEvents,
  OrderItemRow,
  OrderRow,
} from "@/infrastructure/database/schema";
import { IOrderRepository } from "@/modules/orders/domain/order.repository";
import { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository";
import { IFinanceRepository } from "@/modules/finance/domain/finance-repository.interface";
import { Order } from "@/modules/orders/domain/order";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { JournalEntry } from "@/modules/finance/domain/journal-entry";
import { JournalLine } from "@/modules/finance/domain/journal-line";
import { Money } from "@/modules/finance/domain/money";
import { STANDARD_ACCOUNT_CODES } from "@/modules/finance/domain/financial-account";

export interface ReturnOrderInput {
  orderId: string;
  reason: string;
  actorUserId?: string | null;
}

export class ReturnOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly inventoryRepository: IInventoryRepository,
    private readonly financeRepository: IFinanceRepository
  ) {}

  async execute(input: ReturnOrderInput): Promise<Order> {
    return await db.transaction(async (tx) => {
      // 1. Lock Order row FOR UPDATE
      const [lockedOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .for("update");

      if (!lockedOrder) {
        throw new NotFoundError("Order", input.orderId);
      }

      if (lockedOrder.status !== "COMPLETED") {
        throw new ConflictError(
          `Cannot process a return for an order with status ${lockedOrder.status}. Only COMPLETED orders can be returned.`
        );
      }

      // 2. Fetch Order Items
      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, lockedOrder.id))
        .orderBy(orderItems.position);

      // 3. Reverse Inventory Movements for Product Items (Restoration with SALE_RETURN)
      if (lockedOrder.locationId) {
        for (const item of items) {
          if (item.itemType === "PRODUCT" && item.productVariantId) {
            const sellerTenantId = item.sellerTenantId || lockedOrder.contextTenantId;
            await this.inventoryRepository.applyStockChange(
              {
                ownerTenantId: sellerTenantId,
                locationId: lockedOrder.locationId,
                productVariantId: item.productVariantId,
                quantityDelta: item.quantity, // Positive delta restores stock to inventory
                movementType: "SALE_RETURN",
                sourceType: "RETURN",
                sourceId: lockedOrder.id,
                unitCostMinor: item.unitCostMinor,
                currency: item.currency,
                reason: `Return/Refund: ${input.reason}`,
                createdByUserId: input.actorUserId || null,
              },
              tx
            );
          }
        }
      }

      // 4. Reverse Financial Entries (Full Symmetrical Reversal of POS Checkout)
      await this.postReturnFinancials({
        order: lockedOrder,
        items,
        tx,
        reason: input.reason,
        actorUserId: input.actorUserId,
      });

      // 5. Update Order Status to REFUNDED
      const now = new Date();
      await tx
        .update(orders)
        .set({
          status: "REFUNDED",
          version: lockedOrder.version + 1,
          updatedAt: now,
        })
        .where(eq(orders.id, lockedOrder.id));

      // 6. Audit Log & Outbox Event
      await tx.insert(auditLogs).values({
        tenantId: lockedOrder.contextTenantId,
        actorUserId: input.actorUserId || null,
        action: "ORDER_RETURNED",
        entityType: "ORDER",
        entityId: lockedOrder.id,
        metadata: {
          orderNumber: lockedOrder.orderNumber,
          grandTotalMinor: lockedOrder.grandTotalMinor.toString(),
          reason: input.reason,
        },
      });

      await tx.insert(outboxEvents).values({
        tenantId: lockedOrder.contextTenantId,
        locationId: lockedOrder.locationId || null,
        aggregateId: lockedOrder.id,
        eventType: "order.returned",
        payload: {
          orderId: lockedOrder.id,
          orderNumber: lockedOrder.orderNumber,
          grandTotalMinor: lockedOrder.grandTotalMinor.toString(),
          reason: input.reason,
        },
      });

      return (await this.orderRepository.findById(lockedOrder.id, tx))!;
    });
  }

  private async postReturnFinancials({
    order,
    items,
    tx,
    reason,
    actorUserId,
  }: {
    order: OrderRow;
    items: OrderItemRow[];
    tx: any;
    reason: string;
    actorUserId?: string | null;
  }): Promise<void> {
    const currency = (order.currency || "COP").toUpperCase();
    const hostTenantId = order.contextTenantId;

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

    const itemsBySeller = new Map<string, OrderItemRow[]>();
    for (const item of items) {
      const sellerId = item.sellerTenantId || hostTenantId;
      const list = itemsBySeller.get(sellerId) || [];
      list.push(item);
      itemsBySeller.set(sellerId, list);
    }

    const entryNumberSuffix = `${Date.now().toString(36).toUpperCase()}-RET-${Math.floor(
      Math.random() * 900 + 100
    )}`;

    // Host Items Breakdown
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

    let payableToForeignSellers = 0n;
    for (const [sellerId, sellerItems] of itemsBySeller.entries()) {
      if (sellerId !== hostTenantId) {
        for (const item of sellerItems) {
          payableToForeignSellers += item.lineTotalMinor;
        }
      }
    }

    // Build Host Reversal Lines
    const hostLines: JournalLine[] = [];

    // Credit Cash (Money leaving host cash to refund customer)
    if (order.grandTotalMinor > 0n) {
      hostLines.push(
        new JournalLine({
          financialAccountId: hostCashAccount.id,
          tenantId: hostTenantId,
          direction: "CREDIT",
          amount: Money.fromMinor(order.grandTotalMinor, currency),
          memo: `POS Order ${order.orderNumber} Refund Payout: ${reason}`,
        })
      );
    }

    // Debit Host Product Sales Revenue (Reversal of revenue)
    if (hostProductRevenue > 0n) {
      const prodRevAccount = hostAccounts.get(
        STANDARD_ACCOUNT_CODES.PRODUCT_SALES_REVENUE
      );
      if (prodRevAccount) {
        hostLines.push(
          new JournalLine({
            financialAccountId: prodRevAccount.id,
            tenantId: hostTenantId,
            direction: "DEBIT",
            amount: Money.fromMinor(hostProductRevenue, currency),
            memo: `Product Sales Revenue Reversal - Order ${order.orderNumber}`,
          })
        );
      }
    }

    // Host COGS dual-effect reversal: DEBIT INVENTORY_ASSET, CREDIT COGS
    if (hostProductCost > 0n) {
      const cogsAccount = hostAccounts.get(STANDARD_ACCOUNT_CODES.COST_OF_GOODS_SOLD);
      const inventoryAssetAccount = hostAccounts.get(
        STANDARD_ACCOUNT_CODES.INVENTORY_ASSET
      );
      if (cogsAccount && inventoryAssetAccount) {
        hostLines.push(
          new JournalLine({
            financialAccountId: inventoryAssetAccount.id,
            tenantId: hostTenantId,
            direction: "DEBIT",
            amount: Money.fromMinor(hostProductCost, currency),
            memo: `Inventory Asset Restoration - Return Order ${order.orderNumber}`,
          })
        );
        hostLines.push(
          new JournalLine({
            financialAccountId: cogsAccount.id,
            tenantId: hostTenantId,
            direction: "CREDIT",
            amount: Money.fromMinor(hostProductCost, currency),
            memo: `COGS Reversal - Return Order ${order.orderNumber}`,
          })
        );
      }
    }

    // Debit Service Revenue Reversal
    if (hostServiceRevenue > 0n) {
      const srvAccount = hostAccounts.get(STANDARD_ACCOUNT_CODES.SERVICE_REVENUE);
      if (srvAccount) {
        hostLines.push(
          new JournalLine({
            financialAccountId: srvAccount.id,
            tenantId: hostTenantId,
            direction: "DEBIT",
            amount: Money.fromMinor(hostServiceRevenue, currency),
            memo: `Service Revenue Reversal - Order ${order.orderNumber}`,
          })
        );
      }
    }

    // Debit Tips Payable Reversal
    if (hostTips > 0n) {
      const tipsAccount = hostAccounts.get(STANDARD_ACCOUNT_CODES.TIPS_PAYABLE);
      if (tipsAccount) {
        hostLines.push(
          new JournalLine({
            financialAccountId: tipsAccount.id,
            tenantId: hostTenantId,
            direction: "DEBIT",
            amount: Money.fromMinor(hostTips, currency),
            memo: `Tips Payable Reversal - Order ${order.orderNumber}`,
          })
        );
      }
    }

    // Debit Inter-Tenant Payable Reversal (Cancels obligation to foreign seller)
    if (payableToForeignSellers > 0n) {
      const interTenantPayableAccount = hostAccounts.get(
        STANDARD_ACCOUNT_CODES.ACCOUNTS_PAYABLE
      );
      if (interTenantPayableAccount) {
        hostLines.push(
          new JournalLine({
            financialAccountId: interTenantPayableAccount.id,
            tenantId: hostTenantId,
            direction: "DEBIT",
            amount: Money.fromMinor(payableToForeignSellers, currency),
            memo: `Inter-Tenant Obligation Reversal - Order ${order.orderNumber}`,
          })
        );
      }
    }

    if (hostLines.length >= 2) {
      const hostEntry = new JournalEntry({
        tenantId: hostTenantId,
        entryNumber: `JE-RET-HOST-${entryNumberSuffix}`,
        entryType: "REVERSAL",
        currency,
        sourceType: "ORDER",
        sourceId: order.id,
        description: `POS Order ${order.orderNumber} Return/Refund - ${reason}`,
        status: "POSTED",
        lines: hostLines,
        createdByUserId: actorUserId || null,
      });
      await this.financeRepository.postJournalEntry(hostEntry, tx);
    }

    // Foreign Sellers Reversal Entries
    for (const [sellerTenantId, sellerItems] of itemsBySeller.entries()) {
      if (sellerTenantId === hostTenantId) continue;

      const sellerAccounts =
        await this.financeRepository.getOrCreateDefaultAccounts(
          sellerTenantId,
          currency,
          tx
        );

      let sellerProductRev = 0n;
      let sellerProductCost = 0n;
      let sellerServiceRev = 0n;
      let sellerTips = 0n;

      for (const item of sellerItems) {
        if (item.itemType === "PRODUCT") {
          sellerProductRev += item.lineTotalMinor;
          if (item.unitCostMinor) {
            sellerProductCost += item.unitCostMinor * BigInt(item.quantity);
          }
        } else if (item.itemType === "SERVICE") {
          sellerServiceRev += item.lineTotalMinor;
        } else if (item.itemType === "TIP") {
          sellerTips += item.lineTotalMinor;
        }
      }

      const totalSellerClaim = sellerProductRev + sellerServiceRev + sellerTips;
      const sellerLines: JournalLine[] = [];

      // Credit Inter-Tenant Receivable (Reverses claim against host)
      if (totalSellerClaim > 0n) {
        const interTenantRecAccount = sellerAccounts.get(
          STANDARD_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE
        );
        if (interTenantRecAccount) {
          sellerLines.push(
            new JournalLine({
              financialAccountId: interTenantRecAccount.id,
              tenantId: sellerTenantId,
              direction: "CREDIT",
              amount: Money.fromMinor(totalSellerClaim, currency),
              memo: `Reversal of Claim against Host - Order ${order.orderNumber}`,
            })
          );
        }
      }

      // Debit Product Revenue Reversal
      if (sellerProductRev > 0n) {
        const prodRev = sellerAccounts.get(
          STANDARD_ACCOUNT_CODES.PRODUCT_SALES_REVENUE
        );
        if (prodRev) {
          sellerLines.push(
            new JournalLine({
              financialAccountId: prodRev.id,
              tenantId: sellerTenantId,
              direction: "DEBIT",
              amount: Money.fromMinor(sellerProductRev, currency),
              memo: `Solo Product Revenue Reversal - Order ${order.orderNumber}`,
            })
          );
        }
      }

      // Reversal of Solo COGS: DEBIT INVENTORY_ASSET, CREDIT COGS
      if (sellerProductCost > 0n) {
        const cogsAcc = sellerAccounts.get(
          STANDARD_ACCOUNT_CODES.COST_OF_GOODS_SOLD
        );
        const invAssetAcc = sellerAccounts.get(
          STANDARD_ACCOUNT_CODES.INVENTORY_ASSET
        );
        if (cogsAcc && invAssetAcc) {
          sellerLines.push(
            new JournalLine({
              financialAccountId: invAssetAcc.id,
              tenantId: sellerTenantId,
              direction: "DEBIT",
              amount: Money.fromMinor(sellerProductCost, currency),
              memo: `Solo Inventory Asset Restoration - Return Order ${order.orderNumber}`,
            })
          );
          sellerLines.push(
            new JournalLine({
              financialAccountId: cogsAcc.id,
              tenantId: sellerTenantId,
              direction: "CREDIT",
              amount: Money.fromMinor(sellerProductCost, currency),
              memo: `Solo COGS Reversal - Return Order ${order.orderNumber}`,
            })
          );
        }
      }

      // Debit Service Revenue Reversal
      if (sellerServiceRev > 0n) {
        const srvAcc = sellerAccounts.get(
          STANDARD_ACCOUNT_CODES.SERVICE_REVENUE
        );
        if (srvAcc) {
          sellerLines.push(
            new JournalLine({
              financialAccountId: srvAcc.id,
              tenantId: sellerTenantId,
              direction: "DEBIT",
              amount: Money.fromMinor(sellerServiceRev, currency),
              memo: `Solo Service Revenue Reversal - Order ${order.orderNumber}`,
            })
          );
        }
      }

      // Debit Tips Payable Reversal
      if (sellerTips > 0n) {
        const tipAcc = sellerAccounts.get(STANDARD_ACCOUNT_CODES.TIPS_PAYABLE);
        if (tipAcc) {
          sellerLines.push(
            new JournalLine({
              financialAccountId: tipAcc.id,
              tenantId: sellerTenantId,
              direction: "DEBIT",
              amount: Money.fromMinor(sellerTips, currency),
              memo: `Solo Tips Reversal - Order ${order.orderNumber}`,
            })
          );
        }
      }

      if (sellerLines.length >= 2) {
        const sellerEntry = new JournalEntry({
          tenantId: sellerTenantId,
          entryNumber: `JE-RET-SOLO-${sellerTenantId.slice(0, 4)}-${entryNumberSuffix}`,
          entryType: "REVERSAL",
          currency,
          sourceType: "ORDER",
          sourceId: order.id,
          description: `Solo Seller Return/Refund - Order ${order.orderNumber}`,
          status: "POSTED",
          lines: sellerLines,
          createdByUserId: actorUserId || null,
        });
        await this.financeRepository.postJournalEntry(sellerEntry, tx);
      }
    }
  }
}
