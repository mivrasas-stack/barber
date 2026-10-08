import { eq, and, sql, desc, lt } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  paymentIntents,
  paymentAttempts,
  paymentWebhookEvents,
  refunds,
  paymentReconciliations,
  inventoryReservations,
  PaymentIntentRow,
  PaymentAttemptRow,
  PaymentWebhookEventRow,
  RefundRow,
  PaymentReconciliationRow,
  InventoryReservationRow,
} from "@/infrastructure/database/schema/payments";
import {
  IPaymentRepository,
  ListPaymentsFilter,
} from "../domain/payment.repository.interface";
import { PaymentIntent, PaymentIntentStatus } from "../domain/payment-intent";
import { PaymentAttempt } from "../domain/payment-attempt";
import { PaymentWebhookEvent } from "../domain/payment-webhook-event";
import { Refund } from "../domain/refund";
import { PaymentReconciliation, ReconciliationStatus } from "../domain/payment-reconciliation";
import { InventoryReservation, InventoryReservationStatus } from "../domain/inventory-reservation";
import { PaymentProviderType } from "../domain/payment-provider.interface";

export class DrizzlePaymentRepository implements IPaymentRepository {
  private toIntentDomain(row: PaymentIntentRow): PaymentIntent {
    return new PaymentIntent({
      id: row.id,
      orderId: row.orderId,
      subscriptionInvoiceId: row.subscriptionInvoiceId,
      paymentPurpose: row.paymentPurpose as any,
      collectorTenantId: row.collectorTenantId,
      provider: row.provider as PaymentProviderType,
      amountMinor: BigInt(row.amountMinor),
      currency: row.currency,
      status: row.status as PaymentIntentStatus,
      providerReference: row.providerReference,
      providerTransactionId: row.providerTransactionId,
      paymentMethodType: row.paymentMethodType,
      idempotencyKeyHash: row.idempotencyKeyHash,
      expiresAt: row.expiresAt,
      metadata: row.metadata,
      createdByUserId: row.createdByUserId,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toAttemptDomain(row: PaymentAttemptRow): PaymentAttempt {
    return new PaymentAttempt({
      id: row.id,
      paymentIntentId: row.paymentIntentId,
      attemptNumber: row.attemptNumber,
      providerTransactionId: row.providerTransactionId,
      paymentMethodType: row.paymentMethodType,
      status: row.status as any,
      failureCode: row.failureCode,
      failureMessageSanitized: row.failureMessageSanitized,
      rawResponseSanitized: row.rawResponseSanitized,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    });
  }

  private toWebhookEventDomain(row: PaymentWebhookEventRow): PaymentWebhookEvent {
    return new PaymentWebhookEvent({
      id: row.id,
      provider: row.provider as PaymentProviderType,
      providerEventId: row.providerEventId,
      eventType: row.eventType,
      payloadHash: row.payloadHash,
      signatureValid: row.signatureValid,
      processingStatus: row.processingStatus as any,
      errorCode: row.errorCode,
      receivedAt: row.receivedAt,
      processedAt: row.processedAt,
    });
  }

  private toRefundDomain(row: RefundRow): Refund {
    return new Refund({
      id: row.id,
      paymentIntentId: row.paymentIntentId,
      orderId: row.orderId,
      collectorTenantId: row.collectorTenantId,
      orderReturnId: row.orderReturnId,
      amountMinor: BigInt(row.amountMinor),
      currency: row.currency,
      reason: row.reason,
      status: row.status as any,
      providerRefundId: row.providerRefundId,
      idempotencyKeyHash: row.idempotencyKeyHash,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    });
  }

  private toReconciliationDomain(row: PaymentReconciliationRow): PaymentReconciliation {
    return new PaymentReconciliation({
      id: row.id,
      paymentIntentId: row.paymentIntentId,
      provider: row.provider as PaymentProviderType,
      providerTransactionId: row.providerTransactionId,
      reconciliationStatus: row.reconciliationStatus as ReconciliationStatus,
      internalStatus: row.internalStatus,
      providerStatus: row.providerStatus,
      internalAmountMinor: BigInt(row.internalAmountMinor),
      providerAmountMinor: row.providerAmountMinor ? BigInt(row.providerAmountMinor) : null,
      discrepancyDetails: row.discrepancyDetails,
      reconciledByUserId: row.reconciledByUserId,
      createdAt: row.createdAt,
    });
  }

  private toReservationDomain(row: InventoryReservationRow): InventoryReservation {
    return new InventoryReservation({
      id: row.id,
      paymentIntentId: row.paymentIntentId,
      orderId: row.orderId,
      ownerTenantId: row.ownerTenantId,
      locationId: row.locationId,
      productVariantId: row.productVariantId,
      quantity: row.quantity,
      status: row.status as InventoryReservationStatus,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async savePaymentIntent(intent: PaymentIntent, tx?: any): Promise<PaymentIntent> {
    const client = tx ?? db;

    if (intent.id) {
      const [updated] = await client
        .update(paymentIntents)
        .set({
          status: intent.status,
          providerReference: intent.providerReference,
          providerTransactionId: intent.providerTransactionId,
          paymentMethodType: intent.paymentMethodType,
          completedAt: intent.completedAt,
          updatedAt: new Date(),
        })
        .where(eq(paymentIntents.id, intent.id))
        .returning();

      return this.toIntentDomain(updated);
    }

    const [inserted] = await client
      .insert(paymentIntents)
      .values({
        orderId: intent.orderId,
        subscriptionInvoiceId: intent.subscriptionInvoiceId,
        paymentPurpose: intent.paymentPurpose,
        collectorTenantId: intent.collectorTenantId,
        provider: intent.provider,
        amountMinor: intent.amountMinor,
        currency: intent.currency,
        status: intent.status,
        providerReference: intent.providerReference,
        providerTransactionId: intent.providerTransactionId,
        paymentMethodType: intent.paymentMethodType,
        idempotencyKeyHash: intent.idempotencyKeyHash,
        expiresAt: intent.expiresAt,
        metadata: intent.metadata,
        createdByUserId: intent.createdByUserId,
      })
      .returning();

    return this.toIntentDomain(inserted);
  }

  async findIntentById(id: string, tx?: any): Promise<PaymentIntent | null> {
    const client = tx ?? db;
    const [row] = await client
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, id))
      .limit(1);

    return row ? this.toIntentDomain(row) : null;
  }

  async findIntentByIdForUpdate(id: string, tx?: any): Promise<PaymentIntent | null> {
    const client = tx ?? db;
    const [row] = await client
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, id))
      .for("update")
      .limit(1);

    return row ? this.toIntentDomain(row) : null;
  }

  async findIntentByReference(
    provider: PaymentProviderType,
    reference: string,
    tx?: any
  ): Promise<PaymentIntent | null> {
    const client = tx ?? db;
    const [row] = await client
      .select()
      .from(paymentIntents)
      .where(
        and(
          eq(paymentIntents.provider, provider),
          eq(paymentIntents.providerReference, reference)
        )
      )
      .limit(1);

    return row ? this.toIntentDomain(row) : null;
  }

  async findIntentByTransactionId(
    provider: PaymentProviderType,
    transactionId: string,
    tx?: any
  ): Promise<PaymentIntent | null> {
    const client = tx ?? db;
    const [row] = await client
      .select()
      .from(paymentIntents)
      .where(
        and(
          eq(paymentIntents.provider, provider),
          eq(paymentIntents.providerTransactionId, transactionId)
        )
      )
      .limit(1);

    return row ? this.toIntentDomain(row) : null;
  }

  async findIntentByIdempotencyKeyHash(
    keyHash: string,
    tx?: any
  ): Promise<PaymentIntent | null> {
    const client = tx ?? db;
    const [row] = await client
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.idempotencyKeyHash, keyHash))
      .limit(1);

    return row ? this.toIntentDomain(row) : null;
  }

  async listIntents(filter: ListPaymentsFilter, tx?: any): Promise<PaymentIntent[]> {
    const client = tx ?? db;
    const conditions = [];

    if (filter.tenantId) {
      conditions.push(eq(paymentIntents.collectorTenantId, filter.tenantId));
    }
    if (filter.orderId) {
      conditions.push(eq(paymentIntents.orderId, filter.orderId));
    }
    if (filter.status) {
      conditions.push(eq(paymentIntents.status, filter.status));
    }
    if (filter.provider) {
      conditions.push(eq(paymentIntents.provider, filter.provider));
    }

    const rows = await client
      .select()
      .from(paymentIntents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(paymentIntents.createdAt))
      .limit(filter.limit ?? 50)
      .offset(filter.offset ?? 0);

    return rows.map((r: PaymentIntentRow) => this.toIntentDomain(r));
  }

  async savePaymentAttempt(attempt: PaymentAttempt, tx?: any): Promise<PaymentAttempt> {
    const client = tx ?? db;
    const [inserted] = await client
      .insert(paymentAttempts)
      .values({
        paymentIntentId: attempt.paymentIntentId,
        attemptNumber: attempt.attemptNumber,
        providerTransactionId: attempt.providerTransactionId,
        paymentMethodType: attempt.paymentMethodType,
        status: attempt.status,
        failureCode: attempt.failureCode,
        failureMessageSanitized: attempt.failureMessageSanitized,
        rawResponseSanitized: attempt.rawResponseSanitized,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
      })
      .returning();

    return this.toAttemptDomain(inserted);
  }

  async listAttemptsByIntentId(intentId: string, tx?: any): Promise<PaymentAttempt[]> {
    const client = tx ?? db;
    const rows = await client
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.paymentIntentId, intentId))
      .orderBy(paymentAttempts.attemptNumber);

    return rows.map((r: PaymentAttemptRow) => this.toAttemptDomain(r));
  }

  async saveWebhookEvent(
    event: PaymentWebhookEvent,
    tx?: any
  ): Promise<PaymentWebhookEvent> {
    const client = tx ?? db;

    if (event.id) {
      const [updated] = await client
        .update(paymentWebhookEvents)
        .set({
          processingStatus: event.processingStatus,
          errorCode: event.errorCode,
          processedAt: event.processedAt,
        })
        .where(eq(paymentWebhookEvents.id, event.id))
        .returning();

      return this.toWebhookEventDomain(updated);
    }

    const [inserted] = await client
      .insert(paymentWebhookEvents)
      .values({
        provider: event.provider,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        payloadHash: event.payloadHash,
        signatureValid: event.signatureValid,
        processingStatus: event.processingStatus,
        errorCode: event.errorCode,
        receivedAt: event.receivedAt,
        processedAt: event.processedAt,
      })
      .onConflictDoNothing()
      .returning();

    if (!inserted) {
      const existing = await this.findWebhookEvent(event.provider, event.providerEventId, client);
      return existing!;
    }

    return this.toWebhookEventDomain(inserted);
  }

  async findWebhookEvent(
    provider: PaymentProviderType,
    providerEventId: string,
    tx?: any
  ): Promise<PaymentWebhookEvent | null> {
    const client = tx ?? db;
    const [row] = await client
      .select()
      .from(paymentWebhookEvents)
      .where(
        and(
          eq(paymentWebhookEvents.provider, provider),
          eq(paymentWebhookEvents.providerEventId, providerEventId)
        )
      )
      .limit(1);

    return row ? this.toWebhookEventDomain(row) : null;
  }

  async saveRefund(refund: Refund, tx?: any): Promise<Refund> {
    const client = tx ?? db;

    if (refund.id) {
      const [updated] = await client
        .update(refunds)
        .set({
          status: refund.status,
          providerRefundId: refund.providerRefundId,
          completedAt: refund.completedAt,
        })
        .where(eq(refunds.id, refund.id))
        .returning();

      return this.toRefundDomain(updated);
    }

    const [inserted] = await client
      .insert(refunds)
      .values({
        paymentIntentId: refund.paymentIntentId,
        orderId: refund.orderId,
        collectorTenantId: refund.collectorTenantId,
        orderReturnId: refund.orderReturnId,
        amountMinor: refund.amountMinor,
        currency: refund.currency,
        reason: refund.reason,
        status: refund.status,
        providerRefundId: refund.providerRefundId,
        idempotencyKeyHash: refund.idempotencyKeyHash,
        createdByUserId: refund.createdByUserId,
      })
      .returning();

    return this.toRefundDomain(inserted);
  }

  async findRefundById(id: string, tx?: any): Promise<Refund | null> {
    const client = tx ?? db;
    const [row] = await client
      .select()
      .from(refunds)
      .where(eq(refunds.id, id))
      .limit(1);

    return row ? this.toRefundDomain(row) : null;
  }

  async listRefundsByPaymentId(paymentIntentId: string, tx?: any): Promise<Refund[]> {
    const client = tx ?? db;
    const rows = await client
      .select()
      .from(refunds)
      .where(eq(refunds.paymentIntentId, paymentIntentId))
      .orderBy(desc(refunds.createdAt));

    return rows.map((r: RefundRow) => this.toRefundDomain(r));
  }

  async listRefundsByOrderId(orderId: string, tx?: any): Promise<Refund[]> {
    const client = tx ?? db;
    const rows = await client
      .select()
      .from(refunds)
      .where(eq(refunds.orderId, orderId))
      .orderBy(desc(refunds.createdAt));

    return rows.map((r: RefundRow) => this.toRefundDomain(r));
  }

  async saveReconciliation(
    reconciliation: PaymentReconciliation,
    tx?: any
  ): Promise<PaymentReconciliation> {
    const client = tx ?? db;
    const [inserted] = await client
      .insert(paymentReconciliations)
      .values({
        paymentIntentId: reconciliation.paymentIntentId,
        provider: reconciliation.provider,
        providerTransactionId: reconciliation.providerTransactionId,
        reconciliationStatus: reconciliation.reconciliationStatus,
        internalStatus: reconciliation.internalStatus,
        providerStatus: reconciliation.providerStatus,
        internalAmountMinor: reconciliation.internalAmountMinor,
        providerAmountMinor: reconciliation.providerAmountMinor,
        discrepancyDetails: reconciliation.discrepancyDetails,
        reconciledByUserId: reconciliation.reconciledByUserId,
      })
      .returning();

    return this.toReconciliationDomain(inserted);
  }

  async listReconciliationsByPaymentId(
    paymentIntentId: string,
    tx?: any
  ): Promise<PaymentReconciliation[]> {
    const client = tx ?? db;
    const rows = await client
      .select()
      .from(paymentReconciliations)
      .where(eq(paymentReconciliations.paymentIntentId, paymentIntentId))
      .orderBy(desc(paymentReconciliations.createdAt));

    return rows.map((r: PaymentReconciliationRow) => this.toReconciliationDomain(r));
  }

  async saveReservation(
    reservation: InventoryReservation,
    tx?: any
  ): Promise<InventoryReservation> {
    const client = tx ?? db;

    if (reservation.id) {
      const [updated] = await client
        .update(inventoryReservations)
        .set({
          status: reservation.status,
          updatedAt: new Date(),
        })
        .where(eq(inventoryReservations.id, reservation.id))
        .returning();

      return this.toReservationDomain(updated);
    }

    const [inserted] = await client
      .insert(inventoryReservations)
      .values({
        paymentIntentId: reservation.paymentIntentId,
        orderId: reservation.orderId,
        ownerTenantId: reservation.ownerTenantId,
        locationId: reservation.locationId,
        productVariantId: reservation.productVariantId,
        quantity: reservation.quantity,
        status: reservation.status,
        expiresAt: reservation.expiresAt,
      })
      .returning();

    return this.toReservationDomain(inserted);
  }

  async listReservationsByPaymentIntent(
    paymentIntentId: string,
    tx?: any
  ): Promise<InventoryReservation[]> {
    const client = tx ?? db;
    const rows = await client
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.paymentIntentId, paymentIntentId));

    return rows.map((r: InventoryReservationRow) => this.toReservationDomain(r));
  }

  async listExpiredReservations(
    asOf: Date,
    tx?: any
  ): Promise<InventoryReservation[]> {
    const client = tx ?? db;
    const rows = await client
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.status, "ACTIVE"),
          lt(inventoryReservations.expiresAt, asOf)
        )
      );

    return rows.map((r: InventoryReservationRow) => this.toReservationDomain(r));
  }
}
