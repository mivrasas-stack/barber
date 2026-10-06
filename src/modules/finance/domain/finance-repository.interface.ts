import { FinancialAccount } from "./financial-account";
import { JournalEntry } from "./journal-entry";
import { Expense } from "./expense";
import { Settlement } from "./settlement";
import { Money } from "./money";

export interface LedgerFilter {
  tenantId: string;
  accountCode?: string;
  from?: Date;
  to?: Date;
  sourceType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseFilter {
  categoryId?: string;
  status?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface SettlementFilter {
  fromTenantId?: string;
  toTenantId?: string;
  affiliationId?: string;
  status?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface FinancialAccountBalance {
  account: FinancialAccount;
  debitTotal: Money;
  creditTotal: Money;
  netBalance: Money; // Calculated according to normal balance: Assets/Expenses (Debit - Credit), Liab/Eq/Rev (Credit - Debit)
}

export interface FinancialSummary {
  tenantId: string;
  currency: string;
  totalRevenue: Money;
  totalExpenses: Money;
  netIncome: Money;
  totalCash: Money;
  totalReceivables: Money;
  totalPayables: Money;
  accountBalances: FinancialAccountBalance[];
}

export interface SettlementBalance {
  hostTenantId: string;
  professionalTenantId: string;
  currency: string;
  hostReceivable: Money;
  hostPayable: Money;
  netOwedToProfessional: Money; // hostPayable - hostReceivable
}

export interface IFinanceRepository {
  // Account Management & Chart of Accounts
  getOrCreateDefaultAccounts(
    tenantId: string,
    currency?: string,
    tx?: any
  ): Promise<Map<string, FinancialAccount>>;

  getAccountByCode(
    tenantId: string,
    accountCode: string,
    currency?: string,
    tx?: any
  ): Promise<FinancialAccount | null>;

  listAccounts(tenantId: string, currency?: string, tx?: any): Promise<FinancialAccount[]>;

  // Journal Entries
  postJournalEntry(entry: JournalEntry, tx?: any): Promise<JournalEntry>;

  findJournalEntryById(id: string, tx?: any): Promise<JournalEntry | null>;

  findJournalEntryBySource(
    sourceType: string,
    sourceId: string,
    entryType?: string,
    tenantId?: string,
    tx?: any
  ): Promise<JournalEntry | null>;

  reverseJournalEntry(
    journalEntryId: string,
    actorUserId: string,
    reason: string,
    tx?: any
  ): Promise<JournalEntry>;

  getLedgerEntries(
    filter: LedgerFilter,
    tx?: any
  ): Promise<{ entries: JournalEntry[]; total: number }>;

  getFinancialSummary(
    tenantId: string,
    from?: Date,
    to?: Date,
    currency?: string,
    tx?: any
  ): Promise<FinancialSummary>;

  // Expenses
  createExpense(expense: Expense, tx?: any): Promise<Expense>;

  findExpenseById(id: string, tenantId: string, tx?: any): Promise<Expense | null>;

  reverseExpense(
    expenseId: string,
    tenantId: string,
    actorUserId: string,
    reason: string,
    tx?: any
  ): Promise<Expense>;

  listExpenses(
    tenantId: string,
    filter?: ExpenseFilter,
    tx?: any
  ): Promise<{ expenses: Expense[]; total: number }>;

  // Settlements
  createSettlement(settlement: Settlement, tx?: any): Promise<Settlement>;

  findSettlementById(id: string, tx?: any): Promise<Settlement | null>;

  confirmSettlement(settlementId: string, actorUserId: string, tx?: any): Promise<Settlement>;

  listSettlements(
    tenantId: string,
    filter?: SettlementFilter,
    tx?: any
  ): Promise<{ settlements: Settlement[]; total: number }>;

  getSettlementBalance(
    hostTenantId: string,
    professionalTenantId: string,
    currency?: string,
    tx?: any
  ): Promise<SettlementBalance>;
}
