# ADR-023: Pure Derived Balances for Financial Statements & Dashboards

## Status
Approved

## Context
A major architectural dilemma in financial applications is whether to store a cached running balance column per account (requiring distributed row locks on every concurrent transaction) or to compute balances dynamically on read.

## Decision
1. **Source of Truth is Pure Ledger Lines**:
   - No table in the database contains a mutable `balance` or `current_balance` column.
   - Any financial summary (`FinancialSummary`, KPI cards, Chart of Accounts overview) is computed dynamically from posted `journal_lines` joined to `journal_entries WHERE status = 'POSTED'`.
2. **Account Normal Balance Rules**:
   - `ASSET` and `EXPENSE`: Net Balance = $\sum(\text{DEBIT}) - \sum(\text{CREDIT})$.
   - `LIABILITY`, `EQUITY`, and `REVENUE`: Net Balance = $\sum(\text{CREDIT}) - \sum(\text{DEBIT})$.
3. **Derived Metrics**:
   - Total Revenue = $\sum(\text{Net Balance of REVENUE accounts})$.
   - Total Expenses = $\sum(\text{Net Balance of EXPENSE accounts})$.
   - Net Income = Total Revenue - Total Expenses.
   - Cash = Net Balance of `1010_CASH`.
   - Receivables = $\sum(\text{Net Balance of non-cash ASSET accounts})$.
   - Payables = $\sum(\text{Net Balance of LIABILITY accounts})$.

## Consequences
- Impossible to suffer from balance corruption or desynchronization.
- Clean read-time aggregation supported by composite indexes `(tenant_id, created_at)` and `(financial_account_id, created_at)`.
