import crypto from "crypto";
import {
  IPaymentProvider,
  PaymentProviderType,
  CreatePaymentIntentParams,
  CreatePaymentIntentResult,
  GetPaymentParams,
  GetPaymentResult,
  RefundPaymentParams,
  RefundPaymentResult,
  VerifyWebhookParams,
  WebhookEventPayload,
  ProviderPaymentStatus,
  PaymentMethodType,
} from "../../domain/payment-provider.interface";
import {
  PaymentProviderUnavailableError,
  PaymentProviderRejectedError,
} from "../../domain/payment-errors";

export interface TestProviderBehavior {
  simulateOutcome?: "APPROVED" | "DECLINED" | "TIMEOUT_UNKNOWN" | "ERROR";
  simulateRefundOutcome?: "APPROVED" | "FAILED";
  secretKey?: string;
}

export class TestPaymentProvider implements IPaymentProvider {
  readonly providerType: PaymentProviderType = "TEST";
  private behavior: TestProviderBehavior;
  private recordedTransactions: Map<
    string,
    {
      id: string;
      reference: string;
      amountMinor: bigint;
      currency: string;
      status: ProviderPaymentStatus;
      paymentMethodType: PaymentMethodType;
    }
  > = new Map();

  constructor(behavior?: TestProviderBehavior) {
    this.behavior = {
      simulateOutcome: behavior?.simulateOutcome ?? "APPROVED",
      simulateRefundOutcome: behavior?.simulateRefundOutcome ?? "APPROVED",
      secretKey: behavior?.secretKey ?? "test_events_secret_12345",
    };
  }

  setBehavior(behavior: Partial<TestProviderBehavior>): void {
    this.behavior = { ...this.behavior, ...behavior };
  }

  calculateTestSignature(payloadString: string, timestamp: number): string {
    return crypto
      .createHash("sha256")
      .update(`${payloadString}${timestamp}${this.behavior.secretKey}`)
      .digest("hex");
  }

  createSignedWebhookPayload(params: {
    eventId: string;
    transactionId: string;
    reference: string;
    amountMinor: bigint;
    currency: string;
    status: ProviderPaymentStatus;
    paymentMethodType?: PaymentMethodType;
  }): { rawBody: string; headers: Record<string, string> } {
    const timestamp = Math.floor(Date.now() / 1000);
    const dataObj = {
      transaction: {
        id: params.transactionId,
        amount_in_cents: params.amountMinor.toString(),
        reference: params.reference,
        currency: params.currency,
        status: params.status,
        payment_method_type: params.paymentMethodType ?? "TEST_METHOD",
      },
    };

    const properties = [
      "transaction.id",
      "transaction.status",
      "transaction.amount_in_cents",
    ];
    const concatenated = `${params.transactionId}${params.status}${params.amountMinor.toString()}${timestamp}${this.behavior.secretKey}`;
    const checksum = crypto.createHash("sha256").update(concatenated).digest("hex");

    const payload = {
      event: "transaction.updated",
      event_id: params.eventId,
      data: dataObj,
      timestamp,
      signature: {
        properties,
        checksum,
      },
      environment: "test",
    };

    const rawBody = JSON.stringify(payload);
    return {
      rawBody,
      headers: {
        "x-event-checksum": checksum,
        "content-type": "application/json",
      },
    };
  }

  generateMockWebhook(params: {
    reference: string;
    transactionId: string;
    status: ProviderPaymentStatus;
    amountInCents: number;
    currency: string;
    paymentMethodType?: PaymentMethodType;
    eventId?: string;
  }): { rawBody: string; headers: Record<string, string> } {
    return this.createSignedWebhookPayload({
      eventId: params.eventId ?? `evt_${params.transactionId}_${Date.now()}`,
      transactionId: params.transactionId,
      reference: params.reference,
      amountMinor: BigInt(params.amountInCents),
      currency: params.currency,
      status: params.status,
      paymentMethodType: params.paymentMethodType,
    });
  }

  simulateTransactionState(
    reference: string,
    state: {
      status: ProviderPaymentStatus;
      transactionId?: string;
      amountInCents?: number;
      currency?: string;
      paymentMethodType?: PaymentMethodType;
    }
  ): void {
    const existing = this.recordedTransactions.get(reference);
    const txId = state.transactionId ?? existing?.id ?? `tx_${Date.now()}`;
    this.recordedTransactions.set(reference, {
      id: txId,
      reference,
      amountMinor: state.amountInCents !== undefined ? BigInt(state.amountInCents) : (existing?.amountMinor ?? 0n),
      currency: state.currency ?? existing?.currency ?? "COP",
      status: state.status,
      paymentMethodType: state.paymentMethodType ?? existing?.paymentMethodType ?? "CARD",
    });
  }

  async createPaymentIntent(
    params: CreatePaymentIntentParams
  ): Promise<CreatePaymentIntentResult> {
    const refPrefix = params.orderNumber ?? "SUB";
    const reference = `${refPrefix}-${params.intentId.slice(0, 8)}`;
    const txId = `tx_test_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;

    const status: ProviderPaymentStatus =
      this.behavior.simulateOutcome === "APPROVED"
        ? "APPROVED"
        : this.behavior.simulateOutcome === "DECLINED"
        ? "DECLINED"
        : this.behavior.simulateOutcome === "ERROR"
        ? "ERROR"
        : "PENDING";

    this.recordedTransactions.set(reference, {
      id: txId,
      reference,
      amountMinor: params.amountMinor,
      currency: params.currency,
      status,
      paymentMethodType: "TEST_METHOD",
    });

    if (this.behavior.simulateOutcome === "TIMEOUT_UNKNOWN") {
      throw new PaymentProviderUnavailableError(
        "TEST",
        "Connection timed out while contacting payment provider gateway (simulated unknown outcome)"
      );
    }

    return {
      providerReference: reference,
      providerTransactionId: txId,
      checkoutUrl: `http://localhost:3000/payment/test-checkout?ref=${reference}&amount=${params.amountMinor}`,
      publicKey: "pub_test_dummy",
      integritySignature: "dummy_integrity_sig",
      expirationTime: new Date(Date.now() + 30 * 60 * 1000),
      rawResponse: {
        reference,
        status,
        txId,
      },
    };
  }

  async getPayment(params: GetPaymentParams): Promise<GetPaymentResult> {
    let tx = Array.from(this.recordedTransactions.values()).find(
      (t) =>
        (params.providerTransactionId && t.id === params.providerTransactionId) ||
        (params.providerReference && t.reference === params.providerReference)
    );

    if (!tx && params.providerReference) {
      // Auto-generate for tests if queried by reference
      tx = {
        id: params.providerTransactionId ?? `tx_test_${Date.now()}`,
        reference: params.providerReference,
        amountMinor: 1000000n,
        currency: "COP",
        status: (this.behavior.simulateOutcome as ProviderPaymentStatus) ?? "APPROVED",
        paymentMethodType: "TEST_METHOD",
      };
      this.recordedTransactions.set(params.providerReference, tx);
    }

    if (!tx) {
      throw new PaymentProviderRejectedError("Transaction not found in Test Provider");
    }

    return {
      providerTransactionId: tx.id,
      providerReference: tx.reference,
      status: tx.status,
      amountMinor: tx.amountMinor,
      currency: tx.currency,
      paymentMethodType: tx.paymentMethodType,
      finalizedAt: new Date(),
      rawResponse: tx,
    };
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    if (this.behavior.simulateRefundOutcome === "FAILED") {
      throw new PaymentProviderRejectedError("Simulated refund failure from Test Provider");
    }

    return {
      providerRefundId: `ref_test_${Date.now()}`,
      status: "APPROVED",
      rawResponse: { refundAmount: params.amountMinor.toString(), status: "APPROVED" },
    };
  }

  async verifyWebhook(params: VerifyWebhookParams): Promise<boolean> {
    try {
      const headerSig =
        params.headers["x-test-signature"] ||
        params.headers["x-event-checksum"];
      if (headerSig && typeof headerSig === "string") {
        const parsed = JSON.parse(params.rawBody);
        const signature = parsed.signature || {};
        const data = parsed.data || {};
        const values: string[] = [];
        for (const propPath of signature.properties || [
          "transaction.id",
          "transaction.status",
          "transaction.amount_in_cents",
        ]) {
          const parts = propPath.split(".");
          let curr: any = data;
          for (const part of parts) {
            if (curr === undefined || curr === null) break;
            curr = curr[part];
          }
          values.push(curr !== undefined && curr !== null ? String(curr) : "");
        }
        const timestamp =
          params.headers["x-test-timestamp"] ??
          parsed.timestamp ??
          signature.timestamp ??
          "";
        const concatenated = `${values.join("")}${timestamp}${this.behavior.secretKey}`;
        const calculatedChecksum = crypto
          .createHash("sha256")
          .update(concatenated)
          .digest("hex");
        return calculatedChecksum === headerSig;
      }

      const parsed = JSON.parse(params.rawBody);
      const signature = parsed.signature;
      if (!signature || !signature.properties || !signature.checksum) {
        return false;
      }

      const data = parsed.data || {};
      const values: string[] = [];
      for (const propPath of signature.properties) {
        const parts = propPath.split(".");
        let curr: any = data;
        for (const part of parts) {
          if (curr === undefined || curr === null) break;
          curr = curr[part];
        }
        values.push(curr !== undefined && curr !== null ? String(curr) : "");
      }

      const timestamp = parsed.timestamp ?? signature.timestamp ?? "";
      const concatenated = `${values.join("")}${timestamp}${this.behavior.secretKey}`;

      const calculatedChecksum = crypto
        .createHash("sha256")
        .update(concatenated)
        .digest("hex");

      return calculatedChecksum === signature.checksum;
    } catch {
      return false;
    }
  }

  async parseWebhook(params: VerifyWebhookParams): Promise<WebhookEventPayload> {
    const parsed = JSON.parse(params.rawBody);
    const tx = parsed.data?.transaction;

    if (!tx) {
      throw new Error("Invalid Test Provider webhook structure: missing data.transaction");
    }

    return {
      provider: "TEST",
      providerEventId: parsed.event_id ?? `${tx.id}-${parsed.timestamp ?? Date.now()}`,
      eventType: parsed.event ?? "transaction.updated",
      providerTransactionId: tx.id,
      providerReference: tx.reference,
      status: tx.status as ProviderPaymentStatus,
      statusMessage: tx.status_message,
      amountMinor: BigInt(tx.amount_in_cents),
      currency: tx.currency,
      paymentMethodType: tx.payment_method_type as PaymentMethodType,
      finalizedAt: new Date(),
      timestamp: parsed.timestamp ?? Date.now(),
      rawPayload: parsed,
    };
  }
}
