# ADR-025: Inventory Ledger, Physical Positions, and Negative Stock Prohibition

## Status
Approved

## Context
Retail operations in busy barber shops frequently encounter concurrency races where multiple chairs attempt to sell the final unit of a popular product simultaneously. Furthermore, inventory shrinkage, unrecorded transfers, and race conditions can result in negative stock if balances are updated naively without transactional serialization.

## Decision
1. **Dual-Layer Inventory Architecture**:
   - **Kardex Event Ledger (`inventory_movements`)**: Immutable event log recording every quantity change with `movement_type` (`PURCHASE_RECEIPT`, `SALE_DEDUCTION`, `SALE_RETURN`, `ADJUSTMENT_INCREASE`, `ADJUSTMENT_DECREASE`, `INTERNAL_TRANSFER_IN`, `INTERNAL_TRANSFER_OUT`), quantity delta, unit cost snapshot, and source transaction linkage.
   - **Materialized Stock Positions (`inventory_positions`)**: High-performance operational state tracking current physical availability:
     $$\text{available} = \text{on\_hand} - \text{reserved}$$
     Scoped strictly by `(owner_tenant_id, location_id, product_variant_id)`.
2. **Absolute Negative Stock Prohibition**:
   - PostgreSQL table constraint: `CHECK (on_hand >= 0)`.
   - Every stock deduction is serialized using `SELECT ... FROM inventory_positions ... FOR UPDATE`.
   - If requested quantity exceeds available stock, the use case immediately rejects the operation with `INSUFFICIENT_STOCK` (HTTP 409 / ConflictError).
3. **Ledger Reconciliation Invariant**:
   - For every physical position:
     $$\text{on\_hand} = \sum_{\text{movements}} \text{quantity\_delta}$$
   - Any discrepancy indicates ledger corruption and blocks reconciliation certification.

## Consequences
- Guaranteed mathematical reproducibility of physical stock.
- High-concurrency protection against overselling under heavy POS usage.
- Strict audit trail tracking who moved what, when, where, and why.
