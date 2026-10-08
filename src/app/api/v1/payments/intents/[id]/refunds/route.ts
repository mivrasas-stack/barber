import { NextRequest, NextResponse } from "next/server";
import { authorizePaymentRequest } from "@/modules/payments/infrastructure/payment-auth";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { RequestRefundUseCase } from "@/modules/payments/application/request-refund.usecase";
import { AppError } from "@/shared/errors/app-error";

const paymentRepo = new DrizzlePaymentRepository();
const requestRefundUseCase = new RequestRefundUseCase(paymentRepo);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizePaymentRequest(req, {
      requiredModule: "payments.refunds",
      requiredPermission: "refunds.create",
    });

    const intent = await paymentRepo.findIntentById(id);
    if (!intent) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    auth.assertPaymentAccess(intent);

    const body = await req.json();

    if (!body.amountMinor) {
      return NextResponse.json(
        { error: "amountMinor is required" },
        { status: 400 }
      );
    }
    if (!body.reason) {
      return NextResponse.json(
        { error: "reason is required" },
        { status: 400 }
      );
    }

    const result = await requestRefundUseCase.execute({
      paymentIntentId: id,
      amountMinor: BigInt(body.amountMinor),
      reason: body.reason,
      orderReturnId: body.orderReturnId,
      idempotencyKey: body.idempotencyKey,
      actorUserId: auth.userId,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizePaymentRequest(req, {
      requiredModule: "payments.refunds",
      requiredPermission: "refunds.read",
    });

    const intent = await paymentRepo.findIntentById(id);
    if (!intent) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    auth.assertPaymentAccess(intent);

    const refunds = await paymentRepo.listRefundsByPaymentId(id);

    const serialized = refunds.map((r) => ({
      id: r.id,
      paymentIntentId: r.paymentIntentId,
      orderId: r.orderId,
      collectorTenantId: r.collectorTenantId,
      orderReturnId: r.orderReturnId,
      amountMinor: r.amountMinor.toString(),
      currency: r.currency,
      reason: r.reason,
      status: r.status,
      providerRefundId: r.providerRefundId,
      createdAt: r.createdAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
    }));

    return NextResponse.json({ data: serialized });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
