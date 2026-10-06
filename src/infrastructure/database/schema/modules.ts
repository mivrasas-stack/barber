import { pgTable, uuid, varchar, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { permissions } from "./permissions";
import { subscriptionPlans } from "./subscriptions";

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 100 }).notNull().unique(), // e.g. core.dashboard, scheduling.calendar, finance.overview
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }).notNull().default("CORE"), // CORE, SCHEDULING, CUSTOMERS, PROFILE, OPERATIONS, FINANCE, ANALYTICS, AI
    status: varchar("status", { length: 32 }).notNull().default("AVAILABLE"), // AVAILABLE, COMING_SOON, INTERNAL, DEPRECATED
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("modules_code_idx").on(table.code),
    index("modules_category_idx").on(table.category),
  ]
);

export const planModules = pgTable(
  "plan_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("plan_modules_unique_idx").on(table.planId, table.moduleId),
    index("plan_modules_plan_idx").on(table.planId),
  ]
);

export const moduleDependencies = pgTable(
  "module_dependencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    requiredModuleId: uuid("required_module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("module_dep_unique_idx").on(table.moduleId, table.requiredModuleId),
    index("module_dep_module_idx").on(table.moduleId),
  ]
);

export const tenantModuleOverrides = pgTable(
  "tenant_module_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    state: varchar("state", { length: 32 }).notNull(), // FORCE_ENABLED, FORCE_DISABLED
    reason: text("reason"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tenant_overrides_unique_idx").on(table.tenantId, table.moduleId),
    index("tenant_overrides_tenant_idx").on(table.tenantId),
  ]
);

export const modulePermissions = pgTable(
  "module_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("module_perms_unique_idx").on(table.moduleId, table.permissionId),
    index("module_perms_module_idx").on(table.moduleId),
  ]
);

export type ModuleRow = typeof modules.$inferSelect;
export type NewModuleRow = typeof modules.$inferInsert;
export type PlanModuleRow = typeof planModules.$inferSelect;
export type NewPlanModuleRow = typeof planModules.$inferInsert;
export type ModuleDependencyRow = typeof moduleDependencies.$inferSelect;
export type NewModuleDependencyRow = typeof moduleDependencies.$inferInsert;
export type TenantModuleOverrideRow = typeof tenantModuleOverrides.$inferSelect;
export type NewTenantModuleOverrideRow = typeof tenantModuleOverrides.$inferInsert;
export type ModulePermissionRow = typeof modulePermissions.$inferSelect;
export type NewModulePermissionRow = typeof modulePermissions.$inferInsert;
