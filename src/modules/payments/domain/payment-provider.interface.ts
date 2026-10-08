export type PaymentProviderType = "WOMPI" | "TEST";

export type PaymentMethodType =
  | "CARD"
  | "NEQUI"
  | "BANCOLOMBIA_TRANSFER"
  | "PSE"
  | "TEST_METHOD";

export type ProviderPaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "DECLINED"
  | "VOIDED"
  | "ERROR";

export interface CreatePaymentIntentParams {
  intentId: string;
  orderId: string;
  orderNumber: string;
  amountMinor: bigint;
  currency: string;
  collectorTenantId: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentIntentResult {
  providerReference: string;
  providerTransactionId?: string;
  checkoutUrl?: string;
  publicKey?: string;
  integritySignature?: string;
  expirationTime?: Date;
  rawResponse?: Record<string, unknown>;
}

export interface GetPaymentParams {
  providerTransactionId?: string;
  providerReference?: string;
}

export interface GetPaymentResult {
  providerTransactionId: string;
  providerReference: string;
  status: ProviderPaymentStatus;
  amountMinor: bigint;
  currency: string;
  paymentMethodType?: PaymentMethodType;
  finalizedAt?: Date;
  rawResponse?: Record<string, unknown>;
}

export interface RefundPaymentParams {
  providerTransactionId: string;
  amountMinor: bigint;
  currency: string;
  reason: string;
}

export interface RefundPaymentResult {
  providerRefundId: string;
  status: "APPROVED" | "PENDING" | "FAILED";
  rawResponse?: Record<string, unknown>;
}

export interface VerifyWebhookParams {
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface WebhookEventPayload {
  provider: PaymentProviderType;
  providerEventId: string;
  eventType: string;
  providerTransactionId: string;
  providerReference: string;
  status: ProviderPaymentStatus;
  statusMessage?: string;
  amountMinor: bigint;
  currency: string;
  paymentMethodType?: PaymentMethodType;
  finalizedAt?: Date;
  timestamp: number;
  rawPayload: Record<string, unknown>;
}

export interface IPaymentProvider {
  readonly providerType: PaymentProviderType;

  createPaymentIntent(
    params: CreatePaymentIntentParams
  ): Promise<CreatePaymentIntentResult>;

  getPayment(params: GetPaymentParams): Promise<GetPaymentResult>;

  refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult>;

  verifyWebhook(params: VerifyWebhookParams): Promise<boolean>;

  parseWebhook(params: VerifyWebhookParams): Promise<WebhookEventPayload>;
}
