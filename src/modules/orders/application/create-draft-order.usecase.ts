import { randomUUID } from "node:crypto";
import { IOrderRepository } from "../domain/order.repository";
import { IProductRepository } from "@/modules/commerce/domain/product.repository";
import { Order, OrderCollectorParty } from "../domain/order";
import { OrderItemType } from "../domain/order-item";

export interface CreateDraftOrderItemInput {
  itemType: OrderItemType;
  productVariantId?: string;
  serviceId?: string;
  appointmentServiceId?: string;
  professionalProfileId?: string;
  sellerTenantId?: string;
  description?: string;
  sku?: string;
  quantity: number;
  unitPriceMinor?: bigint;
  unitCostMinor?: bigint | null;
  discountMinor?: bigint;
  taxMinor?: bigint;
  metadata?: Record<string, unknown>;
}

export interface CreateDraftOrderInput {
  id?: string;
  orderNumber?: string;
  contextTenantId: string;
  locationId?: string;
  customerUserId?: string;
  customerNameSnapshot?: string;
  customerEmailSnapshot?: string;
  customerPhoneSnapshot?: string;
  appointmentId?: string;
  collectorParty?: OrderCollectorParty;
  notes?: string;
  createdByUserId?: string;
  allowedSellerTenantIds?: string[];
  items: CreateDraftOrderItemInput[];
}

export class CreateDraftOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly productRepository?: IProductRepository
  ) {}

  async execute(input: CreateDraftOrderInput): Promise<Order> {
    if (!input.items || input.items.length === 0) {
      throw new Error("Order must contain at least one item");
    }

    const orderNumber =
      input.orderNumber ||
      `ORD-${Date.now().toString(36).toUpperCase()}-${randomUUID()
        .slice(0, 8)
        .toUpperCase()}`;

    const resolvedItems = [];
    let positionCounter = 1;

    let subtotalMinor = 0n;
    let discountTotalMinor = 0n;
    let taxTotalMinor = 0n;
    let tipTotalMinor = 0n;

    for (const itemInput of input.items) {
      let sellerTenantId = itemInput.sellerTenantId || input.contextTenantId;
      let unitPriceMinor = itemInput.unitPriceMinor ?? 0n;
      let unitCostMinor = itemInput.unitCostMinor ?? null;
      let descriptionSnapshot = itemInput.description || "Order Item";
      let skuSnapshot = itemInput.sku || null;

      if (itemInput.itemType === "PRODUCT") {
        if (!itemInput.productVariantId) {
          throw new Error("Product variant ID is required for PRODUCT items");
        }
        if (this.productRepository) {
          const variant = await this.productRepository.findVariantById(
            itemInput.productVariantId
          );
          if (!variant) {
            throw new Error(
              `Product variant ${itemInput.productVariantId} not found`
            );
          }
          if (variant.product) {
            sellerTenantId = variant.product.ownerTenantId;
            descriptionSnapshot = `${variant.product.name} (${variant.name})`;
          } else {
            descriptionSnapshot = variant.name;
          }
          unitPriceMinor = variant.priceMinor;
          unitCostMinor = variant.costMinor ?? null;
          skuSnapshot = variant.sku;
        }
      }

      if (
        input.allowedSellerTenantIds &&
        input.allowedSellerTenantIds.length > 0
      ) {
        if (!input.allowedSellerTenantIds.includes(sellerTenantId)) {
          throw new Error(
            `SELLER_SCOPE_DENIED: Seller ${sellerTenantId} is not permitted in this order context`
          );
        }
      }

      const quantity = itemInput.quantity > 0 ? itemInput.quantity : 1;
      const discountMinor = itemInput.discountMinor ?? 0n;
      const taxMinor = itemInput.taxMinor ?? 0n;
      const lineBase = unitPriceMinor * BigInt(quantity);
      const lineTotalMinor = lineBase - discountMinor + taxMinor;

      if (itemInput.itemType === "TIP") {
        tipTotalMinor += lineTotalMinor;
      } else {
        subtotalMinor += lineBase;
        discountTotalMinor += discountMinor;
        taxTotalMinor += taxMinor;
      }

      resolvedItems.push({
        itemType: itemInput.itemType,
        sellerTenantId,
        serviceId: itemInput.serviceId || null,
        appointmentServiceId: itemInput.appointmentServiceId || null,
        productVariantId: itemInput.productVariantId || null,
        professionalProfileId: itemInput.professionalProfileId || null,
        descriptionSnapshot,
        skuSnapshot,
        quantity,
        unitPriceMinor,
        unitCostMinor,
        discountMinor,
        taxMinor,
        lineTotalMinor,
        currency: "COP",
        position: positionCounter++,
        metadata: itemInput.metadata || null,
      });
    }

    const grandTotalMinor =
      subtotalMinor - discountTotalMinor + taxTotalMinor + tipTotalMinor;

    return await this.orderRepository.save(
      {
        id: input.id,
        orderNumber,
        contextTenantId: input.contextTenantId,
        locationId: input.locationId || null,
        customerUserId: input.customerUserId || null,
        customerNameSnapshot: input.customerNameSnapshot || null,
        customerEmailSnapshot: input.customerEmailSnapshot || null,
        customerPhoneSnapshot: input.customerPhoneSnapshot || null,
        appointmentId: input.appointmentId || null,
        status: "DRAFT",
        currency: "COP",
        subtotalMinor,
        discountTotalMinor,
        taxTotalMinor,
        tipTotalMinor,
        grandTotalMinor,
        collectorParty: input.collectorParty || "COLLECTED_BY_HOST",
        notes: input.notes || null,
        createdByUserId: input.createdByUserId || null,
        openedAt: new Date(),
        version: 1,
      },
      resolvedItems
    );
  }
}
