import { NextRequest, NextResponse } from "next/server";
import { authorizeCommerceRequest } from "@/modules/commerce/infrastructure/commerce-auth";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order.repository";
import { CancelOrderUseCase } from "@/modules/orders/application/cancel-order.usecase";
import { AppError } from "@/shared/errors/app-error";

const orderRepo = new DrizzleOrderRepository();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeCommerceRequest(req, {
      requiredModule: "commerce.orders",
      requiredPermission: "orders.manage",
    });

    const { id } = await params;
    const order = await orderRepo.findById(id);

    if (!order || order.contextTenantId !== auth.tenantId) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    auth.assertOrderAccess(order);

    const cancelUseCase = new CancelOrderUseCase(orderRepo);
    const cancelled = await cancelUseCase.execute(id);

    return NextResponse.json({
      success: true,
      data: {
        order: {
          ...cancelled,
          subtotalMinor: cancelled.subtotalMinor.toString(),
          discountTotalMinor: cancelled.discountTotalMinor.toString(),
          taxTotalMinor: cancelled.taxTotalMinor.toString(),
          tipTotalMinor: cancelled.tipTotalMinor.toString(),
          grandTotalMinor: cancelled.grandTotalMinor.toString(),
        },
      },
    });
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
