import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  integer,
  jsonb,
  timestamp,
  index,
  text,
} from "drizzle-orm/pg-core";

export const OUTBOX_STATUSES = [
  "PENDING",
  "PROCESSING",
  "FAILED",
  "PUBLISHED",
  "DEAD_LETTER",
] as const;

export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().unique().defaultRandom(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    eventVersion: integer("event_version").notNull().default(1),
    tenantId: uuid("tenant_id").notNull(),
    locationId: uuid("location_id"),
    aggregateId: varchar("aggregate_id", { length: 100 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    payload: jsonb("payload").notNull(),

    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(10),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),

    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: varchar("locked_by", { length: 128 }),
    lockExpiresAt: timestamp("lock_expires_at", { withTimezone: true }),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    lastError: text("last_error"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("outbox_status_occurred_idx").on(table.status, table.occurredAt),
    index("outbox_tenant_id_idx").on(table.tenantId),
    index("outbox_ready_claim_idx")
      .on(table.nextAttemptAt, table.occurredAt)
      .where(sql`${table.status} in ('PENDING', 'FAILED')`),
    index("outbox_expired_lease_idx")
      .on(table.lockExpiresAt)
      .where(sql`${table.status} = 'PROCESSING'`),
    index("outbox_published_at_idx")
      .on(table.publishedAt)
      .where(sql`${table.status} = 'PUBLISHED'`),
  ]
);

export type OutboxEventRow = typeof outboxEvents.$inferSelect;
export type NewOutboxEventRow = typeof outboxEvents.$inferInsert;
