# Refunds and Financial Reversals

## Refund Rules & Invariants
1. **Source Intent Status**:
   - Only payments in `SUCCEEDED` status may be refunded.
2. **Amount Bounding**:
   - Total refunded cannot exceed total captured amount on the payment intent.
   - Partial refunds are permitted until the remaining balance reaches zero.
3. **Double-Entry Financial Reversal**:
   - The original sales journal entry is immutable and never edited or deleted.
   - A new journal entry is created with:
     - `DEBIT 4010_SERVICE_SALES_REVENUE` (or `4020_PRODUCT_SALES_REVENUE`)
     - `CREDIT 1060_PAYMENT_PROVIDER_CLEARING`
   - Both debit and credit balance identically in minor units.
4. **Physical Restocking**:
   - Financial refunds are decoupled from physical returns. If items are inspected and suitable for restocking, inventory managers execute a separate `RETURN_RESTOCK` stock movement.
