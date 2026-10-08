# ADR-040: Immutable Plan Snapshots in Invoices

## Status
Accepted (FROZEN in Stage 3C.2)

## Context
In a SaaS subscription billing system, pricing plans inevitably evolve over time: base prices increase, plan names are rebranded, or billing intervals change. If invoices dynamically referenced current plan prices, historical invoices and financial statements would be retroactively corrupted, violating accounting invariants.

## Decision
1. **Plan Snapshot at Invoice Creation Time**:
   - `subscription_invoices` stores explicit snapshot columns:
     - `plan_code_snapshot`: e.g. `"SOLO_PRO"`
     - `plan_name_snapshot`: e.g. `"Solo Pro"`
     - `billing_period_snapshot`: e.g. `"MONTHLY"`
   - `subscription_invoice_lines` stores `unit_price_minor` and `amount_minor` as fixed historical values.
2. **Strict Immutability**:
   - Updates to `subscription_plans` (e.g. updating `price_minor` or versioning plans) never mutate existing invoice rows or lines.
   - Any dispute or accounting audit reconstructs the exact commercial terms that were in effect at the moment the invoice was generated.

## Consequences
- **Positive**: Complete legal and accounting auditability.
- **Positive**: Zero retroactive alteration of billed amounts.
