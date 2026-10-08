import { NextRequest, NextResponse } from "next/server";
import { authorizePaymentRequest } from "@/modules/payments/infrastructure/payment-auth";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { ReconcilePaymentUseCase } from "@/modules/payments/application/reconcile-payment.usecase";
import { AppError } from "@/shared/errors/app-error";

const paymentRepo = new DrizzlePaymentRepository();
const reconcilePaymentUseCase = new ReconcilePaymentUseCase(paymentRepo);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizePaymentRequest(req, {
      requiredModule: "payments.core",
      requiredPermission: "payments.reconcile",
    });

    const intent = await paymentRepo.findIntentById(id);
    if (!intent) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    auth.assertPaymentAccess(intent);

    const result = await reconcilePaymentUseCase.execute({
      paymentIntentId: id,
      actorUserId: auth.userId,
    });

    return NextResponse.json({ data: result });
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
