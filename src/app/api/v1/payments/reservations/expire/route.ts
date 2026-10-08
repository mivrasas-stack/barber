import { NextRequest, NextResponse } from "next/server";
import { authorizePaymentRequest } from "@/modules/payments/infrastructure/payment-auth";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { ExpireReservationsUseCase } from "@/modules/payments/application/expire-reservations.usecase";
import { AppError } from "@/shared/errors/app-error";

const paymentRepo = new DrizzlePaymentRepository();
const expireReservationsUseCase = new ExpireReservationsUseCase(paymentRepo);

export async function POST(req: NextRequest) {
  try {
    await authorizePaymentRequest(req, {
      requiredModule: "payments.core",
      requiredPermission: "payments.create",
    });

    const result = await expireReservationsUseCase.execute(new Date());

    return NextResponse.json({
      success: true,
      data: result,
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
