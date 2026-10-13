import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  text,
  time,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { tenants } from "./tenants";
import { locations } from "./locations";

export const notificationIntents = pgTable(
  "notification_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceEventId: uuid("source_event_id").notNull(),
    sourceEventType: varchar("source_event_type", { length: 150 }).notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    recipientUserId: uuid("recipient_user_id").references(() => users.id, { onDelete: "set null" }),
    recipientKind: varchar("recipient_kind", { length: 32 }).notNull(),
    recipientReference: varchar("recipient_reference", { length: 255 }),
    category: varchar("category", { length: 64 }).notNull(),
    policyKey: varchar("policy_key", { length: 128 }).notNull(),
    templateKey: varchar("template_key", { length: 128 }).notNull(),
    templateVersion: integer("template_version").notNull().default(1),
    locale: varchar("locale", { length: 16 }).notNull().default("es-CO"),
    timezone: varchar("timezone", { length: 100 }).notNull().default("America/Bogota"),
    payload: jsonb("payload").notNull(),
    dedupeKey: varchar("dedupe_key", { length: 255 }).notNull(),
    mandatory: boolean("mandatory").notNull().default(false),
    status: varchar("status", { length: 32 }).notNull().default("CREATED"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_intents_dedupe_idx").on(table.dedupeKey),
    index("notification_intents_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("notification_intents_recipient_created_idx").on(table.recipientUserId, table.createdAt),
    index("notification_intents_source_event_idx").on(table.sourceEventId),
    index("notification_intents_status_created_idx").on(table.status, table.createdAt),
  ]
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notificationIntentId: uuid("notification_intent_id")
      .notNull()
      .references(() => notificationIntents.id, { onDelete: "restrict" }),
    channel: varchar("channel", { length: 24 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    destinationHash: varchar("destination_hash", { length: 64 }),
    destinationMasked: varchar("destination_masked", { length: 255 }),
    provider: varchar("provider", { length: 64 }),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(8),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: varchar("locked_by", { length: 128 }),
    lockExpiresAt: timestamp("lock_expires_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_deliveries_intent_channel_idx").on(
      table.notificationIntentId,
      table.channel
    ),
    index("notification_deliveries_ready_idx")
      .on(table.nextAttemptAt, table.createdAt)
      .where(sql`${table.status} in ('PENDING', 'FAILED')`),
    index("notification_deliveries_expired_lease_idx")
      .on(table.lockExpiresAt)
      .where(sql`${table.status} = 'PROCESSING'`),
    index("notification_deliveries_provider_message_idx").on(
      table.provider,
      table.providerMessageId
    ),
  ]
);

export const notificationInboxItems = pgTable(
  "notification_inbox_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notificationIntentId: uuid("notification_intent_id")
      .notNull()
      .references(() => notificationIntents.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_inbox_intent_user_idx").on(
      table.notificationIntentId,
      table.userId
    ),
    index("notification_inbox_user_tenant_created_idx").on(
      table.userId,
      table.tenantId,
      table.createdAt
    ),
    index("notification_inbox_unread_idx")
      .on(table.userId, table.createdAt)
      .where(sql`${table.readAt} is null and ${table.archivedAt} is null`),
  ]
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 64 }).notNull(),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    smsEnabled: boolean("sms_enabled").notNull().default(false),
    whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
    quietHoursEnabled: boolean("quiet_hours_enabled").notNull().default(false),
    quietHoursStart: time("quiet_hours_start"),
    quietHoursEnd: time("quiet_hours_end"),
    timezone: varchar("timezone", { length: 100 }),
    locale: varchar("locale", { length: 16 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_preferences_global_idx")
      .on(table.userId, table.category)
      .where(sql`${table.tenantId} is null`),
    uniqueIndex("notification_preferences_tenant_idx")
      .on(table.userId, table.tenantId, table.category)
      .where(sql`${table.tenantId} is not null`),
    index("notification_preferences_user_idx").on(table.userId),
    index("notification_preferences_tenant_idx_lookup").on(table.tenantId),
  ]
);

export const notificationSuppressions = pgTable(
  "notification_suppressions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channel: varchar("channel", { length: 24 }).notNull(),
    destinationHash: varchar("destination_hash", { length: 64 }).notNull(),
    reason: varchar("reason", { length: 128 }).notNull(),
    source: varchar("source", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("notification_suppressions_channel_destination_idx").on(
      table.channel,
      table.destinationHash
    ),
    index("notification_suppressions_expires_idx").on(table.expiresAt),
  ]
);

export type NotificationIntentRow = typeof notificationIntents.$inferSelect;
export type NewNotificationIntentRow = typeof notificationIntents.$inferInsert;
export type NotificationDeliveryRow = typeof notificationDeliveries.$inferSelect;
export type NewNotificationDeliveryRow = typeof notificationDeliveries.$inferInsert;
export type NotificationInboxItemRow = typeof notificationInboxItems.$inferSelect;
export type NewNotificationInboxItemRow = typeof notificationInboxItems.$inferInsert;
export type NotificationPreferenceRow = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferenceRow = typeof notificationPreferences.$inferInsert;
export type NotificationSuppressionRow = typeof notificationSuppressions.$inferSelect;
export type NewNotificationSuppressionRow = typeof notificationSuppressions.$inferInsert;
