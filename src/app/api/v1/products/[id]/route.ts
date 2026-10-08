import { NextRequest, NextResponse } from "next/server";
import { authorizeCommerceRequest } from "@/modules/commerce/infrastructure/commerce-auth";
import { DrizzleProductRepository } from "@/modules/commerce/infrastructure/drizzle-product.repository";
import { UpdateProductUseCase } from "@/modules/commerce/application/update-product.usecase";
import { ArchiveProductUseCase } from "@/modules/commerce/application/archive-product.usecase";
import { AppError } from "@/shared/errors/app-error";

const productRepo = new DrizzleProductRepository();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeCommerceRequest(req, {
      requiredModule: "commerce.products",
      requiredPermission: "products.read",
    });

    const { id } = await params;
    const product = await productRepo.findById(id);

    if (!product || product.ownerTenantId !== auth.actorOwnerTenantId) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const canViewCost = auth.canViewCosts();
    const serialized = {
      ...product,
      variants: product.variants.map((v) => {
        const item: any = {
          ...v,
          priceMinor: v.priceMinor.toString(),
        };
        if (canViewCost && v.costMinor !== undefined && v.costMinor !== null) {
          item.costMinor = v.costMinor.toString();
        } else {
          delete item.costMinor;
        }
        return item;
      }),
    };

    return NextResponse.json({ success: true, data: { product: serialized } });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 403 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeCommerceRequest(req, {
      requiredModule: "commerce.products",
      requiredPermission: "products.manage",
    });

    const { id } = await params;
    const existing = await productRepo.findById(id);
    if (!existing || existing.ownerTenantId !== auth.actorOwnerTenantId) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const updateProduct = new UpdateProductUseCase(productRepo);
    const updated = await updateProduct.execute({ ...body, id });

    return NextResponse.json({ success: true, data: { product: updated } });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeCommerceRequest(req, {
      requiredModule: "commerce.products",
      requiredPermission: "products.manage",
    });

    const { id } = await params;
    const existing = await productRepo.findById(id);
    if (!existing || existing.ownerTenantId !== auth.actorOwnerTenantId) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const archiveProduct = new ArchiveProductUseCase(productRepo);
    await archiveProduct.execute(id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}
