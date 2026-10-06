import { pgTable, uuid, varchar, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";

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
    status: varchar("status", { length: 32 }).notNull().default("PENDING"), // PENDING, PUBLISHED, FAILED
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("outbox_status_occurred_idx").on(table.status, table.occurredAt),
    index("outbox_tenant_id_idx").on(table.tenantId),
  ]
);

export type OutboxEventRow = typeof outboxEvents.$inferSelect;
export type NewOutboxEventRow = typeof outboxEvents.$inferInsert;
