# Invoices & Billing Cycles

## 1. Invoice Numbering & Period Uniqueness
Invoices follow a strict numbering scheme:
```text
INV-YYYYMM-{TENANT_PREFIX}-{RANDOM_HEX}
Example: INV-202610-8A7B2C-F41A
```

Database invariant:
```sql
UNIQUE (subscription_id, period_start, period_end)
```
Guarantees that under high concurrency (e.g. 50 simultaneous cycle runners), exactly one invoice is generated per billing period.

## 2. Line Items & Snapshots
Each invoice captures:
- `plan_code_snapshot`: Plan code at invoice generation.
- `plan_name_snapshot`: Plan name at invoice generation.
- `billing_period_snapshot`: `MONTHLY` or `YEARLY`.
- Lines containing `quantity`, `unit_price_minor`, `amount_minor`, and `line_type` (`PLAN_CHARGE`).

## 3. Invoice Settlement
When an invoice is paid (online checkout or payment gateway):
1. `subscription_invoices.status` updates to `PAID` with `paid_at = now()`.
2. `tenant_subscriptions.status` updates to `ACTIVE`.
3. `tenant_subscriptions.current_period_start` and `current_period_end` advance to the billed period.
4. Any scheduled `pending_plan_id` is promoted to active `plan_id`.
5. Double-entry journal entry is posted to the platform ledger.
