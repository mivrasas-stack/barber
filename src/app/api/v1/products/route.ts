import { NextRequest, NextResponse } from "next/server";
import { authorizeCommerceRequest } from "@/modules/commerce/infrastructure/commerce-auth";
import { DrizzleProductRepository } from "@/modules/commerce/infrastructure/drizzle-product.repository";
import { CreateProductUseCase } from "@/modules/commerce/application/create-product.usecase";
import { AppError } from "@/shared/errors/app-error";

const productRepo = new DrizzleProductRepository();

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeCommerceRequest(req, {
      requiredModule: "commerce.products",
      requiredPermission: "products.read",
    });

    const categoryId = req.nextUrl.searchParams.get("categoryId") || undefined;
    const search = req.nextUrl.searchParams.get("search") || undefined;
    const status = req.nextUrl.searchParams.get("status") || "ACTIVE";

    const products = await productRepo.findProductsByOwner(
      auth.actorOwnerTenantId,
      { categoryId, search, status }
    );

    const canViewCost = auth.canViewCosts();

    const serializedProducts = products.map((p) => ({
      ...p,
      variants: p.variants.map((v) => {
        const variantData: any = {
          id: v.id,
          productId: v.productId,
          sku: v.sku,
          barcode: v.barcode,
          name: v.name,
          priceMinor: v.priceMinor.toString(),
          currency: v.currency,
          status: v.status,
          trackInventory: v.trackInventory,
          reorderPoint: v.reorderPoint,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        };
        if (canViewCost && v.costMinor !== undefined && v.costMinor !== null) {
          variantData.costMinor = v.costMinor.toString();
        }
        return variantData;
      }),
    }));

    return NextResponse.json({
      success: true,
      data: { products: serializedProducts },
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

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeCommerceRequest(req, {
      requiredModule: "commerce.products",
      requiredPermission: "products.manage",
    });

    const body = await req.json();
    const createProduct = new CreateProductUseCase(productRepo);

    const product = await createProduct.execute({
      ...body,
      ownerTenantId: auth.actorOwnerTenantId,
      variants: body.variants?.map((v: any) => ({
        ...v,
        priceMinor: BigInt(v.priceMinor),
        costMinor:
          v.costMinor !== undefined && v.costMinor !== null
            ? BigInt(v.costMinor)
            : null,
      })),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          product: {
            ...product,
            variants: product.variants.map((v) => ({
              ...v,
              priceMinor: v.priceMinor.toString(),
              costMinor: v.costMinor ? v.costMinor.toString() : null,
            })),
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
      err.message?.includes("MODULE_NOT_ENTITLED") ||
      err.message?.includes("AFFILIATION_REQUIRED")
        ? 403
        : 400;
    return NextResponse.json(
      { success: false, error: err.message },
      { status }
    );
  }
}
