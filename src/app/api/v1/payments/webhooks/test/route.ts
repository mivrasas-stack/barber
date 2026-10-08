import { NextRequest, NextResponse } from "next/server";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { ProcessWebhookUseCase } from "@/modules/payments/application/process-webhook.usecase";
import { PaymentSignatureInvalidError } from "@/modules/payments/domain/payment-errors";

const paymentRepo = new DrizzlePaymentRepository();
const processWebhookUseCase = new ProcessWebhookUseCase(paymentRepo);

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Endpoint not available in production" }, { status: 404 });
  }

  try {
    const rawBody = await req.text();
    const headers: Record<string, string | string[] | undefined> = {};

    req.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const result = await processWebhookUseCase.execute({
      providerType: "TEST",
      rawBody,
      headers,
    });

    return NextResponse.json({
      received: true,
      status: result.status,
      message: result.message,
      eventId: result.providerEventId,
    });
  } catch (err: any) {
    if (err instanceof PaymentSignatureInvalidError) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    console.error("[Webhook:Test] Processing error:", err);
    return NextResponse.json(
      { error: err.message || "Webhook processing failed" },
      { status: 400 }
    );
  }
}
