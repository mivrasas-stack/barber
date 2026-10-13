import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  integer,
  bigint,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { tenants } from "./tenants";

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "restrict" }),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),

    mediaKind: varchar("media_kind", { length: 24 }).notNull(),
    purpose: varchar("purpose", { length: 64 }).notNull(),
    visibility: varchar("visibility", { length: 24 }).notNull().default("PRIVATE"),

    originalFilename: varchar("original_filename", { length: 255 }),
    sourceObjectKey: varchar("source_object_key", { length: 512 }).notNull(),
    mimeType: varchar("mime_type", { length: 127 }).notNull(),

    sizeBytes: bigint("size_bytes", { mode: "number" }),
    checksumSha256: varchar("checksum_sha256", { length: 64 }),
    width: integer("width"),
    height: integer("height"),
    durationMs: bigint("duration_ms", { mode: "number" }),

    status: varchar("status", { length: 32 }).notNull().default("UPLOADING"),
    processingVersion: integer("processing_version").notNull().default(1),
    processingAttempts: integer("processing_attempts").notNull().default(0),
    processingMaxAttempts: integer("processing_max_attempts").notNull().default(8),
    nextProcessingAttemptAt: timestamp("next_processing_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    processingLeaseId: varchar("processing_lease_id", { length: 64 }),
    processingLockedAt: timestamp("processing_locked_at", { withTimezone: true }),
    processingLockedBy: varchar("processing_locked_by", { length: 128 }),
    processingLockExpiresAt: timestamp("processing_lock_expires_at", { withTimezone: true }),
    lastError: text("last_error"),

    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    storagePurgedAt: timestamp("storage_purged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("media_assets_source_object_key_idx").on(table.sourceObjectKey),
    index("media_assets_tenant_status_created_idx").on(table.tenantId, table.status, table.createdAt),
    index("media_assets_owner_created_idx").on(table.ownerUserId, table.createdAt),
    index("media_assets_purpose_status_idx").on(table.purpose, table.status),
    index("media_assets_deleted_idx").on(table.deletedAt),
    index("media_assets_processing_ready_idx")
      .on(table.status, table.nextProcessingAttemptAt, table.createdAt)
      .where(sql`${table.status} in ('UPLOADED', 'FAILED')`),
    index("media_assets_processing_expired_lease_idx")
      .on(table.processingLockExpiresAt)
      .where(sql`${table.status} = 'PROCESSING'`),
  ]
);

export const mediaVariants = pgTable(
  "media_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),

    variantKey: varchar("variant_key", { length: 64 }).notNull(),
    objectKey: varchar("object_key", { length: 512 }).notNull(),
    mimeType: varchar("mime_type", { length: 127 }).notNull(),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("media_variants_asset_variant_idx").on(table.mediaAssetId, table.variantKey),
    uniqueIndex("media_variants_object_key_idx").on(table.objectKey),
    index("media_variants_asset_created_idx").on(table.mediaAssetId, table.createdAt),
  ]
);

export const mediaUploadIntents = pgTable(
  "media_upload_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),

    objectKey: varchar("object_key", { length: 512 }).notNull(),
    allowedMime: varchar("allowed_mime", { length: 127 }).notNull(),
    maxBytes: bigint("max_bytes", { mode: "number" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("media_upload_intents_asset_idx").on(table.mediaAssetId),
    uniqueIndex("media_upload_intents_object_key_idx").on(table.objectKey),
    index("media_upload_intents_expires_idx").on(table.expiresAt),
  ]
);

export type MediaAssetRow = typeof mediaAssets.$inferSelect;
export type NewMediaAssetRow = typeof mediaAssets.$inferInsert;
export type MediaVariantRow = typeof mediaVariants.$inferSelect;
export type NewMediaVariantRow = typeof mediaVariants.$inferInsert;
export type MediaUploadIntentRow = typeof mediaUploadIntents.$inferSelect;
export type NewMediaUploadIntentRow = typeof mediaUploadIntents.$inferInsert;
