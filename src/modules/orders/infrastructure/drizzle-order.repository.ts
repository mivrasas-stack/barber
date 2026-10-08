import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  orders,
  orderItems,
  orderTenders,
  OrderRow,
  OrderItemRow,
  OrderTenderRow,
} from "@/infrastructure/database/schema/commerce";
import { IOrderRepository } from "../domain/order.repository";
import { Order, OrderStatus } from "../domain/order";
import { OrderItem } from "../domain/order-item";
import { OrderTender } from "../domain/order-tender";

export class DrizzleOrderRepository implements IOrderRepository {
  async findById(id: string, tx = db): Promise<Order | null> {
    const [row] = await tx.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!row) return null;

    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .orderBy(orderItems.position);

    const tenders = await tx
      .select()
      .from(orderTenders)
      .where(eq(orderTenders.orderId, id));

    return this.mapOrder(row, items, tenders);
  }

  async findByOrderNumber(orderNumber: string, tx = db): Promise<Order | null> {
    const [row] = await tx
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);
    if (!row) return null;

    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, row.id))
      .orderBy(orderItems.position);

    const tenders = await tx
      .select()
      .from(orderTenders)
      .where(eq(orderTenders.orderId, row.id));

    return this.mapOrder(row, items, tenders);
  }

  async findByContext(
    contextTenantId: string,
    options?: {
      locationId?: string;
      status?: OrderStatus;
      customerUserId?: string;
      limit?: number;
      offset?: number;
    },
    tx = db
  ): Promise<Order[]> {
    const conditions = [eq(orders.contextTenantId, contextTenantId)];
    if (options?.locationId) {
      conditions.push(eq(orders.locationId, options.locationId));
    }
    if (options?.status) {
      conditions.push(eq(orders.status, options.status));
    }
    if (options?.customerUserId) {
      conditions.push(eq(orders.customerUserId, options.customerUserId));
    }

    const orderRows = await tx
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.openedAt))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);

    if (orderRows.length === 0) return [];

    const orderIds = orderRows.map((o) => o.id);
    const itemRows = await tx
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .orderBy(orderItems.position);

    const tenderRows = await tx
      .select()
      .from(orderTenders)
      .where(inArray(orderTenders.orderId, orderIds));

    const itemsMap = new Map<string, OrderItemRow[]>();
    for (const item of itemRows) {
      const list = itemsMap.get(item.orderId) || [];
      list.push(item);
      itemsMap.set(item.orderId, list);
    }

    const tendersMap = new Map<string, OrderTenderRow[]>();
    for (const tender of tenderRows) {
      const list = tendersMap.get(tender.orderId) || [];
      list.push(tender);
      tendersMap.set(tender.orderId, list);
    }

    return orderRows.map((row) =>
      this.mapOrder(row, itemsMap.get(row.id) || [], tendersMap.get(row.id) || [])
    );
  }

  async save(
    order: Omit<Order, "id" | "createdAt" | "updatedAt" | "items" | "tenders"> & { id?: string },
    items: Array<Omit<OrderItem, "id" | "orderId" | "createdAt"> & { id?: string }>,
    externalTx?: any
  ): Promise<Order> {
    const runInTx = async (tx: any) => {
      const [orderRow] = await tx
        .insert(orders)
        .values({
          ...(order.id ? { id: order.id } : {}),
          orderNumber: order.orderNumber,
          contextTenantId: order.contextTenantId,
          locationId: order.locationId || null,
          customerUserId: order.customerUserId || null,
          customerNameSnapshot: order.customerNameSnapshot || null,
          customerEmailSnapshot: order.customerEmailSnapshot || null,
          customerPhoneSnapshot: order.customerPhoneSnapshot || null,
          appointmentId: order.appointmentId || null,
          status: order.status || "DRAFT",
          currency: order.currency || "COP",
          subtotalMinor: order.subtotalMinor,
          discountTotalMinor: order.discountTotalMinor,
          taxTotalMinor: order.taxTotalMinor,
          tipTotalMinor: order.tipTotalMinor,
          grandTotalMinor: order.grandTotalMinor,
          collectorParty: order.collectorParty || "COLLECTED_BY_HOST",
          notes: order.notes || null,
          createdByUserId: order.createdByUserId || null,
          openedAt: order.openedAt || new Date(),
          completedAt: order.completedAt || null,
          cancelledAt: order.cancelledAt || null,
          version: order.version || 1,
        })
        .returning();

      const itemRows: OrderItemRow[] = [];
      for (const item of items) {
        const [itemRow] = await tx
          .insert(orderItems)
          .values({
            ...(item.id ? { id: item.id } : {}),
            orderId: orderRow.id,
            itemType: item.itemType,
            sellerTenantId: item.sellerTenantId,
            serviceId: item.serviceId || null,
            appointmentServiceId: item.appointmentServiceId || null,
            productVariantId: item.productVariantId || null,
            professionalProfileId: item.professionalProfileId || null,
            descriptionSnapshot: item.descriptionSnapshot,
            skuSnapshot: item.skuSnapshot || null,
            quantity: item.quantity,
            unitPriceMinor: item.unitPriceMinor,
            unitCostMinor: item.unitCostMinor ?? null,
            discountMinor: item.discountMinor,
            taxMinor: item.taxMinor,
            lineTotalMinor: item.lineTotalMinor,
            currency: item.currency || "COP",
            position: item.position,
            metadata: item.metadata || null,
          })
          .returning();
        itemRows.push(itemRow);
      }

      return this.mapOrder(orderRow, itemRows, []);
    };

    if (externalTx) {
      return await runInTx(externalTx);
    }
    return await db.transaction(runInTx);
  }

  async update(order: Partial<Order> & { id: string }, tx = db): Promise<Order> {
    const [updatedRow] = await tx
      .update(orders)
      .set({
        ...(order.status !== undefined ? { status: order.status } : {}),
        ...(order.subtotalMinor !== undefined ? { subtotalMinor: order.subtotalMinor } : {}),
        ...(order.discountTotalMinor !== undefined ? { discountTotalMinor: order.discountTotalMinor } : {}),
        ...(order.taxTotalMinor !== undefined ? { taxTotalMinor: order.taxTotalMinor } : {}),
        ...(order.tipTotalMinor !== undefined ? { tipTotalMinor: order.tipTotalMinor } : {}),
        ...(order.grandTotalMinor !== undefined ? { grandTotalMinor: order.grandTotalMinor } : {}),
        ...(order.collectorParty !== undefined ? { collectorParty: order.collectorParty } : {}),
        ...(order.notes !== undefined ? { notes: order.notes } : {}),
        ...(order.completedAt !== undefined ? { completedAt: order.completedAt } : {}),
        ...(order.cancelledAt !== undefined ? { cancelledAt: order.cancelledAt } : {}),
        ...(order.version !== undefined ? { version: order.version } : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id))
      .returning();

    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .orderBy(orderItems.position);

    const tenders = await tx
      .select()
      .from(orderTenders)
      .where(eq(orderTenders.orderId, order.id));

    return this.mapOrder(updatedRow, items, tenders);
  }

  async addTenders(
    orderId: string,
    tenders: Array<Omit<OrderTender, "id" | "orderId" | "createdAt">>,
    tx = db
  ): Promise<OrderTender[]> {
    const results: OrderTender[] = [];
    for (const tender of tenders) {
      const [row] = await tx
        .insert(orderTenders)
        .values({
          orderId,
          method: tender.method,
          amountMinor: tender.amountMinor,
          amountReceivedMinor: tender.amountReceivedMinor ?? null,
          changeDueMinor: tender.changeDueMinor ?? null,
          currency: tender.currency || "COP",
          reference: tender.reference || null,
          declaredByUserId: tender.declaredByUserId || null,
        })
        .returning();
      results.push(this.mapTender(row));
    }
    return results;
  }

  private mapOrder(
    row: OrderRow,
    itemRows: OrderItemRow[],
    tenderRows: OrderTenderRow[]
  ): Order {
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      contextTenantId: row.contextTenantId,
      locationId: row.locationId,
      customerUserId: row.customerUserId,
      customerNameSnapshot: row.customerNameSnapshot,
      customerEmailSnapshot: row.customerEmailSnapshot,
      customerPhoneSnapshot: row.customerPhoneSnapshot,
      appointmentId: row.appointmentId,
      status: row.status as OrderStatus,
      currency: row.currency,
      subtotalMinor: row.subtotalMinor,
      discountTotalMinor: row.discountTotalMinor,
      taxTotalMinor: row.taxTotalMinor,
      tipTotalMinor: row.tipTotalMinor,
      grandTotalMinor: row.grandTotalMinor,
      collectorParty: row.collectorParty as any,
      notes: row.notes,
      createdByUserId: row.createdByUserId,
      openedAt: row.openedAt,
      completedAt: row.completedAt,
      cancelledAt: row.cancelledAt,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      items: itemRows.map((i) => this.mapItem(i)),
      tenders: tenderRows.map((t) => this.mapTender(t)),
    };
  }

  private mapItem(row: OrderItemRow): OrderItem {
    return {
      id: row.id,
      orderId: row.orderId,
      itemType: row.itemType as any,
      sellerTenantId: row.sellerTenantId,
      serviceId: row.serviceId,
      appointmentServiceId: row.appointmentServiceId,
      productVariantId: row.productVariantId,
      professionalProfileId: row.professionalProfileId,
      descriptionSnapshot: row.descriptionSnapshot,
      skuSnapshot: row.skuSnapshot,
      quantity: row.quantity,
      unitPriceMinor: row.unitPriceMinor,
      unitCostMinor: row.unitCostMinor,
      discountMinor: row.discountMinor,
      taxMinor: row.taxMinor,
      lineTotalMinor: row.lineTotalMinor,
      currency: row.currency,
      position: row.position,
      metadata: row.metadata,
      createdAt: row.createdAt,
    };
  }

  private mapTender(row: OrderTenderRow): OrderTender {
    return {
      id: row.id,
      orderId: row.orderId,
      method: row.method as any,
      amountMinor: row.amountMinor,
      amountReceivedMinor: row.amountReceivedMinor,
      changeDueMinor: row.changeDueMinor,
      currency: row.currency,
      reference: row.reference,
      declaredByUserId: row.declaredByUserId,
      createdAt: row.createdAt,
    };
  }
}
