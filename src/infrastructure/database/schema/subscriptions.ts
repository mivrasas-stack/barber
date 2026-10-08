import { pgTable, uuid, varchar, text, integer, bigint, boolean, timestamp, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull().unique(), // e.g. SOLO_STARTER, SOLO_PRO, SOLO_ELITE, BUSINESS_SCALE
    name: varchar("name", { length: 255 }).notNull(),
    audience: varchar("audience", { length: 32 }).notNull().default("SOLO_PROFESSIONAL"), // BUSINESS, SOLO_PROFESSIONAL, ALL
    description: text("description"),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"), // ACTIVE, ARCHIVED
    billingPeriod: varchar("billing_period", { length: 32 }).notNull().default("MONTHLY"), // MONTHLY, YEARLY
    priceMinor: bigint("price_minor", { mode: "number" }),
    currency: varchar("currency", { length: 3 }).notNull().default("COP"),
    trialDays: integer("trial_days").notNull().default(14),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sub_plans_code_idx").on(table.code),
    index("sub_plans_audience_idx").on(table.audience),
  ]
);

export const tenantSubscriptions = pgTable(
  "tenant_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 32 }).notNull().default("TRIALING"), // TRIALING, ACTIVE, PAST_DUE, GRACE_PERIOD, SUSPENDED, CANCELLED, PENDING_PAYMENT
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    pastDueAt: timestamp("past_due_at", { withTimezone: true }),
    graceEndsAt: timestamp("grace_ends_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    pendingPlanId: uuid("pending_plan_id").references(() => subscriptionPlans.id, { onDelete: "set null" }),
    pendingPlanEffectiveAt: timestamp("pending_plan_effective_at", { withTimezone: true }),
    paymentMethodToken: varchar("payment_method_token", { length: 255 }),
    paymentMethodBrand: varchar("payment_method_brand", { length: 50 }),
    paymentMethodLast4: varchar("payment_method_last4", { length: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tenant_sub_tenant_idx").on(table.tenantId),
    index("tenant_sub_status_idx").on(table.status),
    index("tenant_sub_period_end_idx").on(table.status, table.currentPeriodEnd),
  ]
);

export const subscriptionInvoices = pgTable(
  "subscription_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => tenantSubscriptions.id, { onDelete: "cascade" }),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
    status: varchar("status", { length: 32 }).notNull().default("OPEN"), // DRAFT, OPEN, PAID, VOID, UNCOLLECTIBLE
    currency: varchar("currency", { length: 3 }).notNull().default("COP"),
    subtotalMinor: bigint("subtotal_minor", { mode: "bigint" }).notNull(),
    discountMinor: bigint("discount_minor", { mode: "bigint" }).notNull().default(sql`0`),
    taxMinor: bigint("tax_minor", { mode: "bigint" }).notNull().default(sql`0`),
    totalMinor: bigint("total_minor", { mode: "bigint" }).notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    planCodeSnapshot: varchar("plan_code_snapshot", { length: 50 }).notNull(),
    planNameSnapshot: varchar("plan_name_snapshot", { length: 255 }).notNull(),
    billingPeriodSnapshot: varchar("billing_period_snapshot", { length: 32 }).notNull().default("MONTHLY"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sub_inv_tenant_idx").on(table.tenantId),
    index("sub_inv_sub_idx").on(table.subscriptionId),
    index("sub_inv_status_due_idx").on(table.status, table.dueAt),
    uniqueIndex("sub_inv_sub_period_unique_idx").on(table.subscriptionId, table.periodStart, table.periodEnd),
  ]
);

export const subscriptionInvoiceLines = pgTable(
  "subscription_invoice_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => subscriptionInvoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceMinor: bigint("unit_price_minor", { mode: "bigint" }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    lineType: varchar("line_type", { length: 32 }).notNull().default("PLAN_CHARGE"), // PLAN_CHARGE, DISCOUNT, TAX, ADJUSTMENT
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sub_inv_lines_inv_idx").on(table.invoiceId),
  ]
);

export const subscriptionStatusHistory = pgTable(
  "subscription_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => tenantSubscriptions.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    fromStatus: varchar("from_status", { length: 32 }),
    toStatus: varchar("to_status", { length: 32 }).notNull(),
    reason: text("reason"),
    source: varchar("source", { length: 64 }).notNull().default("SYSTEM"), // SYSTEM, BILLING_RUN, PAYMENT_WEBHOOK, ADMIN_OVERRIDE, USER_ACTION
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sub_history_sub_created_idx").on(table.subscriptionId, table.createdAt),
    index("sub_history_tenant_idx").on(table.tenantId),
  ]
);

export const billingRuns = pgTable(
  "billing_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: varchar("status", { length: 32 }).notNull().default("RUNNING"), // RUNNING, COMPLETED, FAILED
    tenantsProcessed: integer("tenants_processed").notNull().default(0),
    invoicesCreated: integer("invoices_created").notNull().default(0),
    paymentsAttempted: integer("payments_attempted").notNull().default(0),
    errorsCount: integer("errors_count").notNull().default(0),
    summary: jsonb("summary").$type<Record<string, unknown>>(),
    triggeredByUserId: uuid("triggered_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("billing_runs_status_idx").on(table.status),
    index("billing_runs_started_idx").on(table.startedAt),
  ]
);

export type SubscriptionPlanRow = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlanRow = typeof subscriptionPlans.$inferInsert;
export type TenantSubscriptionRow = typeof tenantSubscriptions.$inferSelect;
export type NewTenantSubscriptionRow = typeof tenantSubscriptions.$inferInsert;
export type SubscriptionInvoiceRow = typeof subscriptionInvoices.$inferSelect;
export type NewSubscriptionInvoiceRow = typeof subscriptionInvoices.$inferInsert;
export type SubscriptionInvoiceLineRow = typeof subscriptionInvoiceLines.$inferSelect;
export type NewSubscriptionInvoiceLineRow = typeof subscriptionInvoiceLines.$inferInsert;
export type SubscriptionStatusHistoryRow = typeof subscriptionStatusHistory.$inferSelect;
export type NewSubscriptionStatusHistoryRow = typeof subscriptionStatusHistory.$inferInsert;
export type BillingRunRow = typeof billingRuns.$inferSelect;
export type NewBillingRunRow = typeof billingRuns.$inferInsert;
