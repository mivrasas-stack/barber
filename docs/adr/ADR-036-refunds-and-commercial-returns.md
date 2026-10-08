# ADR-036: Partial and Full Refunds, Double-Entry Reversals & Return Integrity

## Status
Approved

## Context
Customers may request full or partial refunds for cancelled services or returned merchandise after an online payment has succeeded.
Naive systems modify historical receipts or delete journal entries. This destroys accounting audit trails and creates discrepancies between bank statements and system records.

## Decision
1. **Explicit Refund Aggregate**:
   - Every refund is tracked in `refunds` table with `amount_minor`, `status`, `reason`, and reference to `payment_intent_id`.
2. **Cumulative Amount Guard**:
   -$$\sum \text{Refunds} \le \text{PaymentIntent.amount\_minor}$$
   - Any attempt to refund more than the net captured amount is strictly rejected with `EXCEEDS_REFUNDABLE_AMOUNT`.
3. **Double-Entry Financial Reversal**:
   - Refunds generate a new compensating `journal_entries` record with `source_type = 'REFUND'`:
     - `DEBIT 4010_SERVICE_SALES_REVENUE` (or `4020_PRODUCT_SALES_REVENUE`) for refund amount.
     - `CREDIT 1060_PAYMENT_PROVIDER_CLEARING` for refund amount.
   - Historical sales entries remain 100% immutable.
4. **Physical Inventory Return Separation**:
   - A financial refund does not automatically assume physical merchandise is returned in sellable condition.
   - Restocking requires an explicit commercial return transaction posting a `RETURN_RESTOCK` stock movement, ensuring damaged or unsellable goods are not falsely reintroduced into active inventory.

## Consequences
- Guaranteed mathematical consistency between gateway payout reconciliations and general ledger.
- Full compliance with immutable double-entry accounting standards.
- Exact audit tracking of user roles authorizing financial refunds.
