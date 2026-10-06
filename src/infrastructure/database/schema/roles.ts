import { pgTable, uuid, varchar, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { memberships } from "./memberships";

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }), // null if system-level template role
    name: varchar("name", { length: 100 }).notNull(), // OWNER, MANAGER, EMPLOYEE
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("roles_tenant_id_idx").on(table.tenantId),
  ]
);

export const membershipRoles = pgTable(
  "membership_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("membership_roles_unique_idx").on(table.membershipId, table.roleId),
    index("membership_roles_membership_id_idx").on(table.membershipId),
    index("membership_roles_role_id_idx").on(table.roleId),
  ]
);

export type RoleRow = typeof roles.$inferSelect;
export type NewRoleRow = typeof roles.$inferInsert;
export type MembershipRoleRow = typeof membershipRoles.$inferSelect;
export type NewMembershipRoleRow = typeof membershipRoles.$inferInsert;
