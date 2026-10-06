import { pgTable, uuid, varchar, char, timestamp } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("ACTIVE"), // ACTIVE, SUSPENDED, CANCELLED
  defaultCurrency: char("default_currency", { length: 3 }).notNull().default("COP"),
  defaultTimezone: varchar("default_timezone", { length: 100 }).notNull().default("America/Bogota"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TenantRow = typeof tenants.$inferSelect;
export type NewTenantRow = typeof tenants.$inferInsert;
