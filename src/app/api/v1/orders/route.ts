import { NextRequest, NextResponse } from "next/server";
import { authorizeCommerceRequest } from "@/modules/commerce/infrastructure/commerce-auth";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order.repository";
import { DrizzleProductRepository } from "@/modules/commerce/infrastructure/drizzle-product.repository";
import { CreateDraftOrderUseCase } from "@/modules/orders/application/create-draft-order.usecase";
import { AppError } from "@/shared/errors/app-error";

const orderRepo = new DrizzleOrderRepository();
const productRepo = new DrizzleProductRepository();

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeCommerceRequest(req, {
      requiredModule: "commerce.orders",
      requiredPermission: "orders.read",
    });

    const locationId = req.nextUrl.searchParams.get("locationId") || undefined;
    const status = (req.nextUrl.searchParams.get("status") as any) || undefined;
    const limit = Number(req.nextUrl.searchParams.get("limit") || "50");
    const offset = Number(req.nextUrl.searchParams.get("offset") || "0");

    const orders = await orderRepo.findByContext(auth.tenantId, {
      locationId,
      status,
      limit,
      offset,
    });

    const serializedOrders = orders.map((o) => {
      let filteredOrder: any = {
        ...o,
        subtotalMinor: o.subtotalMinor.toString(),
        discountTotalMinor: o.discountTotalMinor.toString(),
        taxTotalMinor: o.taxTotalMinor.toString(),
        tipTotalMinor: o.tipTotalMinor.toString(),
        grandTotalMinor: o.grandTotalMinor.toString(),
        items: o.items.map((i) => {
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
        tenders: o.tenders.map((t) => ({
          ...t,
          amountMinor: t.amountMinor.toString(),
          amountReceivedMinor: t.amountReceivedMinor
            ? t.amountReceivedMinor.toString()
            : null,
          changeDueMinor: t.changeDueMinor ? t.changeDueMinor.toString() : null,
        })),
      };

      if (auth.isAffiliated) {
        delete filteredOrder.customerUserId;
        delete filteredOrder.customerEmailSnapshot;
        delete filteredOrder.customerPhoneSnapshot;
      }

      return filteredOrder;
    });

    return NextResponse.json({
      success: true,
      data: { orders: serializedOrders },
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
      err.message?.includes("AFFILIATION_REQUIRED")
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
      requiredModule: "commerce.orders",
      requiredPermission: "orders.manage",
    });

    const body = await req.json();

    if (body.locationId) {
      auth.assertLocationAccess(body.locationId);
    }

    const allowedSellerTenantIds = await auth.getAllowedSellerTenantIds(
      body.locationId
    );

    const createOrder = new CreateDraftOrderUseCase(orderRepo, productRepo);
    const order = await createOrder.execute({
      ...body,
      contextTenantId: auth.tenantId,
      createdByUserId: auth.userId,
      allowedSellerTenantIds,
      items: body.items?.map((item: any) => ({
        ...item,
        unitPriceMinor:
          item.unitPriceMinor !== undefined
            ? BigInt(item.unitPriceMinor)
            : undefined,
        unitCostMinor:
          item.unitCostMinor !== undefined && item.unitCostMinor !== null
            ? BigInt(item.unitCostMinor)
            : null,
        discountMinor:
          item.discountMinor !== undefined
            ? BigInt(item.discountMinor)
            : undefined,
        taxMinor:
          item.taxMinor !== undefined ? BigInt(item.taxMinor) : undefined,
      })),
    });

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
    };

    if (auth.isAffiliated) {
      delete serializedOrder.customerUserId;
      delete serializedOrder.customerEmailSnapshot;
      delete serializedOrder.customerPhoneSnapshot;
    }

    return NextResponse.json(
      { success: true, data: { order: serializedOrder } },
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
      err.message?.includes("SELLER_SCOPE_DENIED") ||
      err.message?.includes("LOCATION_SCOPE_DENIED")
        ? 403
        : 400;
    return NextResponse.json(
      { success: false, error: err.message },
      { status }
    );
  }
}
