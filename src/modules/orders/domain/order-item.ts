export type OrderItemType =
  | "SERVICE"
  | "PRODUCT"
  | "TIP"
  | "FEE"
  | "DISCOUNT";

export interface OrderItem {
  id: string;
  orderId: string;
  itemType: OrderItemType;
  sellerTenantId: string;
  serviceId?: string | null;
  appointmentServiceId?: string | null;
  productVariantId?: string | null;
  professionalProfileId?: string | null;
  descriptionSnapshot: string;
  skuSnapshot?: string | null;
  quantity: number;
  unitPriceMinor: bigint;
  unitCostMinor?: bigint | null;
  discountMinor: bigint;
  taxMinor: bigint;
  lineTotalMinor: bigint;
  currency: string;
  position: number;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}
