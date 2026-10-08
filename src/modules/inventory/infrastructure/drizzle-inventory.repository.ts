import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  inventoryPositions,
  stockMovements,
  InventoryPositionRow,
  StockMovementRow,
} from "@/infrastructure/database/schema/commerce";
import {
  IInventoryRepository,
  StockChangeParams,
} from "../domain/inventory.repository";
import { InventoryPosition } from "../domain/inventory-position";
import { StockMovement } from "../domain/stock-movement";
import { InsufficientStockError } from "../domain/inventory-errors";

export class DrizzleInventoryRepository implements IInventoryRepository {
  async findPosition(
    ownerTenantId: string,
    locationId: string,
    productVariantId: string,
    tx = db
  ): Promise<InventoryPosition | null> {
    const [row] = await tx
      .select()
      .from(inventoryPositions)
      .where(
        and(
          eq(inventoryPositions.ownerTenantId, ownerTenantId),
          eq(inventoryPositions.locationId, locationId),
          eq(inventoryPositions.productVariantId, productVariantId)
        )
      )
      .limit(1);

    return row ? this.mapPosition(row) : null;
  }

  async findPositionsByOwner(
    ownerTenantId: string,
    options?: { locationId?: string; productVariantId?: string },
    tx = db
  ): Promise<InventoryPosition[]> {
    const conditions = [eq(inventoryPositions.ownerTenantId, ownerTenantId)];
    if (options?.locationId) {
      conditions.push(eq(inventoryPositions.locationId, options.locationId));
    }
    if (options?.productVariantId) {
      conditions.push(
        eq(inventoryPositions.productVariantId, options.productVariantId)
      );
    }

    const rows = await tx
      .select()
      .from(inventoryPositions)
      .where(and(...conditions));

    return rows.map((r) => this.mapPosition(r));
  }

  async findMovements(
    ownerTenantId: string,
    options?: {
      locationId?: string;
      productVariantId?: string;
      limit?: number;
      offset?: number;
    },
    tx = db
  ): Promise<StockMovement[]> {
    const conditions = [eq(stockMovements.ownerTenantId, ownerTenantId)];
    if (options?.locationId) {
      conditions.push(eq(stockMovements.locationId, options.locationId));
    }
    if (options?.productVariantId) {
      conditions.push(
        eq(stockMovements.productVariantId, options.productVariantId)
      );
    }

    const rows = await tx
      .select()
      .from(stockMovements)
      .where(and(...conditions))
      .orderBy(desc(stockMovements.occurredAt))
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0);

    return rows.map((r) => this.mapMovement(r));
  }

  async applyStockChange(
    params: StockChangeParams,
    externalTx?: any
  ): Promise<{ position: InventoryPosition; movement: StockMovement }> {
    const runInTx = async (tx: any) => {
      // 1. Select for update to lock the inventory position row
      const [lockedPosition] = await tx
        .select()
        .from(inventoryPositions)
        .where(
          and(
            eq(inventoryPositions.ownerTenantId, params.ownerTenantId),
            eq(inventoryPositions.locationId, params.locationId),
            eq(inventoryPositions.productVariantId, params.productVariantId)
          )
        )
        .for("update");

      let updatedPositionRow: InventoryPositionRow;

      if (!lockedPosition) {
        if (params.quantityDelta < 0) {
          throw new InsufficientStockError(
            `Insufficient stock: variant ${params.productVariantId} not found in location ${params.locationId}`
          );
        }

        const [created] = await tx
          .insert(inventoryPositions)
          .values({
            ownerTenantId: params.ownerTenantId,
            locationId: params.locationId,
            productVariantId: params.productVariantId,
            onHand: params.quantityDelta,
            reserved: 0,
            version: 1,
            updatedAt: new Date(),
          })
          .returning();
        updatedPositionRow = created;
      } else {
        const nextOnHand = lockedPosition.onHand + params.quantityDelta;
        if (nextOnHand < 0) {
          throw new InsufficientStockError(
            `Insufficient stock: on-hand is ${lockedPosition.onHand}, requested reduction is ${Math.abs(params.quantityDelta)}`
          );
        }

        const [updated] = await tx
          .update(inventoryPositions)
          .set({
            onHand: nextOnHand,
            version: lockedPosition.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(inventoryPositions.id, lockedPosition.id))
          .returning();
        updatedPositionRow = updated;
      }

      // 2. Insert stock movement (quantity strictly positive)
      const absQuantity = Math.abs(params.quantityDelta);
      const [movementRow] = await tx
        .insert(stockMovements)
        .values({
          ownerTenantId: params.ownerTenantId,
          locationId: params.locationId,
          productVariantId: params.productVariantId,
          movementType: params.movementType,
          quantity: absQuantity,
          unitCostMinor: params.unitCostMinor ?? null,
          currency: params.currency || "COP",
          sourceType: params.sourceType,
          sourceId: params.sourceId ?? null,
          correlationId: params.correlationId ?? null,
          reason: params.reason ?? null,
          createdByUserId: params.createdByUserId ?? null,
          occurredAt: params.occurredAt || new Date(),
        })
        .returning();

      return {
        position: this.mapPosition(updatedPositionRow),
        movement: this.mapMovement(movementRow),
      };
    };

    if (externalTx) {
      return await runInTx(externalTx);
    }
    return await db.transaction(runInTx);
  }

  private mapPosition(row: InventoryPositionRow): InventoryPosition {
    return {
      id: row.id,
      ownerTenantId: row.ownerTenantId,
      locationId: row.locationId,
      productVariantId: row.productVariantId,
      onHand: row.onHand,
      reserved: row.reserved,
      version: row.version,
      updatedAt: row.updatedAt,
    };
  }

  private mapMovement(row: StockMovementRow): StockMovement {
    return {
      id: row.id,
      ownerTenantId: row.ownerTenantId,
      locationId: row.locationId,
      productVariantId: row.productVariantId,
      movementType: row.movementType as any,
      quantity: row.quantity,
      unitCostMinor: row.unitCostMinor,
      currency: row.currency,
      sourceType: row.sourceType as any,
      sourceId: row.sourceId,
      correlationId: row.correlationId,
      reason: row.reason,
      createdByUserId: row.createdByUserId,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
    };
  }
}
