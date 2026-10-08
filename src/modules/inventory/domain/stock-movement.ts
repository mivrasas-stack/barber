export type MovementType =
  | "INITIAL_BALANCE"
  | "PURCHASE_RECEIPT"
  | "SALE"
  | "SALE_RETURN"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "DAMAGE"
  | "LOSS"
  | "EXPIRED";

export type MovementSourceType =
  | "ORDER"
  | "MANUAL"
  | "TRANSFER"
  | "PURCHASE_RECEIPT"
  | "RETURN";

export interface StockMovement {
  id: string;
  ownerTenantId: string;
  locationId: string;
  productVariantId: string;
  movementType: MovementType;
  quantity: number; // Strictly positive > 0
  unitCostMinor?: bigint | null;
  currency?: string | null;
  sourceType: MovementSourceType;
  sourceId?: string | null;
  correlationId?: string | null;
  reason?: string | null;
  createdByUserId?: string | null;
  occurredAt: Date;
  createdAt: Date;
}
