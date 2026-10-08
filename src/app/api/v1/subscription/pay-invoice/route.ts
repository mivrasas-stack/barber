import { NextRequest, NextResponse } from "next/server";
import { authorizeSubscriptionRequest } from "@/modules/subscriptions/infrastructure/subscription-auth";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { AttemptSubscriptionPaymentUseCase } from "@/modules/subscriptions/application/attempt-subscription-payment.usecase";
import { AppError } from "@/shared/errors/app-error";

const subscriptionRepo = new DrizzleSubscriptionRepository();
const paymentRepo = new DrizzlePaymentRepository();
const attemptPaymentUseCase = new AttemptSubscriptionPaymentUseCase(subscriptionRepo, paymentRepo);

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeSubscriptionRequest(req, { requireOwnerOrAdmin: true });
    const body = await req.json();

    if (!body.invoiceId) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    const providerType = body.provider || "TEST";

    const result = await attemptPaymentUseCase.execute({
      invoiceId: body.invoiceId,
      collectorTenantId: auth.tenantId,
      providerType,
      idempotencyKey: body.idempotencyKey,
      actorUserId: auth.userId,
      customerEmail: body.customerEmail || auth.session.email,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      paymentMethodToken: body.paymentMethodToken,
      redirectUrl: body.redirectUrl,
    });

    return NextResponse.json(
      {
        data: result,
      },
      { status: 200 }
    );
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
