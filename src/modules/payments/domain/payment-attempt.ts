export type PaymentAttemptStatus =
  | "INITIATED"
  | "PROCESSING"
  | "APPROVED"
  | "DECLINED"
  | "ERROR"
  | "TIMED_OUT";

export interface PaymentAttemptProps {
  id?: string;
  paymentIntentId: string;
  attemptNumber?: number;
  providerTransactionId?: string | null;
  paymentMethodType?: string | null;
  status?: PaymentAttemptStatus;
  failureCode?: string | null;
  failureMessageSanitized?: string | null;
  rawResponseSanitized?: Record<string, unknown> | null;
  startedAt?: Date;
  completedAt?: Date | null;
}

export class PaymentAttempt {
  readonly id?: string;
  readonly paymentIntentId: string;
  readonly attemptNumber: number;
  readonly providerTransactionId?: string | null;
  readonly paymentMethodType?: string | null;
  readonly status: PaymentAttemptStatus;
  readonly failureCode?: string | null;
  readonly failureMessageSanitized?: string | null;
  readonly rawResponseSanitized?: Record<string, unknown> | null;
  readonly startedAt: Date;
  readonly completedAt?: Date | null;

  constructor(props: PaymentAttemptProps) {
    this.id = props.id;
    this.paymentIntentId = props.paymentIntentId;
    this.attemptNumber = props.attemptNumber ?? 1;
    this.providerTransactionId = props.providerTransactionId;
    this.paymentMethodType = props.paymentMethodType;
    this.status = props.status ?? "INITIATED";
    this.failureCode = props.failureCode;
    this.failureMessageSanitized = props.failureMessageSanitized;
    this.rawResponseSanitized = props.rawResponseSanitized;
    this.startedAt = props.startedAt ?? new Date();
    this.completedAt = props.completedAt;
  }
}
