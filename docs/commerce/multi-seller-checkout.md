# Commerce — Multi-Seller Checkout & Inter-Tenant Accounting

## Overview
Barber Paradise v2 enables a single cart at a physical host location to include items belonging to multiple distinct legal entities:
- Services performed by host employees (seller: Host Barber Shop)
- Services performed by affiliated solo professionals (seller: Solo Professional Workspace)
- Retail products owned by the host (seller: Host Barber Shop)
- Retail products owned by the solo professional (seller: Solo Professional Workspace)

## Accounting Flow
When a host cash register collects payment for an order containing foreign solo seller items:
1. **Host Ledger**:
   - `DEBIT 1010_CASH` (Total cash collected from customer).
   - `CREDIT 4020_PRODUCT_SALES_REVENUE` (Host's own products).
   - `CREDIT 2020_INTERCOMPANY_PAYABLES` (Funds collected on behalf of the solo professional).
2. **Professional Ledger**:
   - `DEBIT 1040_INTERCOMPANY_RECEIVABLES` (Owed by host).
   - `CREDIT 4020_PRODUCT_SALES_REVENUE` (Professional's retail revenue).
   - `DEBIT 5020_COST_OF_GOODS_SOLD` (Professional's inventory cost).
   - `CREDIT 1030_INVENTORY_ASSET` (Professional's stock reduction).

## Settlement
Periodic settlements between the host and affiliated professionals reconcile outstanding payable balances, ensuring zero leakage of collected customer funds.
