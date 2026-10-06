import { eq, and, or, sql, desc, gte, lte } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  financialAccounts,
  journalEntries,
  journalLines,
  expenses,
  settlements,
  FinancialAccountRow,
  JournalEntryRow,
  JournalLineRow,
  ExpenseRow,
  SettlementRow,
} from "@/infrastructure/database/schema/finance";
import {
  FinancialAccount,
  AccountType,
  AccountStatus,
  STANDARD_ACCOUNT_CODES,
} from "../domain/financial-account";
import { JournalLine } from "../domain/journal-line";
import {
  JournalEntry,
  JournalEntryType,
  JournalSourceType,
  JournalEntryStatus,
} from "../domain/journal-entry";
import { Expense, ExpenseStatus } from "../domain/expense";
import { Settlement, SettlementStatus, SettlementType } from "../domain/settlement";
import { Money } from "../domain/money";
import {
  IFinanceRepository,
  LedgerFilter,
  ExpenseFilter,
  SettlementFilter,
  FinancialSummary,
  SettlementBalance,
  FinancialAccountBalance,
} from "../domain/finance-repository.interface";
import {
  DuplicateJournalEntryError,
  JournalEntryNotFoundError,
  JournalEntryAlreadyReversedError,
  FinancialAccountNotFoundError,
  SettlementExceedsOutstandingError,
  SettledOperationReversalBlockedError,
} from "../domain/finance-errors";
import { NotFoundError } from "@/shared/errors/app-error";

export class DrizzleFinanceRepository implements IFinanceRepository {
  private toAccountDomain(row: FinancialAccountRow): FinancialAccount {
    return new FinancialAccount({
      id: row.id,
      tenantId: row.tenantId,
      accountCode: row.accountCode,
      accountName: row.accountName,
      accountType: row.accountType as AccountType,
      currency: row.currency,
      status: row.status as AccountStatus,
      isSystem: row.isSystem,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toJournalLineDomain(row: JournalLineRow): JournalLine {
    return new JournalLine({
      id: row.id,
      journalEntryId: row.journalEntryId,
      financialAccountId: row.financialAccountId,
      tenantId: row.tenantId,
      direction: row.direction as "DEBIT" | "CREDIT",
      amount: Money.fromMinor(BigInt(row.amountMinor), "COP"),
      memo: row.memo,
      createdAt: row.createdAt,
    });
  }

  private toJournalEntryDomain(
    entryRow: JournalEntryRow,
    lineRows: JournalLineRow[]
  ): JournalEntry {
    const lines = lineRows.map((lr) =>
      new JournalLine({
        id: lr.id,
        journalEntryId: lr.journalEntryId,
        financialAccountId: lr.financialAccountId,
        tenantId: lr.tenantId,
        direction: lr.direction as "DEBIT" | "CREDIT",
        amount: Money.fromMinor(BigInt(lr.amountMinor), entryRow.currency),
        memo: lr.memo,
        createdAt: lr.createdAt,
      })
    );

    return new JournalEntry({
      id: entryRow.id,
      tenantId: entryRow.tenantId,
      entryNumber: entryRow.entryNumber,
      entryType: entryRow.entryType as JournalEntryType,
      currency: entryRow.currency,
      sourceType: entryRow.sourceType as JournalSourceType,
      sourceId: entryRow.sourceId,
      description: entryRow.description,
      status: entryRow.status as JournalEntryStatus,
      occurredAt: entryRow.occurredAt,
      postedAt: entryRow.postedAt,
      reversedEntryId: entryRow.reversedEntryId,
      reversalOfEntryId: entryRow.reversalOfEntryId,
      createdByUserId: entryRow.createdByUserId,
      metadata: entryRow.metadata,
      createdAt: entryRow.createdAt,
      lines,
    });
  }

  private toExpenseDomain(row: ExpenseRow): Expense {
    return new Expense({
      id: row.id,
      tenantId: row.tenantId,
      categoryId: row.categoryId,
      description: row.description,
      amount: Money.fromMinor(BigInt(row.amountMinor), row.currency),
      incurredAt: row.incurredAt,
      status: row.status as ExpenseStatus,
      vendorName: row.vendorName,
      receiptMediaId: row.receiptMediaId,
      journalEntryId: row.journalEntryId,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toSettlementDomain(row: SettlementRow): Settlement {
    return new Settlement({
      id: row.id,
      fromTenantId: row.fromTenantId,
      toTenantId: row.toTenantId,
      affiliationId: row.affiliationId,
      currency: row.currency,
      amount: Money.fromMinor(BigInt(row.amountMinor), row.currency),
      status: row.status as SettlementStatus,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      settlementType: row.settlementType as SettlementType,
      reference: row.reference,
      notes: row.notes,
      journalEntryId: row.journalEntryId,
      createdByUserId: row.createdByUserId,
      confirmedAt: row.confirmedAt,
      cancelledAt: row.cancelledAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async getOrCreateDefaultAccounts(
    tenantId: string,
    currency: string = "COP",
    tx?: any
  ): Promise<Map<string, FinancialAccount>> {
    const client = tx ?? db;
    const curr = currency.toUpperCase();

    const existingRows = await client
      .select()
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.tenantId, tenantId),
          eq(financialAccounts.currency, curr)
        )
      );

    const accountMap = new Map<string, FinancialAccount>();
    for (const row of existingRows) {
      accountMap.set(row.accountCode, this.toAccountDomain(row));
    }

    const defaultDefinitions: Array<{
      code: string;
      name: string;
      type: AccountType;
    }> = [
      { code: STANDARD_ACCOUNT_CODES.CASH, name: "Cash and Bank", type: "ASSET" },
      { code: STANDARD_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, name: "Accounts Receivable", type: "ASSET" },
      { code: STANDARD_ACCOUNT_CODES.HOST_COMMISSION_RECEIVABLE, name: "Host Commission Receivable", type: "ASSET" },
      { code: STANDARD_ACCOUNT_CODES.HOST_CHAIR_RENT_RECEIVABLE, name: "Host Chair Rent Receivable", type: "ASSET" },
      { code: STANDARD_ACCOUNT_CODES.ACCOUNTS_PAYABLE, name: "Accounts Payable", type: "LIABILITY" },
      { code: STANDARD_ACCOUNT_CODES.PROFESSIONAL_COMMISSION_PAYABLE, name: "Professional Commission Payable", type: "LIABILITY" },
      { code: STANDARD_ACCOUNT_CODES.HOST_COMMISSION_PAYABLE, name: "Host Commission Payable", type: "LIABILITY" },
      { code: STANDARD_ACCOUNT_CODES.HOST_CHAIR_RENT_PAYABLE, name: "Host Chair Rent Payable", type: "LIABILITY" },
      { code: STANDARD_ACCOUNT_CODES.TIPS_PAYABLE, name: "Tips Payable", type: "LIABILITY" },
      { code: STANDARD_ACCOUNT_CODES.SETTLEMENT_CLEARING, name: "Settlement Clearing", type: "LIABILITY" },
      { code: STANDARD_ACCOUNT_CODES.RETAINED_EARNINGS, name: "Retained Earnings", type: "EQUITY" },
      { code: STANDARD_ACCOUNT_CODES.SERVICE_REVENUE, name: "Service Revenue", type: "REVENUE" },
      { code: STANDARD_ACCOUNT_CODES.COMMISSION_REVENUE, name: "Commission Revenue", type: "REVENUE" },
      { code: STANDARD_ACCOUNT_CODES.CHAIR_RENT_REVENUE, name: "Chair Rent Revenue", type: "REVENUE" },
      { code: STANDARD_ACCOUNT_CODES.TIP_REVENUE, name: "Tip Revenue", type: "REVENUE" },
      { code: STANDARD_ACCOUNT_CODES.COMMISSION_EXPENSE, name: "Commission Expense", type: "EXPENSE" },
      { code: STANDARD_ACCOUNT_CODES.CHAIR_RENT_EXPENSE, name: "Chair Rent Expense", type: "EXPENSE" },
      { code: STANDARD_ACCOUNT_CODES.OPERATING_EXPENSE, name: "Operating Expense", type: "EXPENSE" },
    ];

    const toInsert = defaultDefinitions.filter((d) => !accountMap.has(d.code));

    if (toInsert.length > 0) {
      const insertedRows = await client
        .insert(financialAccounts)
        .values(
          toInsert.map((d) => ({
            tenantId,
            accountCode: d.code,
            accountName: d.name,
            accountType: d.type,
            currency: curr,
            status: "ACTIVE",
            isSystem: true,
          }))
        )
        .onConflictDoNothing()
        .returning();

      for (const row of insertedRows) {
        accountMap.set(row.accountCode, this.toAccountDomain(row));
      }
    }

    return accountMap;
  }

  async getAccountByCode(
    tenantId: string,
    accountCode: string,
    currency: string = "COP",
    tx?: any
  ): Promise<FinancialAccount | null> {
    const client = tx ?? db;
    const curr = currency.toUpperCase();

    const rows = await client
      .select()
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.tenantId, tenantId),
          eq(financialAccounts.accountCode, accountCode),
          eq(financialAccounts.currency, curr)
        )
      )
      .limit(1);

    if (rows[0]) return this.toAccountDomain(rows[0]);

    // Fallback: populate default chart of accounts and check again
    const map = await this.getOrCreateDefaultAccounts(tenantId, curr, client);
    return map.get(accountCode) ?? null;
  }

  async listAccounts(
    tenantId: string,
    currency?: string,
    tx?: any
  ): Promise<FinancialAccount[]> {
    const client = tx ?? db;
    const conditions = [eq(financialAccounts.tenantId, tenantId)];
    if (currency) {
      conditions.push(eq(financialAccounts.currency, currency.toUpperCase()));
    }

    const rows = await client
      .select()
      .from(financialAccounts)
      .where(and(...conditions))
      .orderBy(financialAccounts.accountCode);

    return rows.map((r: FinancialAccountRow) => this.toAccountDomain(r));
  }

  async postJournalEntry(entry: JournalEntry, tx?: any): Promise<JournalEntry> {
    const runInTx = async (trx: any) => {
      // 1. Check idempotency / duplicates by source
      if (entry.sourceId) {
        const existing = await trx
          .select()
          .from(journalEntries)
          .where(
            and(
              eq(journalEntries.tenantId, entry.tenantId),
              eq(journalEntries.sourceType, entry.sourceType),
              eq(journalEntries.sourceId, entry.sourceId),
              eq(journalEntries.entryType, entry.entryType),
              eq(journalEntries.status, "POSTED")
            )
          )
          .limit(1);

        if (existing[0]) {
          throw new DuplicateJournalEntryError(
            entry.sourceType,
            entry.sourceId,
            existing[0].entryNumber
          );
        }
      }

      // 2. Insert Journal Entry Header
      const [entryRow] = await trx
        .insert(journalEntries)
        .values({
          tenantId: entry.tenantId,
          entryNumber: entry.entryNumber,
          entryType: entry.entryType,
          currency: entry.currency,
          sourceType: entry.sourceType,
          sourceId: entry.sourceId,
          description: entry.description,
          status: entry.status,
          occurredAt: entry.occurredAt,
          postedAt: entry.postedAt,
          reversedEntryId: entry.reversedEntryId,
          reversalOfEntryId: entry.reversalOfEntryId,
          createdByUserId: entry.createdByUserId,
          metadata: entry.metadata,
        })
        .returning();

      // 3. Insert Journal Lines
      const lineRowsToInsert = entry.lines.map((line) => ({
        journalEntryId: entryRow.id,
        financialAccountId: line.financialAccountId,
        tenantId: line.tenantId,
        direction: line.direction,
        amountMinor: Number(line.amount.amountMinor),
        memo: line.memo,
      }));

      const insertedLines = await trx
        .insert(journalLines)
        .values(lineRowsToInsert)
        .returning();

      return this.toJournalEntryDomain(entryRow, insertedLines);
    };

    if (tx) {
      return runInTx(tx);
    }
    return db.transaction(runInTx);
  }

  async findJournalEntryById(id: string, tx?: any): Promise<JournalEntry | null> {
    const client = tx ?? db;
    const [entryRow] = await client
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id))
      .limit(1);

    if (!entryRow) return null;

    const lineRows = await client
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, id));

    return this.toJournalEntryDomain(entryRow, lineRows);
  }

  async findJournalEntryBySource(
    sourceType: string,
    sourceId: string,
    entryType?: string,
    tenantId?: string,
    tx?: any
  ): Promise<JournalEntry | null> {
    const client = tx ?? db;
    const conditions = [
      eq(journalEntries.sourceType, sourceType),
      eq(journalEntries.sourceId, sourceId),
    ];
    if (entryType) {
      conditions.push(eq(journalEntries.entryType, entryType));
    }
    if (tenantId) {
      conditions.push(eq(journalEntries.tenantId, tenantId));
    }

    const [entryRow] = await client
      .select()
      .from(journalEntries)
      .where(and(...conditions))
      .limit(1);

    if (!entryRow) return null;

    const lineRows = await client
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, entryRow.id));

    return this.toJournalEntryDomain(entryRow, lineRows);
  }

  async reverseJournalEntry(
    journalEntryId: string,
    actorUserId: string,
    reason: string,
    options?: { allowClawbackAdjustment?: boolean },
    tx?: any
  ): Promise<JournalEntry> {
    const runInTx = async (trx: any) => {
      // Row lock on original journal entry to serialize concurrent reversals
      const [lockedRow] = await trx
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.id, journalEntryId))
        .for("update");

      if (!lockedRow) {
        throw new JournalEntryNotFoundError(journalEntryId);
      }
      if (lockedRow.status === "REVERSED") {
        throw new JournalEntryAlreadyReversedError(journalEntryId);
      }

      // If reversing an operation whose obligations were already settled
      if (lockedRow.sourceType === "APPOINTMENT" && lockedRow.sourceId) {
        const [settledRow] = await trx
          .select()
          .from(settlements)
          .where(
            and(
              or(
                eq(settlements.fromTenantId, lockedRow.tenantId),
                eq(settlements.toTenantId, lockedRow.tenantId)
              ),
              eq(settlements.status, "CONFIRMED")
            )
          )
          .limit(1);

        if (settledRow && options?.allowClawbackAdjustment === false) {
          throw new SettledOperationReversalBlockedError();
        }
      }

      const originalLines = await trx
        .select()
        .from(journalLines)
        .where(eq(journalLines.journalEntryId, lockedRow.id));

      const original = this.toJournalEntryDomain(lockedRow, originalLines);
      const reversalNumber = `REV-${original.entryNumber}-${Date.now()}`;
      const reversalDomain = original.createReversal(reversalNumber, actorUserId, reason);

      const postedReversal = await this.postJournalEntry(reversalDomain, trx);

      // Atomic update with status check
      const [updatedOriginal] = await trx
        .update(journalEntries)
        .set({
          status: "REVERSED",
          reversedEntryId: postedReversal.id,
        })
        .where(and(eq(journalEntries.id, original.id!), eq(journalEntries.status, "POSTED")))
        .returning();

      if (!updatedOriginal) {
        throw new JournalEntryAlreadyReversedError(journalEntryId);
      }

      return postedReversal;
    };

    if (tx) {
      return runInTx(tx);
    }
    return db.transaction(runInTx);
  }

  async getLedgerEntries(
    filter: LedgerFilter,
    tx?: any
  ): Promise<{ entries: JournalEntry[]; total: number }> {
    const client = tx ?? db;
    const conditions = [eq(journalEntries.tenantId, filter.tenantId)];

    if (filter.sourceType) {
      conditions.push(eq(journalEntries.sourceType, filter.sourceType));
    }
    if (filter.status) {
      conditions.push(eq(journalEntries.status, filter.status));
    }
    if (filter.from) {
      conditions.push(gte(journalEntries.occurredAt, filter.from));
    }
    if (filter.to) {
      conditions.push(lte(journalEntries.occurredAt, filter.to));
    }

    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 50;
    const offset = (page - 1) * limit;

    const totalRes = await client
      .select({ count: sql<number>`count(*)::int` })
      .from(journalEntries)
      .where(and(...conditions));

    const total = totalRes[0]?.count ?? 0;

    const entryRows = await client
      .select()
      .from(journalEntries)
      .where(and(...conditions))
      .orderBy(desc(journalEntries.occurredAt))
      .limit(limit)
      .offset(offset);

    const entries: JournalEntry[] = [];
    for (const er of entryRows) {
      const lineRows = await client
        .select()
        .from(journalLines)
        .where(eq(journalLines.journalEntryId, er.id));
      entries.push(this.toJournalEntryDomain(er, lineRows));
    }

    return { entries, total };
  }

  async getFinancialSummary(
    tenantId: string,
    from?: Date,
    to?: Date,
    currency: string = "COP",
    tx?: any
  ): Promise<FinancialSummary> {
    const client = tx ?? db;
    const curr = currency.toUpperCase();

    // Ensure accounts exist
    await this.getOrCreateDefaultAccounts(tenantId, curr, client);

    const accountsList = await this.listAccounts(tenantId, curr, client);

    const dateConditions = [];
    if (from) {
      dateConditions.push(gte(journalEntries.occurredAt, from));
    }
    if (to) {
      dateConditions.push(lte(journalEntries.occurredAt, to));
    }

    // Aggregate debits and credits per financial account
    const linesAgg = await client
      .select({
        financialAccountId: journalLines.financialAccountId,
        direction: journalLines.direction,
        totalMinor: sql<string>`coalesce(sum(${journalLines.amountMinor}), 0)::text`,
      })
      .from(journalLines)
      .innerJoin(
        journalEntries,
        and(
          eq(journalLines.journalEntryId, journalEntries.id),
          eq(journalEntries.status, "POSTED"),
          eq(journalEntries.currency, curr),
          ...dateConditions
        )
      )
      .where(eq(journalLines.tenantId, tenantId))
      .groupBy(journalLines.financialAccountId, journalLines.direction);

    const sumsByAccount = new Map<string, { debits: bigint; credits: bigint }>();
    for (const row of linesAgg) {
      const current = sumsByAccount.get(row.financialAccountId) ?? {
        debits: BigInt(0),
        credits: BigInt(0),
      };
      const val = BigInt(row.totalMinor || "0");
      if (row.direction === "DEBIT") {
        current.debits += val;
      } else {
        current.credits += val;
      }
      sumsByAccount.set(row.financialAccountId, current);
    }

    let totalRevenueMinor = BigInt(0);
    let totalExpensesMinor = BigInt(0);
    let totalCashMinor = BigInt(0);
    let totalReceivablesMinor = BigInt(0);
    let totalPayablesMinor = BigInt(0);

    const accountBalances: FinancialAccountBalance[] = [];

    for (const acc of accountsList) {
      const sums = sumsByAccount.get(acc.id) ?? {
        debits: BigInt(0),
        credits: BigInt(0),
      };
      const debitMoney = Money.fromMinor(sums.debits, curr);
      const creditMoney = Money.fromMinor(sums.credits, curr);

      let netMinor = BigInt(0);
      if (acc.normalBalance === "DEBIT") {
        // ASSET, EXPENSE: Debit increases, Credit decreases
        netMinor = sums.debits - sums.credits;
      } else {
        // LIABILITY, EQUITY, REVENUE: Credit increases, Debit decreases
        netMinor = sums.credits - sums.debits;
      }

      const netBalance = Money.fromMinor(netMinor, curr);
      accountBalances.push({
        account: acc,
        debitTotal: debitMoney,
        creditTotal: creditMoney,
        netBalance,
      });

      if (acc.accountType === "REVENUE") {
        totalRevenueMinor += netMinor;
      } else if (acc.accountType === "EXPENSE") {
        totalExpensesMinor += netMinor;
      } else if (acc.accountCode === STANDARD_ACCOUNT_CODES.CASH) {
        totalCashMinor += netMinor;
      } else if (acc.accountType === "ASSET") {
        totalReceivablesMinor += netMinor;
      } else if (acc.accountType === "LIABILITY") {
        totalPayablesMinor += netMinor;
      }
    }

    const netIncomeMinor = totalRevenueMinor - totalExpensesMinor;

    return {
      tenantId,
      currency: curr,
      totalRevenue: Money.fromMinor(totalRevenueMinor, curr),
      totalExpenses: Money.fromMinor(totalExpensesMinor, curr),
      netIncome: Money.fromMinor(netIncomeMinor, curr),
      totalCash: Money.fromMinor(totalCashMinor, curr),
      totalReceivables: Money.fromMinor(totalReceivablesMinor, curr),
      totalPayables: Money.fromMinor(totalPayablesMinor, curr),
      accountBalances,
    };
  }

  async createExpense(expense: Expense, tx?: any): Promise<Expense> {
    const runInTx = async (trx: any) => {
      // 1. Get or create default accounts for tenant
      const defaultAccounts = await this.getOrCreateDefaultAccounts(
        expense.tenantId,
        expense.amount.currency,
        trx
      );

      const operatingExpenseAcc = defaultAccounts.get(STANDARD_ACCOUNT_CODES.OPERATING_EXPENSE);
      const cashAcc = defaultAccounts.get(STANDARD_ACCOUNT_CODES.CASH);

      if (!operatingExpenseAcc || !cashAcc) {
        throw new FinancialAccountNotFoundError(
          STANDARD_ACCOUNT_CODES.OPERATING_EXPENSE,
          expense.tenantId
        );
      }

      // 2. Build double-entry Journal Entry for Expense:
      // DEBIT Operating Expense (or Category Account)
      // CREDIT Cash
      const entryNumber = `EXP-JE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const journalEntry = new JournalEntry({
        tenantId: expense.tenantId,
        entryNumber,
        entryType: "EXPENSE",
        currency: expense.amount.currency,
        sourceType: "EXPENSE",
        description: `Expense: ${expense.description}`,
        createdByUserId: expense.createdByUserId,
        occurredAt: expense.incurredAt,
        lines: [
          new JournalLine({
            financialAccountId: operatingExpenseAcc.id,
            tenantId: expense.tenantId,
            direction: "DEBIT",
            amount: expense.amount,
            memo: expense.description,
          }),
          new JournalLine({
            financialAccountId: cashAcc.id,
            tenantId: expense.tenantId,
            direction: "CREDIT",
            amount: expense.amount,
            memo: `Payment for: ${expense.description}`,
          }),
        ],
      });

      const postedJe = await this.postJournalEntry(journalEntry, trx);

      // 3. Save Expense Row
      const [expenseRow] = await trx
        .insert(expenses)
        .values({
          tenantId: expense.tenantId,
          categoryId: expense.categoryId,
          description: expense.description,
          amountMinor: expense.amount.amountMinor,
          currency: expense.amount.currency,
          incurredAt: expense.incurredAt,
          status: expense.status,
          vendorName: expense.vendorName,
          receiptMediaId: expense.receiptMediaId,
          journalEntryId: postedJe.id,
          createdByUserId: expense.createdByUserId,
        })
        .returning();

      return this.toExpenseDomain(expenseRow);
    };

    if (tx) {
      return runInTx(tx);
    }
    return db.transaction(runInTx);
  }

  async findExpenseById(
    id: string,
    tenantId: string,
    tx?: any
  ): Promise<Expense | null> {
    const client = tx ?? db;
    const [row] = await client
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.tenantId, tenantId)))
      .limit(1);

    if (!row) return null;
    return this.toExpenseDomain(row);
  }

  async reverseExpense(
    expenseId: string,
    tenantId: string,
    actorUserId: string,
    reason: string,
    tx?: any
  ): Promise<Expense> {
    const runInTx = async (trx: any) => {
      const exp = await this.findExpenseById(expenseId, tenantId, trx);
      if (!exp) {
        throw new NotFoundError("Expense", expenseId);
      }
      if (exp.isReversed()) {
        throw new Error("Expense is already reversed.");
      }

      if (exp.journalEntryId) {
        await this.reverseJournalEntry(
          exp.journalEntryId,
          actorUserId,
          reason,
          trx
        );
      }

      const [updatedRow] = await trx
        .update(expenses)
        .set({
          status: "REVERSED",
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, expenseId))
        .returning();

      return this.toExpenseDomain(updatedRow);
    };

    if (tx) {
      return runInTx(tx);
    }
    return db.transaction(runInTx);
  }

  async listExpenses(
    tenantId: string,
    filter?: ExpenseFilter,
    tx?: any
  ): Promise<{ expenses: Expense[]; total: number }> {
    const client = tx ?? db;
    const conditions = [eq(expenses.tenantId, tenantId)];

    if (filter?.categoryId) {
      conditions.push(eq(expenses.categoryId, filter.categoryId));
    }
    if (filter?.status) {
      conditions.push(eq(expenses.status, filter.status));
    }
    if (filter?.from) {
      conditions.push(gte(expenses.incurredAt, filter.from));
    }
    if (filter?.to) {
      conditions.push(lte(expenses.incurredAt, filter.to));
    }

    const page = filter?.page && filter.page > 0 ? filter.page : 1;
    const limit = filter?.limit && filter.limit > 0 ? filter.limit : 50;
    const offset = (page - 1) * limit;

    const totalRes = await client
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(and(...conditions));

    const total = totalRes[0]?.count ?? 0;

    const rows = await client
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.incurredAt))
      .limit(limit)
      .offset(offset);

    return {
      expenses: rows.map((r: ExpenseRow) => this.toExpenseDomain(r)),
      total,
    };
  }

  async createSettlement(settlement: Settlement, tx?: any): Promise<Settlement> {
    const runInTx = async (trx: any) => {
      const settlementId = settlement.id || crypto.randomUUID();

      // Create accounts for both payer and payee workspaces
      const payerAccounts = await this.getOrCreateDefaultAccounts(
        settlement.fromTenantId,
        settlement.currency,
        trx
      );
      const payeeAccounts = await this.getOrCreateDefaultAccounts(
        settlement.toTenantId,
        settlement.currency,
        trx
      );

      // Payer Journal Entry:
      // DEBIT Settlement Clearing / Payable: settlement.amount
      // CREDIT Cash: settlement.amount
      const payerCashAcc = payerAccounts.get(STANDARD_ACCOUNT_CODES.CASH)!;
      const payerPayableAcc =
        payerAccounts.get(STANDARD_ACCOUNT_CODES.PROFESSIONAL_COMMISSION_PAYABLE) ??
        payerAccounts.get(STANDARD_ACCOUNT_CODES.SETTLEMENT_CLEARING)!;

      // Row-level lock on the payable account to prevent race condition over-settlement
      await trx
        .select()
        .from(financialAccounts)
        .where(eq(financialAccounts.id, payerPayableAcc.id))
        .for("update");

      // Verify that this settlement doesn't exceed the outstanding payable balance
      if (
        settlement.settlementType === "COMMISSION" ||
        settlement.settlementType === "CHAIR_RENT"
      ) {
        const [payerAgg] = await trx
          .select({
            credits: sql<string>`coalesce(sum(case when ${journalLines.direction} = 'CREDIT' then ${journalLines.amountMinor} else 0 end), 0)::text`,
            debits: sql<string>`coalesce(sum(case when ${journalLines.direction} = 'DEBIT' then ${journalLines.amountMinor} else 0 end), 0)::text`,
          })
          .from(journalLines)
          .innerJoin(
            journalEntries,
            and(
              eq(journalLines.journalEntryId, journalEntries.id),
              eq(journalEntries.status, "POSTED")
            )
          )
          .where(eq(journalLines.financialAccountId, payerPayableAcc.id));

        const credits = BigInt(payerAgg?.credits || "0");
        const debits = BigInt(payerAgg?.debits || "0");
        const outstandingPayable = credits - debits;

        if (settlement.amount.amountMinor > outstandingPayable) {
          throw new SettlementExceedsOutstandingError(
            `Settlement amount (${settlement.amount.amountMinor}) exceeds outstanding balance (${outstandingPayable})`
          );
        }
      }

      const payerJeNumber = `SETTLE-PAYER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const payerJe = new JournalEntry({
        tenantId: settlement.fromTenantId,
        entryNumber: payerJeNumber,
        entryType: "SETTLEMENT",
        currency: settlement.currency,
        sourceType: "SETTLEMENT",
        sourceId: settlementId,
        description: `Settlement payout to ${settlement.toTenantId}: ${settlement.notes || "Settlement"}`,
        createdByUserId: settlement.createdByUserId,
        metadata: {
          correlationId: settlementId,
          financialOperationId: `op_settle_${settlementId}`,
          counterpartyTenantId: settlement.toTenantId,
          role: "PAYER",
          settlementType: settlement.settlementType,
        },
        lines: [
          new JournalLine({
            financialAccountId: payerPayableAcc.id,
            tenantId: settlement.fromTenantId,
            direction: "DEBIT",
            amount: settlement.amount,
            memo: `Settlement liquidation payment`,
          }),
          new JournalLine({
            financialAccountId: payerCashAcc.id,
            tenantId: settlement.fromTenantId,
            direction: "CREDIT",
            amount: settlement.amount,
            memo: `Settlement cash disbursement`,
          }),
        ],
      });

      const postedPayerJe = await this.postJournalEntry(payerJe, trx);

      // Payee Journal Entry:
      // DEBIT Cash: settlement.amount
      // CREDIT Accounts Receivable / Commission Receivable: settlement.amount
      const payeeCashAcc = payeeAccounts.get(STANDARD_ACCOUNT_CODES.CASH)!;
      const payeeReceivableAcc =
        payeeAccounts.get(STANDARD_ACCOUNT_CODES.HOST_COMMISSION_RECEIVABLE) ??
        payeeAccounts.get(STANDARD_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE)!;

      const payeeJeNumber = `SETTLE-PAYEE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const payeeJe = new JournalEntry({
        tenantId: settlement.toTenantId,
        entryNumber: payeeJeNumber,
        entryType: "SETTLEMENT",
        currency: settlement.currency,
        sourceType: "SETTLEMENT",
        sourceId: settlementId,
        description: `Settlement receipt from ${settlement.fromTenantId}: ${settlement.notes || "Settlement"}`,
        createdByUserId: settlement.createdByUserId,
        metadata: {
          correlationId: settlementId,
          financialOperationId: `op_settle_${settlementId}`,
          counterpartyTenantId: settlement.fromTenantId,
          role: "PAYEE",
          settlementType: settlement.settlementType,
        },
        lines: [
          new JournalLine({
            financialAccountId: payeeCashAcc.id,
            tenantId: settlement.toTenantId,
            direction: "DEBIT",
            amount: settlement.amount,
            memo: `Settlement cash receipt`,
          }),
          new JournalLine({
            financialAccountId: payeeReceivableAcc.id,
            tenantId: settlement.toTenantId,
            direction: "CREDIT",
            amount: settlement.amount,
            memo: `Settlement liquidation receipt`,
          }),
        ],
      });

      await this.postJournalEntry(payeeJe, trx);

      // Insert settlement row
      const [settlementRow] = await trx
        .insert(settlements)
        .values({
          id: settlementId,
          fromTenantId: settlement.fromTenantId,
          toTenantId: settlement.toTenantId,
          affiliationId: settlement.affiliationId,
          currency: settlement.currency,
          amountMinor: settlement.amount.amountMinor,
          status: settlement.status,
          periodStart: settlement.periodStart,
          periodEnd: settlement.periodEnd,
          settlementType: settlement.settlementType,
          reference: settlement.reference,
          notes: settlement.notes,
          journalEntryId: postedPayerJe.id,
          createdByUserId: settlement.createdByUserId,
          confirmedAt: settlement.confirmedAt,
        })
        .returning();

      return this.toSettlementDomain(settlementRow);
    };

    if (tx) {
      return runInTx(tx);
    }
    return db.transaction(runInTx);
  }

  async findSettlementById(id: string, tx?: any): Promise<Settlement | null> {
    const client = tx ?? db;
    const [row] = await client
      .select()
      .from(settlements)
      .where(eq(settlements.id, id))
      .limit(1);

    if (!row) return null;
    return this.toSettlementDomain(row);
  }

  async confirmSettlement(
    settlementId: string,
    actorUserId: string,
    tx?: any
  ): Promise<Settlement> {
    const client = tx ?? db;
    const [row] = await client
      .update(settlements)
      .set({
        status: "CONFIRMED",
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(settlements.id, settlementId))
      .returning();

    if (!row) throw new NotFoundError("Settlement", settlementId);
    return this.toSettlementDomain(row);
  }

  async listSettlements(
    tenantId: string,
    filter?: SettlementFilter,
    tx?: any
  ): Promise<{ settlements: Settlement[]; total: number }> {
    const client = tx ?? db;
    const conditions = [
      sql`(${settlements.fromTenantId} = ${tenantId} OR ${settlements.toTenantId} = ${tenantId})`,
    ];

    if (filter?.affiliationId) {
      conditions.push(eq(settlements.affiliationId, filter.affiliationId));
    }
    if (filter?.status) {
      conditions.push(eq(settlements.status, filter.status));
    }
    if (filter?.from) {
      conditions.push(gte(settlements.createdAt, filter.from));
    }
    if (filter?.to) {
      conditions.push(lte(settlements.createdAt, filter.to));
    }

    const page = filter?.page && filter.page > 0 ? filter.page : 1;
    const limit = filter?.limit && filter.limit > 0 ? filter.limit : 50;
    const offset = (page - 1) * limit;

    const totalRes = await client
      .select({ count: sql<number>`count(*)::int` })
      .from(settlements)
      .where(and(...conditions));

    const total = totalRes[0]?.count ?? 0;

    const rows = await client
      .select()
      .from(settlements)
      .where(and(...conditions))
      .orderBy(desc(settlements.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      settlements: rows.map((r: SettlementRow) => this.toSettlementDomain(r)),
      total,
    };
  }

  async getSettlementBalance(
    hostTenantId: string,
    professionalTenantId: string,
    currency: string = "COP",
    tx?: any
  ): Promise<SettlementBalance> {
    const client = tx ?? db;
    const curr = currency.toUpperCase();

    // Query Host's accounts:
    // Host Commission Receivable (Asset - what professional owes host)
    // Professional Commission Payable (Liability - what host owes professional)
    const hostSummary = await this.getFinancialSummary(
      hostTenantId,
      undefined,
      undefined,
      curr,
      client
    );

    let hostReceivableMinor = BigInt(0);
    let hostPayableMinor = BigInt(0);

    for (const b of hostSummary.accountBalances) {
      if (
        b.account.accountCode === STANDARD_ACCOUNT_CODES.HOST_COMMISSION_RECEIVABLE ||
        b.account.accountCode === STANDARD_ACCOUNT_CODES.HOST_CHAIR_RENT_RECEIVABLE
      ) {
        hostReceivableMinor += b.netBalance.amountMinor;
      }
      if (
        b.account.accountCode === STANDARD_ACCOUNT_CODES.PROFESSIONAL_COMMISSION_PAYABLE ||
        b.account.accountCode === STANDARD_ACCOUNT_CODES.TIPS_PAYABLE
      ) {
        hostPayableMinor += b.netBalance.amountMinor;
      }
    }

    const hostReceivable = Money.fromMinor(
      hostReceivableMinor > BigInt(0) ? hostReceivableMinor : BigInt(0),
      curr
    );
    const hostPayable = Money.fromMinor(
      hostPayableMinor > BigInt(0) ? hostPayableMinor : BigInt(0),
      curr
    );
    const netOwedToProfessional = hostPayable.minus(hostReceivable);

    return {
      hostTenantId,
      professionalTenantId,
      currency: curr,
      hostReceivable,
      hostPayable,
      netOwedToProfessional,
    };
  }
}
