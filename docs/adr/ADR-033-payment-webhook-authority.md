# ADR-033: Payment Webhook Authority, Cryptographic Verification & Replay Protection

## Status
Approved

## Context
Payment gateways deliver asynchronous transaction outcomes via HTTP webhooks. Public webhook endpoints are vulnerable to forgery, spoofing, network retries, and out-of-order delivery. If an unverified or replayed webhook were processed, malicious actors could mark orders as paid without real funds, or trigger duplicate accounting entries.

## Decision
1. **Zero Client Authority**:
   - Client redirect URLs (e.g. `return_url`) are considered purely navigational. No order is fulfilled, and no inventory or ledger entry is modified based on frontend redirects.
2. **Cryptographic Signature Verification**:
   - All inbound webhooks must supply valid cryptographic signatures. Unsigned or mismatched signatures are rejected with HTTP 401/400 and logged to security audits.
3. **Database-Enforced Replay Protection**:
   - Every inbound webhook payload is stored in `payment_webhook_events` with unique constraint on `(provider, event_id)`.
   - Concurrent or retried webhooks with identical `event_id` are detected immediately. Duplicate deliveries are acknowledged with HTTP 200 without executing state transitions twice.
4. **Out-of-Order Handling**:
   - Webhook processing checks current `PaymentIntent` status. Transitions from terminal states (`SUCCEEDED`, `REFUNDED`) are rejected or treated as idempotent no-ops.

## Consequences
- Guaranteed cryptographic authenticity for all online settlement updates.
- Total immunity against replay attacks and network duplication.
- Server-side asynchronous notification is the sole source of payment completion truth.
