import {
  AppError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "@/shared/errors/app-error";

export class PaymentNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super(`Payment intent '${identifier}' not found`);
    this.name = "PaymentNotFoundError";
  }
}

export class PaymentAlreadySucceededError extends ConflictError {
  constructor(paymentId: string) {
    super(`PAYMENT_ALREADY_SUCCEEDED: Payment intent '${paymentId}' has already succeeded`);
    this.name = "PaymentAlreadySucceededError";
  }
}

export class PaymentAmountExceedsOrderBalanceError extends ConflictError {
  constructor(amountMinor: bigint, balanceMinor: bigint) {
    super(
      `PAYMENT_AMOUNT_EXCEEDS_ORDER_BALANCE: Requested payment amount (${amountMinor}) exceeds remaining order balance (${balanceMinor})`
    );
    this.name = "PaymentAmountExceedsOrderBalanceError";
  }
}

export class PaymentProviderUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly code = "PAYMENT_PROVIDER_UNAVAILABLE";

  constructor(provider: string, details?: string) {
    super(
      `PAYMENT_PROVIDER_UNAVAILABLE: Provider '${provider}' is currently unreachable: ${details ?? "Unknown error"}`
    );
    this.name = "PaymentProviderUnavailableError";
  }
}

export class PaymentProviderRejectedError extends ConflictError {
  constructor(reason: string, code?: string) {
    super(`PAYMENT_PROVIDER_REJECTED: Provider rejected payment: ${reason} (code: ${code ?? "N/A"})`);
    this.name = "PaymentProviderRejectedError";
  }
}

export class PaymentSignatureInvalidError extends ForbiddenError {
  constructor(details?: string) {
    super(`PAYMENT_SIGNATURE_INVALID: Webhook signature verification failed: ${details ?? "Invalid checksum"}`);
    this.name = "PaymentSignatureInvalidError";
  }
}

export class PaymentEventAlreadyProcessedError extends ConflictError {
  constructor(provider: string, eventId: string) {
    super(`PAYMENT_EVENT_ALREADY_PROCESSED: Event '${eventId}' from '${provider}' has already been processed`);
    this.name = "PaymentEventAlreadyProcessedError";
  }
}

export class PaymentStateTransitionInvalidError extends ConflictError {
  constructor(fromStatus: string, toStatus: string) {
    super(`PAYMENT_STATE_TRANSITION_INVALID: Cannot transition payment from '${fromStatus}' to '${toStatus}'`);
    this.name = "PaymentStateTransitionInvalidError";
  }
}

export class PaymentReservationExpiredError extends ConflictError {
  constructor(reservationId: string) {
    super(`PAYMENT_RESERVATION_EXPIRED: Inventory reservation '${reservationId}' has expired`);
    this.name = "PaymentReservationExpiredError";
  }
}

export class RefundNotAllowedError extends ConflictError {
  constructor(reason: string) {
    super(`REFUND_NOT_ALLOWED: ${reason}`);
    this.name = "RefundNotAllowedError";
  }
}

export class RefundExceedsCapturedAmountError extends ConflictError {
  constructor(requestedMinor: bigint, refundableMinor: bigint) {
    super(
      `REFUND_EXCEEDS_CAPTURED_AMOUNT: Requested refund (${requestedMinor}) exceeds refundable amount (${refundableMinor})`
    );
    this.name = "RefundExceedsCapturedAmountError";
  }
}

export class RefundAlreadyProcessedError extends ConflictError {
  constructor(refundId: string) {
    super(`REFUND_ALREADY_PROCESSED: Refund '${refundId}' has already been processed`);
    this.name = "RefundAlreadyProcessedError";
  }
}

export class PaymentReconciliationMismatchError extends AppError {
  readonly statusCode = 409;
  readonly code = "PAYMENT_RECONCILIATION_MISMATCH";

  constructor(reason: string) {
    super(`PAYMENT_RECONCILIATION_MISMATCH: ${reason}`);
    this.name = "PaymentReconciliationMismatchError";
  }
}
