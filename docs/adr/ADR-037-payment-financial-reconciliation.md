# ADR-037: Payment Financial Reconciliation, Discrepancy Auditing & Provider Clearing

## Status
Approved

## Context
Payment gateways maintain funds in transit (clearing accounts) before batch-depositing them into the merchant's commercial bank account, minus payment processing fees. Discrepancies may arise due to dropped webhooks, unhandled chargebacks, fee miscalculations, or timing differences between provider settlement and internal ledger posting.

## Decision
1. **Dedicated Ledger Accounts**:
   - `1060_PAYMENT_PROVIDER_CLEARING`: Asset account tracking gross funds held by the payment gateway.
   - `5050_PAYMENT_PROCESSING_FEES`: Expense account tracking gateway transaction fees.
2. **Active Server-to-Server Reconciliation (`ReconcilePaymentUseCase`)**:
   - Compares internal `PaymentIntent` status and amounts with real-time provider state fetched via `IPaymentProvider.queryTransaction()`.
3. **Discrepancy Logging & Auto-Resolution**:
   - Records all reconciliation audits in `payment_reconciliations`.
   - If provider confirms `APPROVED` but internal state was `PROCESSING` (e.g. dropped webhook):
     - The use case triggers catch-up completion: posts double-entry ledger lines, commits inventory reservations, and completes the order.
   - If provider status diverges from internal terminal status (e.g. chargeback):
     - The discrepancy is flagged with `discrepancy_details` for manual financial review.

## Consequences
- Complete transparency into funds held at payment gateways.
- Automatic recovery and self-healing for dropped webhook deliveries.
- Full readiness for bank payout batch reconciliations.
