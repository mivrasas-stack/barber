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
import { users } from "./users";
import { professionalAffiliations } from "./professionals";

// 1. Financial Accounts (Ledger Chart of Accounts)
export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }), // Nullable for Platform/System clearing
    accountCode: varchar("account_code", { length: 64 }).notNull(),
    accountName: varchar("account_name", { length: 255 }).notNull(),
    accountType: varchar("account_type", { length: 32 }).notNull(), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    currency: char("currency", { length: 3 }).notNull().default("COP"),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"), // ACTIVE, FROZEN, CLOSED
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("fin_acc_tenant_code_curr_idx").on(table.tenantId, table.accountCode, table.currency),
    index("fin_acc_tenant_type_idx").on(table.tenantId, table.accountType),
    index("fin_acc_code_idx").on(table.accountCode),
  ]
);

// 2. Journal Entries (Immutable Accounting Header)
export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    entryNumber: varchar("entry_number", { length: 64 }).notNull(),
    entryType: varchar("entry_type", { length: 64 }).notNull(), // SERVICE_REVENUE, EXPENSE, SETTLEMENT, CHAIR_RENT_OBLIGATION, ADJUSTMENT, REVERSAL
    currency: char("currency", { length: 3 }).notNull().default("COP"),
    sourceType: varchar("source_type", { length: 64 }).notNull(), // APPOINTMENT, EXPENSE, SETTLEMENT, ADJUSTMENT, REVERSAL
    sourceId: uuid("source_id"), // Nullable for ad-hoc manual adjustments
    description: text("description").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("POSTED"), // DRAFT, POSTED, REVERSED
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull().defaultNow(),
    reversedEntryId: uuid("reversed_entry_id"), // Self-reference if this entry was reversed
    reversalOfEntryId: uuid("reversal_of_entry_id"), // Self-reference if this entry is a reversal
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("je_source_unique_posted_idx")
      .on(table.tenantId, table.sourceType, table.sourceId, table.entryType)
      .where(sql`status = 'POSTED' AND source_id IS NOT NULL`),
    uniqueIndex("je_reversal_of_unique_idx")
      .on(table.reversalOfEntryId)
      .where(sql`status = 'POSTED' AND reversal_of_entry_id IS NOT NULL`),
    index("je_tenant_occurred_idx").on(table.tenantId, table.occurredAt),
    index("je_entry_number_idx").on(table.entryNumber),
    index("je_source_idx").on(table.sourceType, table.sourceId),
  ]
);

// 3. Journal Lines (Double-Entry Debit & Credit Atomic Movements)
export const journalLines = pgTable(
  "journal_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    financialAccountId: uuid("financial_account_id")
      .notNull()
      .references(() => financialAccounts.id, { onDelete: "restrict" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    direction: varchar("direction", { length: 10 }).notNull(), // DEBIT, CREDIT
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    memo: text("memo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("jl_entry_idx").on(table.journalEntryId),
    index("jl_account_created_idx").on(table.financialAccountId, table.createdAt),
    index("jl_tenant_created_idx").on(table.tenantId, table.createdAt),
  ]
);

// 4. Expense Categories
export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }), // Nullable for system default categories
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("exp_cat_tenant_code_idx").on(table.tenantId, table.code),
  ]
);

// 5. Expenses
export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("COP"),
    incurredAt: timestamp("incurred_at", { withTimezone: true }).notNull().defaultNow(),
    status: varchar("status", { length: 32 }).notNull().default("POSTED"), // POSTED, REVERSED
    vendorName: varchar("vendor_name", { length: 255 }),
    receiptMediaId: varchar("receipt_media_id", { length: 255 }),
    journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("exp_tenant_incurred_idx").on(table.tenantId, table.incurredAt),
    index("exp_status_idx").on(table.status),
  ]
);

// 6. Settlements (Settlement transfers between independent professionals & host shops)
export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromTenantId: uuid("from_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    toTenantId: uuid("to_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    affiliationId: uuid("affiliation_id").references(() => professionalAffiliations.id, {
      onDelete: "set null",
    }),
    currency: char("currency", { length: 3 }).notNull().default("COP"),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("CONFIRMED"), // DRAFT, PENDING, CONFIRMED, CANCELLED
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    settlementType: varchar("settlement_type", { length: 32 }).notNull().default("MANUAL"), // MANUAL, COMMISSION, CHAIR_RENT, HYBRID
    reference: varchar("reference", { length: 100 }),
    notes: text("notes"),
    journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("settle_affil_period_type_idx")
      .on(table.affiliationId, table.periodStart, table.settlementType)
      .where(sql`status != 'CANCELLED' AND affiliation_id IS NOT NULL AND period_start IS NOT NULL`),
    index("settle_from_to_idx").on(table.fromTenantId, table.toTenantId),
    index("settle_affiliation_idx").on(table.affiliationId),
    index("settle_status_idx").on(table.status),
  ]
);

// 7. Affiliation Term Versions (Historical Auditable Versioning of Agreements)
export const professionalAffiliationTermVersions = pgTable(
  "professional_affiliation_term_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    affiliationId: uuid("affiliation_id")
      .notNull()
      .references(() => professionalAffiliations.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull().default(1),
    settlementModel: varchar("settlement_model", { length: 32 }).notNull().default("CHAIR_RENTAL"),
    commissionBasisPoints: integer("commission_basis_points"), // e.g. 2000 = 20.00%
    fixedRentAmountMinor: bigint("fixed_rent_amount_minor", { mode: "bigint" }),
    currency: varchar("currency", { length: 3 }).notNull().default("COP"),
    settlementFrequency: varchar("settlement_frequency", { length: 32 }).default("MONTHLY"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    changeReason: text("change_reason"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("affil_term_versions_affil_idx").on(table.affiliationId),
    uniqueIndex("affil_term_versions_num_idx").on(table.affiliationId, table.versionNumber),
  ]
);

// Type inference
export type FinancialAccountRow = typeof financialAccounts.$inferSelect;
export type NewFinancialAccountRow = typeof financialAccounts.$inferInsert;
export type JournalEntryRow = typeof journalEntries.$inferSelect;
export type NewJournalEntryRow = typeof journalEntries.$inferInsert;
export type JournalLineRow = typeof journalLines.$inferSelect;
export type NewJournalLineRow = typeof journalLines.$inferInsert;
export type ExpenseCategoryRow = typeof expenseCategories.$inferSelect;
export type NewExpenseCategoryRow = typeof expenseCategories.$inferInsert;
export type ExpenseRow = typeof expenses.$inferSelect;
export type NewExpenseRow = typeof expenses.$inferInsert;
export type SettlementRow = typeof settlements.$inferSelect;
export type NewSettlementRow = typeof settlements.$inferInsert;
export type AffiliationTermVersionRow = typeof professionalAffiliationTermVersions.$inferSelect;
export type NewAffiliationTermVersionRow = typeof professionalAffiliationTermVersions.$inferInsert;
