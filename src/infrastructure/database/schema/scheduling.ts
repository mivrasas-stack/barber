import { pgTable, uuid, varchar, text, integer, date, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { locations } from "./locations";
import { staffProfiles } from "./staff";

export const locationBusinessHours = pgTable(
  "location_business_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday ... 6 = Saturday
    openLocalTime: varchar("open_local_time", { length: 8 }).notNull(), // '08:00'
    closeLocalTime: varchar("close_local_time", { length: 8 }).notNull(), // '20:00'
    isClosed: boolean("is_closed").notNull().default(false),
  },
  (table) => [
    uniqueIndex("business_hours_loc_day_idx").on(table.locationId, table.dayOfWeek),
    index("business_hours_location_id_idx").on(table.locationId),
  ]
);

export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday ... 6 = Saturday
    startLocalTime: varchar("start_local_time", { length: 8 }).notNull(), // '09:00'
    endLocalTime: varchar("end_local_time", { length: 8 }).notNull(), // '18:00'
    validFrom: date("valid_from"),
    validUntil: date("valid_until"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("availability_rules_staff_loc_day_idx").on(table.staffId, table.locationId, table.dayOfWeek),
    index("availability_rules_tenant_id_idx").on(table.tenantId),
  ]
);

export const availabilityExceptions = pgTable(
  "availability_exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    type: varchar("type", { length: 50 }).notNull(), // BLOCKED, AVAILABLE_OVERRIDE, VACATION, SICK_LEAVE, BREAK
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("availability_exceptions_staff_range_idx").on(table.staffId, table.startsAt, table.endsAt),
    index("availability_exceptions_tenant_id_idx").on(table.tenantId),
  ]
);

export type LocationBusinessHoursRow = typeof locationBusinessHours.$inferSelect;
export type NewLocationBusinessHoursRow = typeof locationBusinessHours.$inferInsert;
export type AvailabilityRuleRow = typeof availabilityRules.$inferSelect;
export type NewAvailabilityRuleRow = typeof availabilityRules.$inferInsert;
export type AvailabilityExceptionRow = typeof availabilityExceptions.$inferSelect;
export type NewAvailabilityExceptionRow = typeof availabilityExceptions.$inferInsert;
