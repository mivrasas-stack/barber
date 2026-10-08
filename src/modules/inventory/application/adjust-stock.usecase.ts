import { IInventoryRepository } from "../domain/inventory.repository";
import { MovementType, StockMovement } from "../domain/stock-movement";
import { InventoryPosition } from "../domain/inventory-position";

export interface AdjustStockInput {
  ownerTenantId: string;
  locationId: string;
  productVariantId: string;
  quantityDelta: number; // positive or negative
  movementType?: MovementType;
  reason: string;
  actorUserId?: string | null;
  unitCostMinor?: bigint | null;
  currency?: string;
}

export class AdjustStockUseCase {
  constructor(private readonly inventoryRepository: IInventoryRepository) {}

  async execute(input: AdjustStockInput): Promise<{ position: InventoryPosition; movement: StockMovement }> {
    if (input.quantityDelta === 0) {
      throw new Error("Quantity delta cannot be zero");
    }

    if (!input.reason || input.reason.trim().length === 0) {
      throw new Error("Reason is required for inventory adjustments");
    }

    const resolvedMovementType: MovementType =
      input.movementType || (input.quantityDelta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT");

    return await this.inventoryRepository.applyStockChange({
      ownerTenantId: input.ownerTenantId,
      locationId: input.locationId,
      productVariantId: input.productVariantId,
      quantityDelta: input.quantityDelta,
      movementType: resolvedMovementType,
      sourceType: "MANUAL",
      reason: input.reason,
      unitCostMinor: input.unitCostMinor,
      currency: input.currency || "COP",
      createdByUserId: input.actorUserId,
    });
  }
}
