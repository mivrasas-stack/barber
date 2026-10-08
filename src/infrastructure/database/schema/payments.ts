import {
  pgTable,
  uuid,
  varchar,
  char,
  bigint,
  integer,
  boolean,
  timestamp,
  jsonb,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { orders } from "./commerce";
import { locations } from "./locations";
import { productVariants } from "./commerce";
import { subscriptionInvoices } from "./subscriptions";

// 1. Payment Intents (Authoritative representation of a customer or subscription payment lifecycle)
export const paymentIntents = pgTable(
  "payment_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .references(() => orders.id, { onDelete: "cascade" }),
    subscriptionInvoiceId: uuid("subscription_invoice_id")
      .references(() => subscriptionInvoices.id, { onDelete: "cascade" }),
    paymentPurpose: varchar("payment_purpose", { length: 32 }).notNull().default("ORDER_PAYMENT"), // ORDER_PAYMENT, SUBSCRIPTION_INVOICE
    collectorTenantId: uuid("collector_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(), // WOMPI, TEST
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("COP"),
    status: varchar("status", { length: 32 }).notNull().default("CREATED"), // CREATED, PENDING, PROCESSING, SUCCEEDED, FAILED, CANCELLED, EXPIRED
    providerReference: varchar("provider_reference", { length: 128 }),
    providerTransactionId: varchar("provider_transaction_id", { length: 128 }),
    paymentMethodType: varchar("payment_method_type", { length: 64 }), // CARD, NEQUI, BANCOLOMBIA_TRANSFER, PSE, TEST_METHOD
    idempotencyKeyHash: varchar("idempotency_key_hash", { length: 64 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_payment_intents_order").on(table.orderId),
    index("idx_payment_intents_sub_invoice").on(table.subscriptionInvoiceId),
    index("idx_payment_intents_collector_created").on(table.collectorTenantId, table.createdAt),
    index("idx_payment_intents_provider_ref").on(table.provider, table.providerReference),
    uniqueIndex("idx_payment_intents_provider_tx").on(table.provider, table.providerTransactionId),
    index("idx_payment_intents_idempotency").on(table.idempotencyKeyHash),
    index("idx_payment_intents_status").on(table.status),
    index("idx_payment_intents_purpose").on(table.paymentPurpose),
  ]
);

// 2. Payment Attempts (Audit trail of execution attempts per payment intent)
export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntents.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull().default(1),
    providerTransactionId: varchar("provider_transaction_id", { length: 128 }),
    paymentMethodType: varchar("payment_method_type", { length: 64 }),
    status: varchar("status", { length: 32 }).notNull().default("INITIATED"), // INITIATED, PROCESSING, APPROVED, DECLINED, ERROR, TIMED_OUT
    failureCode: varchar("failure_code", { length: 64 }),
    failureMessageSanitized: varchar("failure_message_sanitized", { length: 255 }),
    rawResponseSanitized: jsonb("raw_response_sanitized").$type<Record<string, unknown>>(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_payment_attempts_intent").on(table.paymentIntentId),
    index("idx_payment_attempts_tx").on(table.providerTransactionId),
  ]
);

// 3. Payment Webhook Events (Immutable log for replay protection and verification)
export const paymentWebhookEvents = pgTable(
  "payment_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { length: 32 }).notNull(),
    providerEventId: varchar("provider_event_id", { length: 128 }).notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
    signatureValid: boolean("signature_valid").notNull().default(false),
    processingStatus: varchar("processing_status", { length: 32 }).notNull().default("RECEIVED"), // RECEIVED, PROCESSED, IGNORED_DUPLICATE, FAILED
    errorCode: varchar("error_code", { length: 64 }),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("idx_webhook_events_provider_event_id").on(table.provider, table.providerEventId),
    index("idx_webhook_events_received").on(table.receivedAt),
  ]
);

// 4. Refunds (Formal financial and gateway refund tracking)
export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntents.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    collectorTenantId: uuid("collector_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    orderReturnId: text("order_return_id"),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("COP"),
    reason: varchar("reason", { length: 255 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("REQUESTED"), // REQUESTED, PROCESSING, SUCCEEDED, FAILED, CANCELLED
    providerRefundId: varchar("provider_refund_id", { length: 128 }),
    idempotencyKeyHash: varchar("idempotency_key_hash", { length: 64 }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_refunds_intent").on(table.paymentIntentId, table.createdAt),
    index("idx_refunds_order").on(table.orderId, table.createdAt),
    index("idx_refunds_status").on(table.status),
  ]
);

// 5. Payment Reconciliations (Audit discrepancy detection between provider and internal state)
export const paymentReconciliations = pgTable(
  "payment_reconciliations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntents.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    providerTransactionId: varchar("provider_transaction_id", { length: 128 }),
    reconciliationStatus: varchar("reconciliation_status", { length: 32 }).notNull(), // MATCHED, STATUS_MISMATCH, AMOUNT_MISMATCH, MISSING_PROVIDER_PAYMENT, MISSING_INTERNAL_PAYMENT, REFUND_MISMATCH
    internalStatus: varchar("status_internal", { length: 32 }).notNull(),
    providerStatus: varchar("status_provider", { length: 32 }),
    internalAmountMinor: bigint("internal_amount_minor", { mode: "bigint" }).notNull(),
    providerAmountMinor: bigint("provider_amount_minor", { mode: "bigint" }),
    discrepancyDetails: jsonb("discrepancy_details").$type<Record<string, unknown>>(),
    reconciledByUserId: uuid("reconciled_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_reconciliations_intent").on(table.paymentIntentId, table.createdAt),
    index("idx_reconciliations_status").on(table.reconciliationStatus),
  ]
);

// 6. Inventory Reservations (Temporary hold of stock during asynchronous payment checkout)
export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntents.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    ownerTenantId: uuid("owner_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    productVariantId: uuid("product_variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"), // ACTIVE, CONVERTED, RELEASED, EXPIRED
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_inv_res_intent").on(table.paymentIntentId),
    index("idx_inv_res_order").on(table.orderId),
    index("idx_inv_res_status_expires").on(table.status, table.expiresAt),
  ]
);

// Inferred Types
export type PaymentIntentRow = typeof paymentIntents.$inferSelect;
export type NewPaymentIntentRow = typeof paymentIntents.$inferInsert;

export type PaymentAttemptRow = typeof paymentAttempts.$inferSelect;
export type NewPaymentAttemptRow = typeof paymentAttempts.$inferInsert;

export type PaymentWebhookEventRow = typeof paymentWebhookEvents.$inferSelect;
export type NewPaymentWebhookEventRow = typeof paymentWebhookEvents.$inferInsert;

export type RefundRow = typeof refunds.$inferSelect;
export type NewRefundRow = typeof refunds.$inferInsert;

export type PaymentReconciliationRow = typeof paymentReconciliations.$inferSelect;
export type NewPaymentReconciliationRow = typeof paymentReconciliations.$inferInsert;

export type InventoryReservationRow = typeof inventoryReservations.$inferSelect;
export type NewInventoryReservationRow = typeof inventoryReservations.$inferInsert;
