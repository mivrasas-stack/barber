import { NextRequest, NextResponse } from "next/server";
import { authorizePaymentRequest } from "@/modules/payments/infrastructure/payment-auth";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { CreatePaymentIntentUseCase } from "@/modules/payments/application/create-payment-intent.usecase";
import { AppError } from "@/shared/errors/app-error";
import { checkRateLimit } from "@/infrastructure/security";

const paymentRepo = new DrizzlePaymentRepository();
const createPaymentIntentUseCase = new CreatePaymentIntentUseCase(paymentRepo);

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizePaymentRequest(req, {
      requiredModule: "payments.core",
      requiredPermission: "payments.create",
    });

    const rateLimitKey = `${auth.tenantId}:${auth.userId}`;
    const rateLimit = await checkRateLimit("payment.intent", rateLimitKey);
    if (!rateLimit.allowed && rateLimit.response) {
      return rateLimit.response;
    }

    const body = await req.json();

    if (!body.orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    const providerType = body.provider || "TEST";

    const result = await createPaymentIntentUseCase.execute({
      orderId: body.orderId,
      collectorTenantId: auth.tenantId,
      providerType,
      amountMinor: body.amountMinor !== undefined ? BigInt(body.amountMinor) : undefined,
      paymentMethodType: body.paymentMethodType,
      idempotencyKey: body.idempotencyKey,
      actorUserId: auth.userId,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      redirectUrl: body.redirectUrl,
    });

    return NextResponse.json(
      {
        data: result,
      },
      { status: 201 }
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

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizePaymentRequest(req, {
      requiredModule: "payments.core",
      requiredPermission: "payments.read",
    });

    const orderId = req.nextUrl.searchParams.get("orderId") || undefined;
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const provider = req.nextUrl.searchParams.get("provider") || undefined;
    const limit = Number(req.nextUrl.searchParams.get("limit") || "50");
    const offset = Number(req.nextUrl.searchParams.get("offset") || "0");

    const intents = await paymentRepo.listIntents({
      tenantId: auth.tenantId,
      orderId,
      status,
      provider,
      limit,
      offset,
    });

    const serialized = intents.map((i) => ({
      id: i.id,
      orderId: i.orderId,
      collectorTenantId: i.collectorTenantId,
      provider: i.provider,
      amountMinor: i.amountMinor.toString(),
      currency: i.currency,
      status: i.status,
      providerReference: i.providerReference,
      providerTransactionId: i.providerTransactionId,
      paymentMethodType: i.paymentMethodType,
      expiresAt: i.expiresAt?.toISOString() ?? null,
      createdAt: i.createdAt?.toISOString() ?? null,
      updatedAt: i.updatedAt?.toISOString() ?? null,
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
