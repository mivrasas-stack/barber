import { InventoryPosition } from "./inventory-position";
import { StockMovement, MovementType, MovementSourceType } from "./stock-movement";

export interface StockChangeParams {
  ownerTenantId: string;
  locationId: string;
  productVariantId: string;
  quantityDelta: number; // positive increases, negative decreases
  movementType: MovementType;
  sourceType: MovementSourceType;
  sourceId?: string | null;
  correlationId?: string | null;
  unitCostMinor?: bigint | null;
  currency?: string;
  reason?: string | null;
  createdByUserId?: string | null;
  occurredAt?: Date;
}

export interface IInventoryRepository {
  findPosition(
    ownerTenantId: string,
    locationId: string,
    productVariantId: string,
    tx?: any
  ): Promise<InventoryPosition | null>;

  findPositionsByOwner(
    ownerTenantId: string,
    options?: { locationId?: string; productVariantId?: string },
    tx?: any
  ): Promise<InventoryPosition[]>;

  findMovements(
    ownerTenantId: string,
    options?: {
      locationId?: string;
      productVariantId?: string;
      limit?: number;
      offset?: number;
    },
    tx?: any
  ): Promise<StockMovement[]>;

  applyStockChange(
    params: StockChangeParams,
    tx?: any
  ): Promise<{ position: InventoryPosition; movement: StockMovement }>;
}
