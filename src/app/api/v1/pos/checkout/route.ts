import { NextRequest, NextResponse } from "next/server";
import { authorizeCommerceRequest } from "@/modules/commerce/infrastructure/commerce-auth";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order.repository";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { CompleteOrderUseCase } from "@/modules/pos/application/complete-order.usecase";
import { AppError } from "@/shared/errors/app-error";

const orderRepo = new DrizzleOrderRepository();
const inventoryRepo = new DrizzleInventoryRepository();
const financeRepo = new DrizzleFinanceRepository();

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeCommerceRequest(req, {
      requiredModule: "pos.checkout",
      requiredPermission: "pos.checkout",
    });

    const body = await req.json();
    const idempotencyKey =
      req.headers.get("idempotency-key") || body.idempotencyKey || undefined;

    const completeOrderUseCase = new CompleteOrderUseCase(
      orderRepo,
      inventoryRepo,
      financeRepo
    );

    const completedOrder = await completeOrderUseCase.execute({
      orderId: body.orderId,
      tenders: body.tenders.map((t: any) => ({
        method: t.method,
        amountMinor: BigInt(t.amountMinor),
        amountReceivedMinor:
          t.amountReceivedMinor !== undefined && t.amountReceivedMinor !== null
            ? BigInt(t.amountReceivedMinor)
            : null,
        reference: t.reference || null,
      })),
      actorUserId: auth.userId,
      idempotencyKey,
      notes: body.notes,
    });

    const serializedOrder: any = {
      ...completedOrder,
      subtotalMinor: completedOrder.subtotalMinor.toString(),
      discountTotalMinor: completedOrder.discountTotalMinor.toString(),
      taxTotalMinor: completedOrder.taxTotalMinor.toString(),
      tipTotalMinor: completedOrder.tipTotalMinor.toString(),
      grandTotalMinor: completedOrder.grandTotalMinor.toString(),
      items: completedOrder.items.map((i) => {
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
      tenders: completedOrder.tenders.map((t) => ({
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
      err.message?.includes("MODULE_NOT_ENTITLED") ||
      err.message?.includes("SELLER_SCOPE_DENIED")
        ? 403
        : 400;
    return NextResponse.json(
      { success: false, error: err.message },
      { status }
    );
  }
}
