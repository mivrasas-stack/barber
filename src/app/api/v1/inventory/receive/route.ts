import { NextRequest, NextResponse } from "next/server";
import { authorizeCommerceRequest } from "@/modules/commerce/infrastructure/commerce-auth";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { ReceiveStockUseCase } from "@/modules/inventory/application/receive-stock.usecase";
import { AppError } from "@/shared/errors/app-error";

const inventoryRepo = new DrizzleInventoryRepository();

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeCommerceRequest(req, {
      requiredModule: "inventory.stock",
      requiredPermission: "inventory.manage",
    });

    const body = await req.json();

    if (body.locationId) {
      auth.assertLocationAccess(body.locationId);
    }
    if (body.productVariantId) {
      await auth.assertProductVariantOwnership(body.productVariantId);
    }

    const receiveUseCase = new ReceiveStockUseCase(inventoryRepo);
    const result = await receiveUseCase.execute({
      ownerTenantId: auth.actorOwnerTenantId,
      locationId: body.locationId,
      productVariantId: body.productVariantId,
      quantity: Number(body.quantity),
      unitCostMinor:
        body.unitCostMinor !== undefined && body.unitCostMinor !== null
          ? BigInt(body.unitCostMinor)
          : null,
      actorUserId: auth.userId,
      reason: body.reason,
      correlationId: body.correlationId,
      currency: body.currency,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          position: result.position,
          movement: {
            ...result.movement,
            unitCostMinor: result.movement.unitCostMinor
              ? result.movement.unitCostMinor.toString()
              : null,
          },
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    const status =
      err.message?.includes("PERMISSION_DENIED") ||
      err.message?.includes("LOCATION_SCOPE_DENIED") ||
      err.message?.includes("OWNER_SCOPE_DENIED")
        ? 403
        : 400;
    return NextResponse.json(
      { success: false, error: err.message },
      { status }
    );
  }
}
