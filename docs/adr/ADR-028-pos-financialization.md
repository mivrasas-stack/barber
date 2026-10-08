# ADR-028: Transactional POS Checkout, Atomicity Boundary & Double-Entry Integration

## Status
Approved

## Context
A Point of Sale (POS) checkout in Barber Paradise v2 is a mission-critical cross-domain coordinator. It touches six distinct domains simultaneously:
1. Commerce (`orders`, `order_items`, `order_tenders`)
2. Physical Inventory (`inventory_positions`, `stock_movements`)
3. Scheduling (`appointments`, `appointment_status_history`)
4. Financial Core (`journal_entries`, `journal_lines`)
5. Audit & Compliance (`audit_logs`)
6. Event Propagation (`outbox_events`)

If a failure occurs during financial posting or event generation, failing to rollback inventory deductions would produce ghost stock deductions and unbalance the ledger.

## Decision
1. **Single ACID Transaction Boundary**:
   - `CompleteOrderUseCase` executes all mutations within a single PostgreSQL database transaction (`db.transaction`).
   - Any unhandled exception, balance imbalance, or concurrency conflict automatically triggers a complete database rollback.
2. **Idempotency Fingerprinting**:
   - Every checkout accepts an `Idempotency-Key` HTTP header.
   - The payload fingerprint (incorporating `orderId`, sorted `tenders`, and `notes`) is hashed using SHA-256.
   - Concurrent duplicate requests with the same key serialize on the order lock: exactly 1 request executes, and 49 concurrent requests safely replay the completed order without duplicate stock deductions or duplicate journal postings.
   - Requests reusing the same key with different payloads fail immediately with `ConflictError` (HTTP 409).
3. **Reversal / Return Symmetry**:
   - A completed order can be refunded via `ReturnOrderUseCase`.
   - The refund operation restores physical stock with `SALE_RETURN` movements and posts symmetrical `REVERSAL` journal entries, setting order status to `REFUNDED`.

## Consequences
- Guaranteed zero ghost records or orphan financial journals.
- Strict compliance with double-entry balance invariants.
- High resilience under network retries and unstable POS hardware connections.
