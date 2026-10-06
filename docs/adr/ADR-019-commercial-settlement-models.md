# ADR-019: Commercial Settlement Models & Deterministic Rounding

## Status
Approved

## Context
Commercial agreements between barbershops (hosts) and independent professionals vary across three distinct industry models:
1. `COMMISSION`: A percentage of service revenue is retained by the host as compensation for facility usage and infrastructure.
2. `CHAIR_RENTAL`: The professional pays a fixed periodic fee (e.g., monthly canon) and keeps 100% of their service revenue.
3. `HYBRID`: The professional pays a reduced percentage on services AND a fixed monthly rental canon.

Floating-point operations introduce rounding drift and financial inaccuracies over thousands of service transactions.

## Decision
1. **Basis Points Representation**:
   - Commission rates are stored in basis points (`commission_basis_points`, integer where `10,000 bp = 100.00%`).
   - Example: 20.00% is stored as `2000`.
2. **Deterministic Rounding (`HALF_UP`)**:
   - All arithmetic uses integer arithmetic on BigInt minor units.
   - Quotients and remainders are evaluated: remainders $\ge 5,000$ basis point units round up by 1 minor unit.
3. **Chair Rental Independence**:
   - In `CHAIR_RENTAL`, service commission is strictly $0\%$. 100% of service revenue is credited to the professional. Fixed chair rent is posted as an independent periodic obligation or separate settlement transfer, never deducted service-by-service.
4. **Tips Separation**:
   - Customer tips belong 100% to the professional who performed the service, with 0% host commission applied.

## Consequences
- Guaranteed reproducibility across backend, reporting, and audits.
- No fractional cent or rounding discrepancy errors.
