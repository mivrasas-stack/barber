import { NextRequest, NextResponse } from "next/server";
import { authorizeCommerceRequest } from "@/modules/commerce/infrastructure/commerce-auth";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { TransferStockUseCase } from "@/modules/inventory/application/transfer-stock.usecase";
import { AppError } from "@/shared/errors/app-error";

const inventoryRepo = new DrizzleInventoryRepository();

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeCommerceRequest(req, {
      requiredModule: "inventory.stock",
      requiredPermission: "inventory.manage",
    });

    const body = await req.json();

    auth.assertLocationAccess(body.fromLocationId);
    auth.assertLocationAccess(body.toLocationId);
    await auth.assertProductVariantOwnership(body.productVariantId);

    const transferUseCase = new TransferStockUseCase(inventoryRepo);
    const result = await transferUseCase.execute({
      ownerTenantId: auth.actorOwnerTenantId,
      fromLocationId: body.fromLocationId,
      toLocationId: body.toLocationId,
      productVariantId: body.productVariantId,
      quantity: Number(body.quantity),
      reason: body.reason,
      actorUserId: auth.userId,
      unitCostMinor:
        body.unitCostMinor !== undefined && body.unitCostMinor !== null
          ? BigInt(body.unitCostMinor)
          : null,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          fromPosition: result.fromPosition,
          toPosition: result.toPosition,
          outMovement: {
            ...result.outMovement,
            unitCostMinor: result.outMovement.unitCostMinor
              ? result.outMovement.unitCostMinor.toString()
              : null,
          },
          inMovement: {
            ...result.inMovement,
            unitCostMinor: result.inMovement.unitCostMinor
              ? result.inMovement.unitCostMinor.toString()
              : null,
          },
        },
      },
      { status: 200 }
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
