import { NextRequest, NextResponse } from "next/server";
import { authorizePaymentRequest } from "@/modules/payments/infrastructure/payment-auth";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { GetPaymentUseCase } from "@/modules/payments/application/get-payment.usecase";
import { AppError } from "@/shared/errors/app-error";

const paymentRepo = new DrizzlePaymentRepository();
const getPaymentUseCase = new GetPaymentUseCase(paymentRepo);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizePaymentRequest(req, {
      requiredModule: "payments.core",
      requiredPermission: "payments.read",
    });

    const result = await getPaymentUseCase.execute(id, auth.tenantId);

    const serialized = {
      intent: {
        id: result.intent.id,
        orderId: result.intent.orderId,
        orderNumber: result.orderNumber,
        collectorTenantId: result.intent.collectorTenantId,
        provider: result.intent.provider,
        amountMinor: result.intent.amountMinor.toString(),
        currency: result.intent.currency,
        status: result.intent.status,
        providerReference: result.intent.providerReference,
        providerTransactionId: result.intent.providerTransactionId,
        paymentMethodType: result.intent.paymentMethodType,
        expiresAt: result.intent.expiresAt?.toISOString() ?? null,
        createdAt: result.intent.createdAt?.toISOString() ?? null,
        updatedAt: result.intent.updatedAt?.toISOString() ?? null,
      },
      attempts: result.attempts.map((a) => ({
        id: a.id,
        attemptNumber: a.attemptNumber,
        providerTransactionId: a.providerTransactionId,
        paymentMethodType: a.paymentMethodType,
        status: a.status,
        failureCode: a.failureCode,
        failureMessageSanitized: a.failureMessageSanitized,
        startedAt: a.startedAt.toISOString(),
        completedAt: a.completedAt?.toISOString() ?? null,
      })),
      refunds: result.refunds.map((r) => ({
        id: r.id,
        amountMinor: r.amountMinor.toString(),
        currency: r.currency,
        status: r.status,
        reason: r.reason,
        providerRefundId: r.providerRefundId,
        createdAt: r.createdAt?.toISOString() ?? null,
        completedAt: r.completedAt?.toISOString() ?? null,
      })),
      reservations: result.reservations.map((res) => ({
        id: res.id,
        locationId: res.locationId,
        productVariantId: res.productVariantId,
        quantity: res.quantity,
        status: res.status,
        expiresAt: res.expiresAt.toISOString(),
      })),
    };

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
