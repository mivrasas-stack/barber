export type RefundStatus =
  | "REQUESTED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export interface RefundProps {
  id?: string;
  paymentIntentId: string;
  orderId: string;
  collectorTenantId: string;
  orderReturnId?: string | null;
  amountMinor: bigint;
  currency?: string;
  reason: string;
  status?: RefundStatus;
  providerRefundId?: string | null;
  idempotencyKeyHash?: string | null;
  createdByUserId?: string | null;
  createdAt?: Date;
  completedAt?: Date | null;
}

export class Refund {
  readonly id?: string;
  readonly paymentIntentId: string;
  readonly orderId: string;
  readonly collectorTenantId: string;
  readonly orderReturnId?: string | null;
  readonly amountMinor: bigint;
  readonly currency: string;
  readonly reason: string;
  private _status: RefundStatus;
  private _providerRefundId?: string | null;
  readonly idempotencyKeyHash?: string | null;
  readonly createdByUserId?: string | null;
  readonly createdAt: Date;
  private _completedAt?: Date | null;

  constructor(props: RefundProps) {
    this.id = props.id;
    this.paymentIntentId = props.paymentIntentId;
    this.orderId = props.orderId;
    this.collectorTenantId = props.collectorTenantId;
    this.orderReturnId = props.orderReturnId;
    this.amountMinor = props.amountMinor;
    this.currency = props.currency ?? "COP";
    this.reason = props.reason;
    this._status = props.status ?? "REQUESTED";
    this._providerRefundId = props.providerRefundId;
    this.idempotencyKeyHash = props.idempotencyKeyHash;
    this.createdByUserId = props.createdByUserId;
    this.createdAt = props.createdAt ?? new Date();
    this._completedAt = props.completedAt;
  }

  get status(): RefundStatus {
    return this._status;
  }

  get providerRefundId(): string | null | undefined {
    return this._providerRefundId;
  }

  get completedAt(): Date | null | undefined {
    return this._completedAt;
  }

  markSucceeded(providerRefundId?: string, completedAt: Date = new Date()): void {
    this._status = "SUCCEEDED";
    if (providerRefundId) this._providerRefundId = providerRefundId;
    this._completedAt = completedAt;
  }

  markFailed(providerRefundId?: string): void {
    this._status = "FAILED";
    if (providerRefundId) this._providerRefundId = providerRefundId;
    this._completedAt = new Date();
  }

  markCancelled(): void {
    this._status = "CANCELLED";
    this._completedAt = new Date();
  }
}
