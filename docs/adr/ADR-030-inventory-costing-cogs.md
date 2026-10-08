# ADR-030: Inventory Cost Basis, Historical Snapshotting & COGS Recognition

## Status
Approved

## Context
A product sale produces two distinct accounting effects that must never be conflated:
1. **Commercial Revenue Recognition**:
   - The exchange of cash or receivable for product goods at current retail sale price.
2. **Inventory Asset Reduction & COGS Recognition**:
   - The expensing of the historical acquisition cost of the physical units sold.

Moreover, supplier prices fluctuate over time. If product catalog costs were joined dynamically to compute historical COGS, past financial reports would shift retroactively, violating accounting immutability.

## Decision
1. **Historical Cost Snapshotting**:
   - When an item is added to an order, `unit_cost_snapshot_minor` is permanently captured in `order_items`.
   - Subsequent changes to `product_variants.cost_minor` have zero effect on existing orders or historical profit calculations.
2. **Dual Accounting Posting at POS Checkout**:
   - For every product sold, the ledger records:
     - **Revenue Recognition**:
       - `DEBIT 1010_CASH` (or `1020_BANK_RECEIVABLES`) for total sale amount.
       - `CREDIT 4020_PRODUCT_SALES_REVENUE` for total sale amount.
     - **COGS Recognition**:
       - `DEBIT 5020_COST_OF_GOODS_SOLD` for total historical cost.
       - `CREDIT 1030_INVENTORY_ASSET` for total historical cost.
3. **Gross Margin Calculation**:
   $$\text{Gross Margin} = \text{Product Sales Revenue} - \text{Cost of Goods Sold}$$

## Consequences
- Guaranteed historical immutability of financial statements.
- Exact gross margin and profitability reporting per product line, seller, and location.
- Certified double-entry balance where debits equal credits on every posted journal entry.
