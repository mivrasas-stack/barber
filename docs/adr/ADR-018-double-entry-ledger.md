# ADR-018: Double-Entry Immutable Ledger Architecture

## Status
Approved

## Context
In early SaaS implementations or legacy POS platforms, account balances are often stored as mutable integer/decimal columns (e.g. `users.balance` or `tenants.wallet_balance`). In multi-tenant environments with independent contractors, host barbershops, commissions, and tips, mutable balance columns fail catastrophically:
1. They cannot explain *why* or *when* an amount changed.
2. Race conditions easily corrupt account balances under concurrent requests.
3. Partial failures leave balances in desynchronized states.
4. Forensic auditability and tax compliance are impossible to verify mathematically.

## Decision
We implement a strictly append-only, immutable **Double-Entry General Ledger** directly in PostgreSQL:
1. **Journal Entries (`journal_entries`)**:
   - Immutable header recording financial movements (`occurred_at`, `posted_at`, `entry_type`, `currency`, `source_type`, `source_id`).
   - Scoped per tenant (`tenant_id`).
   - Partial unique index on `(tenant_id, source_type, source_id, entry_type) WHERE status = 'POSTED'` prevents duplicate postings for the same source event.
2. **Journal Lines (`journal_lines`)**:
   - Each entry contains two or more lines (`DEBIT` or `CREDIT`).
   - Invariant: `SUM(DEBIT) === SUM(CREDIT)` evaluated at domain instantiation and database insertion.
   - Non-zero positive amounts stored as minor units (`BIGINT`).
3. **No Mutable Balance Column**:
   - Account balances are derived mathematically on read by aggregating debits and credits according to account normal balances (`ASSET` and `EXPENSE` = Debit - Credit; `LIABILITY`, `EQUITY`, and `REVENUE` = Credit - Debit).

## Consequences
- **Positive**: Absolute mathematical auditability, tamper resistance, and zero balance drift.
- **Positive**: Full idempotency and resilience to network retries.
- **Trade-off**: Balance queries require index-backed aggregations; mitigated with tenant and date compound indexes.
