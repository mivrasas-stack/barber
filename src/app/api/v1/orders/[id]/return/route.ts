import { NextRequest, NextResponse } from "next/server";
import { authorizeCommerceRequest } from "@/modules/commerce/infrastructure/commerce-auth";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order.repository";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { ReturnOrderUseCase } from "@/modules/pos/application/return-order.usecase";
import { AppError } from "@/shared/errors/app-error";

const orderRepo = new DrizzleOrderRepository();
const inventoryRepo = new DrizzleInventoryRepository();
const financeRepo = new DrizzleFinanceRepository();

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
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || "Customer return/refund";

    const order = await orderRepo.findById(id);
    if (!order || order.contextTenantId !== auth.tenantId) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    auth.assertOrderAccess(order);

    const returnUseCase = new ReturnOrderUseCase(
      orderRepo,
      inventoryRepo,
      financeRepo
    );

    const returnedOrder = await returnUseCase.execute({
      orderId: id,
      reason,
      actorUserId: auth.userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        order: {
          ...returnedOrder,
          subtotalMinor: returnedOrder.subtotalMinor.toString(),
          discountTotalMinor: returnedOrder.discountTotalMinor.toString(),
          taxTotalMinor: returnedOrder.taxTotalMinor.toString(),
          tipTotalMinor: returnedOrder.tipTotalMinor.toString(),
          grandTotalMinor: returnedOrder.grandTotalMinor.toString(),
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
