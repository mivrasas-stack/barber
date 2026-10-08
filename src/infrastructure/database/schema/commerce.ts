import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  char,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { locations } from "./locations";
import { users } from "./users";
import { services } from "./services";
import { appointments, appointmentServices } from "./appointments";
import { professionalProfiles } from "./professionals";

// 1. Product Categories
export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }), // null for global/system categories
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    parentId: uuid("parent_id").references((): any => productCategories.id, { onDelete: "set null" }),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("prod_cat_tenant_slug_idx").on(table.tenantId, table.slug),
    index("prod_cat_status_idx").on(table.status),
  ]
);

// 2. Products
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerTenantId: uuid("owner_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => productCategories.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    brand: varchar("brand", { length: 255 }),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"), // DRAFT, ACTIVE, ARCHIVED
    trackInventory: boolean("track_inventory").notNull().default(true),
    defaultTaxCategory: varchar("default_tax_category", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("products_owner_slug_idx").on(table.ownerTenantId, table.slug),
    index("products_owner_status_idx").on(table.ownerTenantId, table.status),
    index("products_category_idx").on(table.categoryId),
  ]
);

// 3. Product Variants & SKU
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 100 }).notNull(),
    barcode: varchar("barcode", { length: 100 }),
    name: varchar("name", { length: 255 }).notNull(), // e.g. "100g", "Matte", "Standard"
    priceMinor: bigint("price_minor", { mode: "bigint" }).notNull(),
    costMinor: bigint("cost_minor", { mode: "bigint" }),
    currency: char("currency", { length: 3 }).notNull().default("COP"),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"), // ACTIVE, ARCHIVED
    trackInventory: boolean("track_inventory").notNull().default(true),
    reorderPoint: integer("reorder_point").default(5),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("pv_sku_idx").on(table.sku),
    index("pv_product_idx").on(table.productId),
    index("pv_barcode_idx").on(table.barcode),
  ]
);

// 4. Inventory Positions (Stock balance per owner, physical location, and variant)
export const inventoryPositions = pgTable(
  "inventory_positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerTenantId: uuid("owner_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    productVariantId: uuid("product_variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    version: integer("version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("inv_pos_owner_loc_variant_idx").on(
      table.ownerTenantId,
      table.locationId,
      table.productVariantId
    ),
    index("inv_pos_owner_loc_idx").on(table.ownerTenantId, table.locationId),
    index("inv_pos_variant_idx").on(table.productVariantId),
  ]
);

// 5. Stock Movements (Immutable Ledger of All Inventory Changes)
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerTenantId: uuid("owner_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    productVariantId: uuid("product_variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    movementType: varchar("movement_type", { length: 64 }).notNull(), // INITIAL_BALANCE, PURCHASE_RECEIPT, SALE, SALE_RETURN, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT_IN, ADJUSTMENT_OUT, DAMAGE, LOSS, EXPIRED
    quantity: integer("quantity").notNull(), // Strictly positive (> 0); movementType determines direction
    unitCostMinor: bigint("unit_cost_minor", { mode: "bigint" }),
    currency: char("currency", { length: 3 }).default("COP"),
    sourceType: varchar("source_type", { length: 64 }).notNull(), // ORDER, MANUAL, TRANSFER, PURCHASE_RECEIPT, RETURN
    sourceId: uuid("source_id"),
    correlationId: varchar("correlation_id", { length: 128 }),
    reason: text("reason"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sm_owner_loc_occurred_idx").on(table.ownerTenantId, table.locationId, table.occurredAt),
    index("sm_variant_occurred_idx").on(table.productVariantId, table.occurredAt),
    index("sm_source_idx").on(table.sourceType, table.sourceId),
    index("sm_correlation_idx").on(table.correlationId),
  ]
);

// 6. Orders
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: varchar("order_number", { length: 64 }).notNull().unique(),
    contextTenantId: uuid("context_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    customerUserId: uuid("customer_user_id").references(() => users.id, { onDelete: "set null" }),
    customerNameSnapshot: varchar("customer_name_snapshot", { length: 255 }),
    customerEmailSnapshot: varchar("customer_email_snapshot", { length: 255 }),
    customerPhoneSnapshot: varchar("customer_phone_snapshot", { length: 50 }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    status: varchar("status", { length: 32 }).notNull().default("DRAFT"), // DRAFT, OPEN, COMPLETED, CANCELLED
    currency: char("currency", { length: 3 }).notNull().default("COP"),
    subtotalMinor: bigint("subtotal_minor", { mode: "bigint" }).notNull().default(sql`0`),
    discountTotalMinor: bigint("discount_total_minor", { mode: "bigint" }).notNull().default(sql`0`),
    taxTotalMinor: bigint("tax_total_minor", { mode: "bigint" }).notNull().default(sql`0`),
    tipTotalMinor: bigint("tip_total_minor", { mode: "bigint" }).notNull().default(sql`0`),
    grandTotalMinor: bigint("grand_total_minor", { mode: "bigint" }).notNull().default(sql`0`),
    collectorParty: varchar("collector_party", { length: 32 }).notNull().default("COLLECTED_BY_HOST"), // COLLECTED_BY_HOST, COLLECTED_BY_PROFESSIONAL
    notes: text("notes"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_context_loc_opened_idx").on(table.contextTenantId, table.locationId, table.openedAt),
    index("orders_customer_opened_idx").on(table.customerUserId, table.openedAt),
    index("orders_appointment_idx").on(table.appointmentId),
    index("orders_status_idx").on(table.status),
  ]
);

// 7. Order Items (Each line explicitly tracks economic seller tenant)
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    itemType: varchar("item_type", { length: 32 }).notNull(), // SERVICE, PRODUCT, TIP, FEE, DISCOUNT
    sellerTenantId: uuid("seller_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    appointmentServiceId: uuid("appointment_service_id").references(() => appointmentServices.id, {
      onDelete: "set null",
    }),
    productVariantId: uuid("product_variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    professionalProfileId: uuid("professional_profile_id").references(() => professionalProfiles.id, {
      onDelete: "set null",
    }),
    descriptionSnapshot: varchar("description_snapshot", { length: 255 }).notNull(),
    skuSnapshot: varchar("sku_snapshot", { length: 100 }),
    quantity: integer("quantity").notNull().default(1),
    unitPriceMinor: bigint("unit_price_minor", { mode: "bigint" }).notNull(),
    unitCostMinor: bigint("unit_cost_minor", { mode: "bigint" }),
    discountMinor: bigint("discount_minor", { mode: "bigint" }).notNull().default(sql`0`),
    taxMinor: bigint("tax_minor", { mode: "bigint" }).notNull().default(sql`0`),
    lineTotalMinor: bigint("line_total_minor", { mode: "bigint" }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("COP"),
    position: integer("position").notNull().default(1),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    index("order_items_seller_idx").on(table.sellerTenantId),
    index("order_items_variant_idx").on(table.productVariantId),
    index("order_items_service_idx").on(table.serviceId),
  ]
);

// 8. Order Tenders (Payment declarations at POS)
export const orderTenders = pgTable(
  "order_tenders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 32 }).notNull(), // CASH, BANK_TRANSFER, EXTERNAL_CARD, NEQUI, DAVIPLATA, OTHER, UNPAID
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    amountReceivedMinor: bigint("amount_received_minor", { mode: "bigint" }),
    changeDueMinor: bigint("change_due_minor", { mode: "bigint" }),
    currency: char("currency", { length: 3 }).notNull().default("COP"),
    reference: varchar("reference", { length: 100 }),
    declaredByUserId: uuid("declared_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("order_tenders_order_idx").on(table.orderId),
  ]
);

// Types
export type ProductCategoryRow = typeof productCategories.$inferSelect;
export type NewProductCategoryRow = typeof productCategories.$inferInsert;

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;

export type ProductVariantRow = typeof productVariants.$inferSelect;
export type NewProductVariantRow = typeof productVariants.$inferInsert;

export type InventoryPositionRow = typeof inventoryPositions.$inferSelect;
export type NewInventoryPositionRow = typeof inventoryPositions.$inferInsert;

export type StockMovementRow = typeof stockMovements.$inferSelect;
export type NewStockMovementRow = typeof stockMovements.$inferInsert;

export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;

export type OrderItemRow = typeof orderItems.$inferSelect;
export type NewOrderItemRow = typeof orderItems.$inferInsert;

export type OrderTenderRow = typeof orderTenders.$inferSelect;
export type NewOrderTenderRow = typeof orderTenders.$inferInsert;
