# ADR-034: Payment Idempotency, Concurrency Control & Unknown Outcomes

## Status
Approved

## Context
Network timeouts, server restarts during gateway calls, and double-clicks by users can create duplicate payment attempts or leave transactions in indeterminate states. In payments, treating an unknown outcome as a failure might lead to double-charging a customer whose funds were already debited at the provider.

## Decision
1. **Idempotency Keys**:
   - `CreatePaymentIntent` requires an `Idempotency-Key` or reuses deterministic order keys. Re-issuing the request with the same key returns the existing `PaymentIntent` without creating duplicate records.
2. **Pessimistic Row Locking (`FOR UPDATE`)**:
   - Webhook processing, cancellation, and refund operations lock the `payment_intents` row inside PostgreSQL serializable/read-committed transactions, preventing race conditions between concurrent webhooks or parallel user cancellations.
3. **Explicit Handling of Unknown Outcomes**:
   - When a gateway returns network errors or HTTP 5xx during payment or refund initiation, the internal attempt is marked as `UNKNOWN` / `PENDING_RECONCILIATION`.
   - The transaction is neither cancelled nor finalized until an active server-to-server query reconciles its actual status at the provider.

## Consequences
- No duplicate charges or orphaned intents under high concurrency or network instability.
- Deterministic recovery from distributed system ambiguities.
- Complete auditability of pending and resolved transaction anomalies.
