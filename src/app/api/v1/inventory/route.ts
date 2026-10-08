import { NextRequest, NextResponse } from "next/server";
import { authorizeCommerceRequest } from "@/modules/commerce/infrastructure/commerce-auth";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { DrizzleProductRepository } from "@/modules/commerce/infrastructure/drizzle-product.repository";
import { AppError } from "@/shared/errors/app-error";

const inventoryRepo = new DrizzleInventoryRepository();
const productRepo = new DrizzleProductRepository();

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeCommerceRequest(req, {
      requiredModule: "inventory.stock",
      requiredPermission: "inventory.positions.read",
    });

    const locationId = req.nextUrl.searchParams.get("locationId") || undefined;
    const productVariantId =
      req.nextUrl.searchParams.get("productVariantId") || undefined;

    if (locationId) {
      auth.assertLocationAccess(locationId);
    }

    const positions = await inventoryRepo.findPositionsByOwner(
      auth.actorOwnerTenantId,
      { locationId, productVariantId }
    );

    const variantIds = positions.map((p) => p.productVariantId);
    const variants = await productRepo.findVariantsByIds(variantIds);
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const canViewCosts = auth.canViewCosts();
    let totalOnHandUnits = 0;
    let totalValuation = 0n;

    const items = positions.map((p) => {
      const v = variantMap.get(p.productVariantId);
      totalOnHandUnits += p.onHand;

      const item: any = {
        id: p.id,
        ownerTenantId: p.ownerTenantId,
        locationId: p.locationId,
        productVariantId: p.productVariantId,
        onHand: p.onHand,
        reserved: p.reserved,
        available: p.onHand - p.reserved,
        updatedAt: p.updatedAt,
        variant: v
          ? {
              id: v.id,
              sku: v.sku,
              name: v.name,
              priceMinor: v.priceMinor.toString(),
            }
          : null,
      };

      if (canViewCosts && v?.costMinor !== undefined && v?.costMinor !== null) {
        const lineValuation = v.costMinor * BigInt(p.onHand);
        totalValuation += lineValuation;
        item.valuationMinor = lineValuation.toString();
        if (item.variant) {
          item.variant.costMinor = v.costMinor.toString();
        }
      }

      return item;
    });

    const summary: any = {
      totalPositions: positions.length,
      totalOnHandUnits,
    };
    if (canViewCosts) {
      summary.totalValuationMinor = totalValuation.toString();
    }

    return NextResponse.json({
      success: true,
      data: {
        items,
        summary,
      },
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
      err.message?.includes("LOCATION_SCOPE_DENIED") ||
      err.message?.includes("OWNER_SCOPE_DENIED")
        ? 403
        : 500;
    return NextResponse.json(
      { success: false, error: err.message },
      { status }
    );
  }
}
