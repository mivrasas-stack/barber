# Commerce — Inventory & Financial Reconciliation

## Overview
Stage 3B guarantees mathematical consistency between physical stock in warehouses/workstations and the financial general ledger.

## Reconciliation Invariants

### 1. Physical Stock Invariant
For every combination of `(owner_tenant_id, location_id, product_variant_id)`:
$$\text{inventory\_positions.on\_hand} = \sum_{\text{stock\_movements}} \text{quantity\_delta}$$

### 2. Double-Entry Balance Invariant
For all posted journal entries created by the POS:
$$\sum_{\text{lines}} \text{debit\_amount\_minor} = \sum_{\text{lines}} \text{credit\_amount\_minor}$$

### 3. Inventory Valuation & COGS Invariant
For any completed order item selling $N$ units of a product variant:
$$\Delta(\text{Inventory Asset}) = - (N \times \text{unit\_cost\_snapshot\_minor})$$
$$\text{COGS Recognized} = N \times \text{unit\_cost\_snapshot\_minor}$$

### 4. Single Financial Source Invariant
For any service completed via an order:
$$\text{source\_type} = \text{'ORDER'}$$
Direct completion via `PostServiceRevenueUseCase` is strictly blocked with `ConflictError`.

## Automated Verification
These invariants are continuously certified by automated suites:
- `tests/stage3b-reconciliation.test.ts`
- `tests/stage3b-final-certification.test.ts`
- `tests/stage3b-pos-concurrency.test.ts`
