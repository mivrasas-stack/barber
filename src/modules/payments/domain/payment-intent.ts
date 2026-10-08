import { PaymentProviderType, PaymentMethodType } from "./payment-provider.interface";
import { PaymentStateTransitionInvalidError } from "./payment-errors";

export type PaymentIntentStatus =
  | "CREATED"
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

export interface PaymentIntentProps {
  id?: string;
  orderId: string;
  collectorTenantId: string;
  provider: PaymentProviderType;
  amountMinor: bigint;
  currency?: string;
  status?: PaymentIntentStatus;
  providerReference?: string | null;
  providerTransactionId?: string | null;
  paymentMethodType?: PaymentMethodType | string | null;
  idempotencyKeyHash?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdByUserId?: string | null;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PaymentIntent {
  readonly id?: string;
  readonly orderId: string;
  readonly collectorTenantId: string;
  readonly provider: PaymentProviderType;
  readonly amountMinor: bigint;
  readonly currency: string;
  private _status: PaymentIntentStatus;
  private _providerReference?: string | null;
  private _providerTransactionId?: string | null;
  private _paymentMethodType?: PaymentMethodType | string | null;
  readonly idempotencyKeyHash?: string | null;
  readonly expiresAt?: Date | null;
  readonly metadata?: Record<string, unknown> | null;
  readonly createdByUserId?: string | null;
  private _completedAt?: Date | null;
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: PaymentIntentProps) {
    this.id = props.id;
    this.orderId = props.orderId;
    this.collectorTenantId = props.collectorTenantId;
    this.provider = props.provider;
    this.amountMinor = props.amountMinor;
    this.currency = props.currency ?? "COP";
    this._status = props.status ?? "CREATED";
    this._providerReference = props.providerReference;
    this._providerTransactionId = props.providerTransactionId;
    this._paymentMethodType = props.paymentMethodType;
    this.idempotencyKeyHash = props.idempotencyKeyHash;
    this.expiresAt = props.expiresAt;
    this.metadata = props.metadata;
    this.createdByUserId = props.createdByUserId;
    this._completedAt = props.completedAt;
    this.createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get status(): PaymentIntentStatus {
    return this._status;
  }

  get providerReference(): string | null | undefined {
    return this._providerReference;
  }

  get providerTransactionId(): string | null | undefined {
    return this._providerTransactionId;
  }

  get paymentMethodType(): PaymentMethodType | string | null | undefined {
    return this._paymentMethodType;
  }

  get completedAt(): Date | null | undefined {
    return this._completedAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  setProviderReference(ref: string): void {
    this._providerReference = ref;
    this._updatedAt = new Date();
  }

  markProcessing(txId?: string, method?: string): void {
    if (this._status === "SUCCEEDED") {
      throw new PaymentStateTransitionInvalidError(this._status, "PROCESSING");
    }
    this._status = "PROCESSING";
    if (txId) this._providerTransactionId = txId;
    if (method) this._paymentMethodType = method;
    this._updatedAt = new Date();
  }

  markSucceeded(txId: string, method?: string, completedAt: Date = new Date()): void {
    if (this._status === "SUCCEEDED") return; // idempotent
    if (this._status === "CANCELLED" || this._status === "EXPIRED") {
      // Out of order transition exception handled in use case or allowed if within tolerance
    }
    this._status = "SUCCEEDED";
    this._providerTransactionId = txId;
    if (method) this._paymentMethodType = method;
    this._completedAt = completedAt;
    this._updatedAt = new Date();
  }

  markFailed(txId?: string): void {
    if (this._status === "SUCCEEDED") {
      throw new PaymentStateTransitionInvalidError(this._status, "FAILED");
    }
    this._status = "FAILED";
    if (txId) this._providerTransactionId = txId;
    this._updatedAt = new Date();
  }

  markCancelled(): void {
    if (this._status === "SUCCEEDED") {
      throw new PaymentStateTransitionInvalidError(this._status, "CANCELLED");
    }
    this._status = "CANCELLED";
    this._updatedAt = new Date();
  }

  markCanceled(): void {
    this.markCancelled();
  }

  markExpired(): void {
    if (this._status === "SUCCEEDED") {
      throw new PaymentStateTransitionInvalidError(this._status, "EXPIRED");
    }
    this._status = "EXPIRED";
    this._updatedAt = new Date();
  }
}
