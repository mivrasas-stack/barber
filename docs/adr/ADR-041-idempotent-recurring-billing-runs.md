# ADR-041: Idempotent Recurring Billing Runs

## Status
Accepted (FROZEN in Stage 3C.2)

## Context
Automated billing cycles are typically executed periodically by cron jobs or background schedulers. Network timeouts, worker crashes, or concurrent executions could accidentally trigger multiple billing runs for the same period, risking duplicate invoices, duplicate customer charges, or out-of-balance ledgers.

## Decision
1. **PostgreSQL Unique Period Constraint**:
   - In `subscription_invoices`:
     ```sql
     UNIQUE (subscription_id, period_start, period_end)
     ```
   - This database-level invariant makes duplicate invoice creation impossible for any subscription billing cycle.
2. **Advisory Lock & Active Run Registry**:
   - `billing_runs` tracks active executions (`status = 'RUNNING'`).
   - `RunBillingCycleUseCase` checks for currently active runs and throws `BillingRunConflictError` unless explicitly forced.
3. **Tenant Failure Isolation**:
   - When iterating over eligible tenants, individual tenant exceptions are captured into `run.summary.errors` without aborting the billing run for other tenants.

## Consequences
- **Positive**: 50 concurrent billing requests produce exactly 1 invoice per period.
- **Positive**: Resilient background execution with failure containment.
