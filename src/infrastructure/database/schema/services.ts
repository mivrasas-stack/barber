import { pgTable, uuid, varchar, text, integer, bigint, char, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { locations } from "./locations";

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    bufferBeforeMinutes: integer("buffer_before_minutes").notNull().default(0),
    bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(0),
    priceMinor: bigint("price_minor", { mode: "number" }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("COP"),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("services_tenant_slug_idx").on(table.tenantId, table.slug),
    index("services_tenant_id_idx").on(table.tenantId),
  ]
);

export const locationServices = pgTable(
  "location_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    priceOverrideMinor: bigint("price_override_minor", { mode: "number" }),
    durationOverrideMinutes: integer("duration_override_minutes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("location_services_unique_idx").on(table.locationId, table.serviceId),
    index("location_services_location_id_idx").on(table.locationId),
    index("location_services_service_id_idx").on(table.serviceId),
  ]
);

export type ServiceRow = typeof services.$inferSelect;
export type NewServiceRow = typeof services.$inferInsert;
export type LocationServiceRow = typeof locationServices.$inferSelect;
export type NewLocationServiceRow = typeof locationServices.$inferInsert;
