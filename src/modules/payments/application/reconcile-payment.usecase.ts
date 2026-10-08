import { db } from "@/infrastructure/database/client";
import { IPaymentRepository } from "../domain/payment.repository.interface";
import { PaymentProviderFactory } from "../infrastructure/providers/provider-factory";
import { PaymentReconciliation, ReconciliationStatus } from "../domain/payment-reconciliation";
import { PaymentNotFoundError } from "../domain/payment-errors";
import { ProcessWebhookUseCase } from "./process-webhook.usecase";

export interface ReconcilePaymentInput {
  paymentIntentId: string;
  actorUserId?: string;
}

export interface ReconcilePaymentOutput {
  paymentIntentId: string;
  provider: string;
  reconciliationStatus: ReconciliationStatus;
  internalStatus: string;
  providerStatus?: string | null;
  internalAmountMinor: string;
  providerAmountMinor?: string | null;
  isResolved: boolean;
  message: string;
}

export class ReconcilePaymentUseCase {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(input: ReconcilePaymentInput): Promise<ReconcilePaymentOutput> {
    const intent = await this.paymentRepository.findIntentById(input.paymentIntentId);
    if (!intent) {
      throw new PaymentNotFoundError(input.paymentIntentId);
    }

    const provider = PaymentProviderFactory.getProvider(intent.provider);

    let providerResult: any;
    try {
      providerResult = await provider.getPayment({
        providerTransactionId: intent.providerTransactionId ?? undefined,
        providerReference: intent.providerReference ?? undefined,
      });
    } catch (err: any) {
      // Missing on provider
      const rec = new PaymentReconciliation({
        paymentIntentId: intent.id!,
        provider: intent.provider,
        providerTransactionId: intent.providerTransactionId,
        reconciliationStatus: "MISSING_PROVIDER_PAYMENT",
        internalStatus: intent.status,
        internalAmountMinor: intent.amountMinor,
        discrepancyDetails: { error: err.message },
        reconciledByUserId: input.actorUserId,
      });
      await this.paymentRepository.saveReconciliation(rec);

      return {
        paymentIntentId: intent.id!,
        provider: intent.provider,
        reconciliationStatus: "MISSING_PROVIDER_PAYMENT",
        internalStatus: intent.status,
        internalAmountMinor: intent.amountMinor.toString(),
        isResolved: false,
        message: `Provider has no record of payment: ${err.message}`,
      };
    }

    // Compare
    let status: ReconciliationStatus = "MATCHED";
    let message = "Payment state matches provider records";

    const internalApproved = intent.status === "SUCCEEDED";
    const providerApproved = providerResult.status === "APPROVED";

    if (internalApproved !== providerApproved) {
      status = "STATUS_MISMATCH";
      message = `Internal status (${intent.status}) differs from provider status (${providerResult.status})`;
    }

    if (intent.amountMinor !== providerResult.amountMinor) {
      status = "AMOUNT_MISMATCH";
      message = `Internal amount (${intent.amountMinor}) differs from provider amount (${providerResult.amountMinor})`;
    }

    // Persist reconciliation audit
    const rec = new PaymentReconciliation({
      paymentIntentId: intent.id!,
      provider: intent.provider,
      providerTransactionId: providerResult.providerTransactionId,
      reconciliationStatus: status,
      internalStatus: intent.status,
      providerStatus: providerResult.status,
      internalAmountMinor: intent.amountMinor,
      discrepancyDetails:
        status !== "MATCHED"
          ? {
              providerStatus: providerResult.status,
              providerAmountMinor: providerResult.amountMinor?.toString(),
              providerTransactionId: providerResult.providerTransactionId,
            }
          : null,
      reconciledByUserId: input.actorUserId,
    });
    await this.paymentRepository.saveReconciliation(rec);

    // If internal was PENDING / PROCESSING, but provider was APPROVED -> Resolve unknown outcome!
    let isResolved = false;
    if (intent.status !== "SUCCEEDED" && providerResult.status === "APPROVED") {
      const webhookUseCase = new ProcessWebhookUseCase(this.paymentRepository);
      // Simulate/Trigger verified processing to update state idempotently
      if (intent.provider === "TEST") {
        const testProv = PaymentProviderFactory.getTestProvider();
        const payload = testProv.createSignedWebhookPayload({
          eventId: `rec-resolve-${Date.now()}`,
          transactionId: providerResult.providerTransactionId,
          reference: providerResult.providerReference,
          amountMinor: providerResult.amountMinor,
          currency: providerResult.currency,
          status: "APPROVED",
        });
        await webhookUseCase.execute({
          providerType: "TEST",
          rawBody: payload.rawBody,
          headers: payload.headers,
        });
        isResolved = true;
        message = "Unknown outcome successfully recovered and resolved to SUCCEEDED";
      }
    }

    return {
      paymentIntentId: intent.id!,
      provider: intent.provider,
      reconciliationStatus: status,
      internalStatus: intent.status,
      providerStatus: providerResult.status,
      internalAmountMinor: intent.amountMinor.toString(),
      providerAmountMinor: providerResult.amountMinor?.toString(),
      isResolved,
      message,
    };
  }
}
