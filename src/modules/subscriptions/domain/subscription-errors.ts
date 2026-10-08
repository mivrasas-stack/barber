import { AppError } from "@/shared/errors/app-error";

export class SubscriptionNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "SUBSCRIPTION_NOT_FOUND";

  constructor(message = "Subscription not found") {
    super(message);
    this.name = "SubscriptionNotFoundError";
  }
}

export class SubscriptionSuspendedError extends AppError {
  readonly statusCode = 403;
  readonly code = "SUBSCRIPTION_SUSPENDED";

  constructor(message = "Subscription is suspended due to unpaid invoices") {
    super(message);
    this.name = "SubscriptionSuspendedError";
  }
}

export class SubscriptionAlreadyCancelledError extends AppError {
  readonly statusCode = 400;
  readonly code = "SUBSCRIPTION_ALREADY_CANCELLED";

  constructor(message = "Subscription is already cancelled") {
    super(message);
    this.name = "SubscriptionAlreadyCancelledError";
  }
}

export class InvalidSubscriptionTransitionError extends AppError {
  readonly statusCode = 400;
  readonly code = "INVALID_SUBSCRIPTION_TRANSITION";

  constructor(message = "Invalid subscription state transition") {
    super(message);
    this.name = "InvalidSubscriptionTransitionError";
  }
}

export class InvoiceNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "INVOICE_NOT_FOUND";

  constructor(message = "Subscription invoice not found") {
    super(message);
    this.name = "InvoiceNotFoundError";
  }
}

export class InvoiceAlreadyPaidError extends AppError {
  readonly statusCode = 400;
  readonly code = "INVOICE_ALREADY_PAID";

  constructor(message = "Subscription invoice is already paid") {
    super(message);
    this.name = "InvoiceAlreadyPaidError";
  }
}

export class InvoiceNotPayableError extends AppError {
  readonly statusCode = 400;
  readonly code = "INVOICE_NOT_PAYABLE";

  constructor(message = "Subscription invoice is not payable in its current status") {
    super(message);
    this.name = "InvoiceNotPayableError";
  }
}

export class BillingPeriodAlreadyInvoicedError extends AppError {
  readonly statusCode = 409;
  readonly code = "BILLING_PERIOD_ALREADY_INVOICED";

  constructor(message = "An invoice already exists for this subscription billing period") {
    super(message);
    this.name = "BillingPeriodAlreadyInvoicedError";
  }
}

export class PaymentMethodRequiredError extends AppError {
  readonly statusCode = 400;
  readonly code = "PAYMENT_METHOD_REQUIRED";

  constructor(message = "A valid payment method or online checkout is required") {
    super(message);
    this.name = "PaymentMethodRequiredError";
  }
}

export class PlanNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "PLAN_NOT_FOUND";

  constructor(message = "Subscription plan not found") {
    super(message);
    this.name = "PlanNotFoundError";
  }
}

export class PlanChangeNotAllowedError extends AppError {
  readonly statusCode = 400;
  readonly code = "PLAN_CHANGE_NOT_ALLOWED";

  constructor(message = "Plan change not allowed in current subscription status") {
    super(message);
    this.name = "PlanChangeNotAllowedError";
  }
}

export class TrialAlreadyExpiredError extends AppError {
  readonly statusCode = 400;
  readonly code = "TRIAL_ALREADY_EXPIRED";

  constructor(message = "Subscription trial has already ended") {
    super(message);
    this.name = "TrialAlreadyExpiredError";
  }
}

export class BillingRunConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = "BILLING_RUN_CONFLICT";

  constructor(message = "A billing cycle execution is already in progress") {
    super(message);
    this.name = "BillingRunConflictError";
  }
}
