import { NextRequest, NextResponse } from "next/server";
import { authorizeCommerceRequest } from "@/modules/commerce/infrastructure/commerce-auth";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { AppError } from "@/shared/errors/app-error";

const inventoryRepo = new DrizzleInventoryRepository();

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeCommerceRequest(req, {
      requiredModule: "inventory.stock",
      requiredPermission: "inventory.positions.read",
    });

    const locationId = req.nextUrl.searchParams.get("locationId") || undefined;
    const productVariantId =
      req.nextUrl.searchParams.get("productVariantId") || undefined;
    const limit = Number(req.nextUrl.searchParams.get("limit") || "100");
    const offset = Number(req.nextUrl.searchParams.get("offset") || "0");

    if (locationId) {
      auth.assertLocationAccess(locationId);
    }

    const movements = await inventoryRepo.findMovements(
      auth.actorOwnerTenantId,
      { locationId, productVariantId, limit, offset }
    );

    const canViewCosts = auth.canViewCosts();

    const serializedMovements = movements.map((m) => {
      const item: any = {
        id: m.id,
        ownerTenantId: m.ownerTenantId,
        locationId: m.locationId,
        productVariantId: m.productVariantId,
        movementType: m.movementType,
        quantity: m.quantity,
        currency: m.currency,
        sourceType: m.sourceType,
        sourceId: m.sourceId,
        correlationId: m.correlationId,
        reason: m.reason,
        createdByUserId: m.createdByUserId,
        occurredAt: m.occurredAt,
        createdAt: m.createdAt,
      };

      if (canViewCosts && m.unitCostMinor !== undefined && m.unitCostMinor !== null) {
        item.unitCostMinor = m.unitCostMinor.toString();
      }

      return item;
    });

    return NextResponse.json({
      success: true,
      data: { movements: serializedMovements },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    const status =
      err.message?.includes("PERMISSION_DENIED") ||
      err.message?.includes("MODULE_NOT_ENTITLED") ||
      err.message?.includes("AFFILIATION_REQUIRED") ||
      err.message?.includes("LOCATION_SCOPE_DENIED")
        ? 403
        : 500;
    return NextResponse.json(
      { success: false, error: err.message },
      { status }
    );
  }
}
