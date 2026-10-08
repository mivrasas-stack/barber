import { NextRequest, NextResponse } from "next/server";
import { authorizePaymentRequest } from "@/modules/payments/infrastructure/payment-auth";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { CancelPaymentIntentUseCase } from "@/modules/payments/application/cancel-payment-intent.usecase";
import { AppError } from "@/shared/errors/app-error";

const paymentRepo = new DrizzlePaymentRepository();
const cancelPaymentIntentUseCase = new CancelPaymentIntentUseCase(paymentRepo);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizePaymentRequest(req, {
      requiredModule: "payments.core",
      requiredPermission: "payments.create",
    });

    await cancelPaymentIntentUseCase.execute(id, auth.tenantId);

    return NextResponse.json({
      success: true,
      message: "Payment intent canceled and reserved inventory released",
    });
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
