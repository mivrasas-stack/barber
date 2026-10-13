import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

/** QR intake is tenant-scoped and unverified until the customer authenticates. */
export const customerIntakes = pgTable("customer_intakes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, {onDelete:"cascade"}),
  customerUserId: uuid("customer_user_id").references(() => users.id, {onDelete:"set null"}),
  name: varchar("name",{length:255}).notNull(),
  phone: varchar("phone",{length:40}).notNull(),
  phoneNormalized: varchar("phone_normalized",{length:32}).notNull(),
  email: varchar("email",{length:255}),
  status: varchar("status",{length:32}).notNull().default("UNVERIFIED"),
  source: varchar("source",{length:32}).notNull().default("QR"),
  createdAt: timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
  updatedAt: timestamp("updated_at",{withTimezone:true}).notNull().defaultNow(),
},(t)=>[
  uniqueIndex("customer_intakes_tenant_phone_unique").on(t.tenantId,t.phoneNormalized),
  index("customer_intakes_tenant_created_idx").on(t.tenantId,t.createdAt)
]);
