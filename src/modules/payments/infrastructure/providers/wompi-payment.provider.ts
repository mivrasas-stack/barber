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
  PaymentSignatureInvalidError,
} from "../../domain/payment-errors";

export interface WompiConfig {
  publicKey: string;
  privateKey: string;
  integritySecret: string;
  eventsSecret: string;
  environment: "sandbox" | "production";
}

export class WompiPaymentProvider implements IPaymentProvider {
  readonly providerType: PaymentProviderType = "WOMPI";
  private readonly config: WompiConfig;
  private readonly baseUrl: string;

  constructor(config?: Partial<WompiConfig>) {
    this.config = {
      publicKey: config?.publicKey ?? process.env.WOMPI_PUBLIC_KEY ?? "pub_test_placeholder",
      privateKey: config?.privateKey ?? process.env.WOMPI_PRIVATE_KEY ?? "prv_test_placeholder",
      integritySecret: config?.integritySecret ?? process.env.WOMPI_INTEGRITY_SECRET ?? "integrity_secret_placeholder",
      eventsSecret: config?.eventsSecret ?? process.env.WOMPI_EVENTS_SECRET ?? "events_secret_placeholder",
      environment: (config?.environment ?? process.env.WOMPI_ENVIRONMENT ?? "sandbox") as "sandbox" | "production",
    };

    this.baseUrl =
      this.config.environment === "production"
        ? "https://production.wompi.co/v1"
        : "https://sandbox.wompi.co/v1";
  }

  calculateIntegritySignature(reference: string, amountInCents: bigint, currency: string): string {
    const raw = `${reference}${amountInCents}${currency}${this.config.integritySecret}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  async createPaymentIntent(
    params: CreatePaymentIntentParams
  ): Promise<CreatePaymentIntentResult> {
    const refPrefix = params.orderNumber ?? "SUB";
    const reference = `${refPrefix}-${params.intentId.slice(0, 8)}`;
    const integritySignature = this.calculateIntegritySignature(
      reference,
      params.amountMinor,
      params.currency
    );

    // Wompi Checkout Widget parameters
    return {
      providerReference: reference,
      publicKey: this.config.publicKey,
      integritySignature,
      checkoutUrl: `${this.baseUrl}/widget?public-key=${this.config.publicKey}&currency=${params.currency}&amount-in-cents=${params.amountMinor}&reference=${reference}&signature:integrity=${integritySignature}`,
      expirationTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      rawResponse: {
        reference,
        amountInCents: params.amountMinor.toString(),
        currency: params.currency,
      },
    };
  }

  async getPayment(params: GetPaymentParams): Promise<GetPaymentResult> {
    if (!params.providerTransactionId && !params.providerReference) {
      throw new Error("Must provide providerTransactionId or providerReference");
    }

    const endpoint = params.providerTransactionId
      ? `${this.baseUrl}/transactions/${params.providerTransactionId}`
      : `${this.baseUrl}/transactions?reference=${params.providerReference}`;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.privateKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new PaymentProviderUnavailableError(
          "WOMPI",
          `Status HTTP ${response.status}: ${response.statusText}`
        );
      }

      const body = await response.json();
      const tx = Array.isArray(body.data) ? body.data[0] : body.data;

      if (!tx) {
        throw new PaymentProviderRejectedError("Transaction not found in Wompi");
      }

      return {
        providerTransactionId: tx.id,
        providerReference: tx.reference,
        status: this.mapWompiStatus(tx.status),
        amountMinor: BigInt(tx.amount_in_cents),
        currency: tx.currency,
        paymentMethodType: this.mapPaymentMethod(tx.payment_method_type),
        finalizedAt: tx.finalized_at ? new Date(tx.finalized_at) : undefined,
        rawResponse: tx,
      };
    } catch (err: any) {
      if (err instanceof PaymentProviderUnavailableError || err instanceof PaymentProviderRejectedError) {
        throw err;
      }
      throw new PaymentProviderUnavailableError("WOMPI", err.message);
    }
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    const endpoint = `${this.baseUrl}/transactions/${params.providerTransactionId}/refund`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.privateKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount_in_cents: Number(params.amountMinor),
          reason: params.reason,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new PaymentProviderRejectedError(
          errorBody.error?.reason ?? `Wompi refund rejected with status ${response.status}`
        );
      }

      const body = await response.json();
      return {
        providerRefundId: body.data?.id ?? `wompi-ref-${Date.now()}`,
        status: body.data?.status === "APPROVED" ? "APPROVED" : "PENDING",
        rawResponse: body.data,
      };
    } catch (err: any) {
      if (err instanceof PaymentProviderRejectedError) throw err;
      throw new PaymentProviderUnavailableError("WOMPI", err.message);
    }
  }

  async verifyWebhook(params: VerifyWebhookParams): Promise<boolean> {
    try {
      const parsed = JSON.parse(params.rawBody);
      const signature = parsed.signature;

      if (!signature || !signature.properties || !signature.checksum) {
        return false;
      }

      // 1. Extract values of signature.properties from data object
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

      // 2. Concatenate values + timestamp + eventsSecret
      const timestamp = parsed.timestamp ?? signature.timestamp ?? "";
      const concatenated = `${values.join("")}${timestamp}${this.config.eventsSecret}`;

      // 3. Compute SHA256 and compare with signature.checksum
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
      throw new Error("Invalid Wompi webhook structure: missing data.transaction");
    }

    return {
      provider: "WOMPI",
      providerEventId: parsed.event_id ?? `${tx.id}-${parsed.timestamp ?? Date.now()}`,
      eventType: parsed.event ?? "transaction.updated",
      providerTransactionId: tx.id,
      providerReference: tx.reference,
      status: this.mapWompiStatus(tx.status),
      statusMessage: tx.status_message,
      amountMinor: BigInt(tx.amount_in_cents),
      currency: tx.currency,
      paymentMethodType: this.mapPaymentMethod(tx.payment_method_type),
      finalizedAt: tx.finalized_at ? new Date(tx.finalized_at) : undefined,
      timestamp: parsed.timestamp ?? Date.now(),
      rawPayload: parsed,
    };
  }

  private mapWompiStatus(status: string): ProviderPaymentStatus {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return "APPROVED";
      case "DECLINED":
        return "DECLINED";
      case "VOIDED":
        return "VOIDED";
      case "ERROR":
        return "ERROR";
      case "PENDING":
      default:
        return "PENDING";
    }
  }

  private mapPaymentMethod(methodType?: string): PaymentMethodType {
    switch (methodType?.toUpperCase()) {
      case "CARD":
        return "CARD";
      case "NEQUI":
        return "NEQUI";
      case "BANCOLOMBIA_TRANSFER":
      case "BANCOLOMBIA_COLLECT":
        return "BANCOLOMBIA_TRANSFER";
      case "PSE":
        return "PSE";
      default:
        return "CARD";
    }
  }
}
