import { pgTable, uuid, varchar, text, integer, bigint, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { locations } from "./locations";
import { memberships } from "./memberships";
import { services } from "./services";
import { professionalProfiles } from "./professionals";

export const staffProfiles = pgTable(
  "staff_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    professionalProfileId: uuid("professional_profile_id")
      .references(() => professionalProfiles.id, { onDelete: "set null" }),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    bio: text("bio"),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("staff_profiles_membership_idx").on(table.membershipId),
    index("staff_profiles_tenant_id_idx").on(table.tenantId),
    index("staff_profiles_prof_id_idx").on(table.professionalProfileId),
  ]
);

export const staffLocations = pgTable(
  "staff_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("staff_locations_unique_idx").on(table.staffId, table.locationId),
    index("staff_locations_staff_id_idx").on(table.staffId),
    index("staff_locations_location_id_idx").on(table.locationId),
  ]
);

export const staffServices = pgTable(
  "staff_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    durationOverrideMinutes: integer("duration_override_minutes"),
    priceOverrideMinor: bigint("price_override_minor", { mode: "number" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("staff_services_unique_idx").on(table.staffId, table.serviceId),
    index("staff_services_staff_id_idx").on(table.staffId),
    index("staff_services_service_id_idx").on(table.serviceId),
  ]
);

export type StaffProfileRow = typeof staffProfiles.$inferSelect;
export type NewStaffProfileRow = typeof staffProfiles.$inferInsert;
export type StaffLocationRow = typeof staffLocations.$inferSelect;
export type NewStaffLocationRow = typeof staffLocations.$inferInsert;
export type StaffServiceRow = typeof staffServices.$inferSelect;
export type NewStaffServiceRow = typeof staffServices.$inferInsert;
