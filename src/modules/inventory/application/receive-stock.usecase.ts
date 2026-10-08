import { IInventoryRepository } from "../domain/inventory.repository";
import { InventoryPosition } from "../domain/inventory-position";
import { StockMovement } from "../domain/stock-movement";

export interface ReceiveStockInput {
  ownerTenantId: string;
  locationId: string;
  productVariantId: string;
  quantity: number;
  unitCostMinor?: bigint | null;
  actorUserId?: string | null;
  reason?: string;
  correlationId?: string;
  currency?: string;
}

export class ReceiveStockUseCase {
  constructor(private readonly inventoryRepository: IInventoryRepository) {}

  async execute(input: ReceiveStockInput): Promise<{ position: InventoryPosition; movement: StockMovement }> {
    if (input.quantity <= 0) {
      throw new Error("Received quantity must be strictly greater than 0");
    }

    return await this.inventoryRepository.applyStockChange({
      ownerTenantId: input.ownerTenantId,
      locationId: input.locationId,
      productVariantId: input.productVariantId,
      quantityDelta: input.quantity,
      movementType: "PURCHASE_RECEIPT",
      sourceType: "PURCHASE_RECEIPT",
      unitCostMinor: input.unitCostMinor,
      currency: input.currency || "COP",
      reason: input.reason || "Stock receipt",
      correlationId: input.correlationId,
      createdByUserId: input.actorUserId,
    });
  }
}
