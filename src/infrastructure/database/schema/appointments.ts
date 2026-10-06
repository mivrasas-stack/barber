import { pgTable, uuid, varchar, text, integer, bigint, char, timestamp, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { locations } from "./locations";
import { users } from "./users";
import { staffProfiles } from "./staff";
import { services } from "./services";

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    customerUserId: uuid("customer_user_id").references(() => users.id, { onDelete: "set null" }),
    customerNameSnapshot: varchar("customer_name_snapshot", { length: 255 }).notNull(),
    customerEmailSnapshot: varchar("customer_email_snapshot", { length: 255 }),
    customerPhoneSnapshot: varchar("customer_phone_snapshot", { length: 50 }),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    timezone: varchar("timezone", { length: 100 }).notNull().default("America/Bogota"),
    source: varchar("source", { length: 50 }).notNull().default("ONLINE"), // ONLINE, WALK_IN, PHONE
    notes: text("notes"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1), // Optimistic concurrency control
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("appointments_tenant_loc_starts_idx").on(table.tenantId, table.locationId, table.startsAt),
    index("appointments_staff_starts_idx").on(table.staffId, table.startsAt),
    index("appointments_customer_starts_idx").on(table.customerUserId, table.startsAt),
    index("appointments_status_idx").on(table.status),
  ]
);

export const appointmentServices = pgTable(
  "appointment_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    serviceNameSnapshot: varchar("service_name_snapshot", { length: 255 }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    priceMinor: bigint("price_minor", { mode: "number" }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("COP"),
    position: integer("position").notNull().default(1),
  },
  (table) => [
    index("appointment_services_appointment_id_idx").on(table.appointmentId),
    index("appointment_services_service_id_idx").on(table.serviceId),
  ]
);

export const appointmentStatusHistory = pgTable(
  "appointment_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    fromStatus: varchar("from_status", { length: 32 }).notNull(),
    toStatus: varchar("to_status", { length: 32 }).notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("appointment_history_appointment_id_idx").on(table.appointmentId),
    index("appointment_history_created_at_idx").on(table.createdAt),
  ]
);

export type AppointmentRow = typeof appointments.$inferSelect;
export type NewAppointmentRow = typeof appointments.$inferInsert;
export type AppointmentServiceRow = typeof appointmentServices.$inferSelect;
export type NewAppointmentServiceRow = typeof appointmentServices.$inferInsert;
export type AppointmentStatusHistoryRow = typeof appointmentStatusHistory.$inferSelect;
export type NewAppointmentStatusHistoryRow = typeof appointmentStatusHistory.$inferInsert;
