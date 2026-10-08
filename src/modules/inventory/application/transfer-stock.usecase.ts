import { randomUUID } from "node:crypto";
import { db } from "@/infrastructure/database/client";
import { IInventoryRepository } from "../domain/inventory.repository";
import { StockMovement } from "../domain/stock-movement";
import { InventoryPosition } from "../domain/inventory-position";

export interface TransferStockInput {
  ownerTenantId: string;
  fromLocationId: string;
  toLocationId: string;
  productVariantId: string;
  quantity: number;
  actorUserId?: string | null;
  reason?: string;
  unitCostMinor?: bigint | null;
}

export class TransferStockUseCase {
  constructor(private readonly inventoryRepository: IInventoryRepository) {}

  async execute(input: TransferStockInput): Promise<{
    fromPosition: InventoryPosition;
    toPosition: InventoryPosition;
    outMovement: StockMovement;
    inMovement: StockMovement;
  }> {
    if (input.quantity <= 0) {
      throw new Error("Transfer quantity must be greater than 0");
    }

    if (input.fromLocationId === input.toLocationId) {
      throw new Error("Source and destination locations must be different");
    }

    const correlationId = `transfer_${randomUUID()}`;

    return await db.transaction(async (tx) => {
      const outResult = await this.inventoryRepository.applyStockChange(
        {
          ownerTenantId: input.ownerTenantId,
          locationId: input.fromLocationId,
          productVariantId: input.productVariantId,
          quantityDelta: -input.quantity,
          movementType: "TRANSFER_OUT",
          sourceType: "TRANSFER",
          correlationId,
          reason: input.reason || `Transfer to location ${input.toLocationId}`,
          unitCostMinor: input.unitCostMinor,
          createdByUserId: input.actorUserId,
        },
        tx
      );

      const inResult = await this.inventoryRepository.applyStockChange(
        {
          ownerTenantId: input.ownerTenantId,
          locationId: input.toLocationId,
          productVariantId: input.productVariantId,
          quantityDelta: input.quantity,
          movementType: "TRANSFER_IN",
          sourceType: "TRANSFER",
          correlationId,
          reason: input.reason || `Transfer from location ${input.fromLocationId}`,
          unitCostMinor: input.unitCostMinor,
          createdByUserId: input.actorUserId,
        },
        tx
      );

      return {
        fromPosition: outResult.position,
        toPosition: inResult.position,
        outMovement: outResult.movement,
        inMovement: inResult.movement,
      };
    });
  }
}
