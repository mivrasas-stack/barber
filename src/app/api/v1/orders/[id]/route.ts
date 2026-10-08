import { NextRequest, NextResponse } from "next/server";
import { authorizeCommerceRequest } from "@/modules/commerce/infrastructure/commerce-auth";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order.repository";
import { AppError } from "@/shared/errors/app-error";

const orderRepo = new DrizzleOrderRepository();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeCommerceRequest(req, {
      requiredModule: "commerce.orders",
      requiredPermission: "orders.read",
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

    const serializedOrder: any = {
      ...order,
      subtotalMinor: order.subtotalMinor.toString(),
      discountTotalMinor: order.discountTotalMinor.toString(),
      taxTotalMinor: order.taxTotalMinor.toString(),
      tipTotalMinor: order.tipTotalMinor.toString(),
      grandTotalMinor: order.grandTotalMinor.toString(),
      items: order.items.map((i) => {
        const item: any = {
          ...i,
          unitPriceMinor: i.unitPriceMinor.toString(),
          discountMinor: i.discountMinor.toString(),
          taxMinor: i.taxMinor.toString(),
          lineTotalMinor: i.lineTotalMinor.toString(),
        };
        if (auth.canViewCosts() && i.unitCostMinor) {
          item.unitCostMinor = i.unitCostMinor.toString();
        } else {
          delete item.unitCostMinor;
        }
        return item;
      }),
      tenders: order.tenders.map((t) => ({
        ...t,
        amountMinor: t.amountMinor.toString(),
        amountReceivedMinor: t.amountReceivedMinor
          ? t.amountReceivedMinor.toString()
          : null,
        changeDueMinor: t.changeDueMinor ? t.changeDueMinor.toString() : null,
      })),
    };

    if (auth.isAffiliated) {
      delete serializedOrder.customerUserId;
      delete serializedOrder.customerEmailSnapshot;
      delete serializedOrder.customerPhoneSnapshot;
    }

    return NextResponse.json({
      success: true,
      data: { order: serializedOrder },
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
      err.message?.includes("SELLER_SCOPE_DENIED")
        ? 403
        : 400;
    return NextResponse.json(
      { success: false, error: err.message },
      { status }
    );
  }
}
