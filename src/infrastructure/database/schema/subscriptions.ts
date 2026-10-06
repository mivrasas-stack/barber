import { pgTable, uuid, varchar, text, integer, bigint, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

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
    status: varchar("status", { length: 32 }).notNull().default("TRIALING"), // TRIALING, ACTIVE, PAST_DUE, SUSPENDED, CANCELLED, PENDING_PAYMENT
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tenant_sub_tenant_idx").on(table.tenantId),
    index("tenant_sub_status_idx").on(table.status),
  ]
);

export type SubscriptionPlanRow = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlanRow = typeof subscriptionPlans.$inferInsert;
export type TenantSubscriptionRow = typeof tenantSubscriptions.$inferSelect;
export type NewTenantSubscriptionRow = typeof tenantSubscriptions.$inferInsert;
