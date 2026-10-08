# Payment Reconciliation & Clearing

## Reconciliation Process
1. **Active Server Query**:
   - `ReconcilePaymentUseCase` queries the external provider via `IPaymentProvider.queryTransaction()`.
2. **Discrepancy Matrix**:
   - **Internal `PROCESSING` vs Provider `APPROVED`**:
     - Webhook was lost or delayed. The reconciliation use case automatically triggers fulfillment, posting ledger lines and committing stock reservations.
   - **Internal `PROCESSING` vs Provider `DECLINED` / `VOID`**:
     - The use case marks the intent `FAILED` and releases inventory reservations.
   - **Status Match**:
     - Recorded in `payment_reconciliations` with `discrepancyFound: false`.
   - **Mismatched Amounts or Unhandled External Statuses**:
     - Flagged with `discrepancyFound: true` and serializable JSON details for operator review.
3. **Clearing Account Settlement**:
   - Funds captured online remain in `1060_PAYMENT_PROVIDER_CLEARING` until external bank payout reports are reconciled.
   - Bank transfers move balance from clearing to primary bank accounts:
     - `DEBIT 1010_CASH` / `1020_BANK_RECEIVABLES` (net deposit)
     - `DEBIT 5050_PAYMENT_PROCESSING_FEES` (gateway fee)
     - `CREDIT 1060_PAYMENT_PROVIDER_CLEARING` (gross transaction amount)
