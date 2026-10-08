import { PaymentIntent } from "./payment-intent";
import { PaymentAttempt } from "./payment-attempt";
import { PaymentWebhookEvent } from "./payment-webhook-event";
import { Refund } from "./refund";
import { PaymentReconciliation } from "./payment-reconciliation";
import { InventoryReservation } from "./inventory-reservation";
import { PaymentProviderType } from "./payment-provider.interface";

export interface ListPaymentsFilter {
  tenantId?: string;
  orderId?: string;
  status?: string;
  provider?: string;
  limit?: number;
  offset?: number;
}

export interface IPaymentRepository {
  // Payment Intents
  savePaymentIntent(intent: PaymentIntent, tx?: any): Promise<PaymentIntent>;
  findIntentById(id: string, tx?: any): Promise<PaymentIntent | null>;
  findIntentByIdForUpdate(id: string, tx?: any): Promise<PaymentIntent | null>;
  findIntentByReference(
    provider: PaymentProviderType,
    reference: string,
    tx?: any
  ): Promise<PaymentIntent | null>;
  findIntentByTransactionId(
    provider: PaymentProviderType,
    transactionId: string,
    tx?: any
  ): Promise<PaymentIntent | null>;
  findIntentByIdempotencyKeyHash(
    keyHash: string,
    tx?: any
  ): Promise<PaymentIntent | null>;
  listIntents(filter: ListPaymentsFilter, tx?: any): Promise<PaymentIntent[]>;

  // Payment Attempts
  savePaymentAttempt(attempt: PaymentAttempt, tx?: any): Promise<PaymentAttempt>;
  listAttemptsByIntentId(intentId: string, tx?: any): Promise<PaymentAttempt[]>;

  // Webhooks
  saveWebhookEvent(
    event: PaymentWebhookEvent,
    tx?: any
  ): Promise<PaymentWebhookEvent>;
  findWebhookEvent(
    provider: PaymentProviderType,
    providerEventId: string,
    tx?: any
  ): Promise<PaymentWebhookEvent | null>;

  // Refunds
  saveRefund(refund: Refund, tx?: any): Promise<Refund>;
  findRefundById(id: string, tx?: any): Promise<Refund | null>;
  listRefundsByPaymentId(paymentIntentId: string, tx?: any): Promise<Refund[]>;
  listRefundsByOrderId(orderId: string, tx?: any): Promise<Refund[]>;

  // Reconciliations
  saveReconciliation(
    reconciliation: PaymentReconciliation,
    tx?: any
  ): Promise<PaymentReconciliation>;
  listReconciliationsByPaymentId(
    paymentIntentId: string,
    tx?: any
  ): Promise<PaymentReconciliation[]>;

  // Reservations
  saveReservation(
    reservation: InventoryReservation,
    tx?: any
  ): Promise<InventoryReservation>;
  listReservationsByPaymentIntent(
    paymentIntentId: string,
    tx?: any
  ): Promise<InventoryReservation[]>;
  listExpiredReservations(
    asOf: Date,
    tx?: any
  ): Promise<InventoryReservation[]>;
}
