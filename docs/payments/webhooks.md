# Webhook Handling, Verification & Replay Protection

## Endpoints
- Production: `POST /api/v1/payments/webhooks/wompi`
- Test / CI: `POST /api/v1/payments/webhooks/test`

## Invariant Protections
1. **Zero Client Authority**:
   - Webhook processing does not trust or read query params from the client. Everything is read from the authenticated raw payload body and verified against cryptographic signatures.
2. **Replay Protection**:
   - Each event carries a unique identifier (`event_id` in Wompi / test payloads).
   - Inbound events are immediately inserted into `payment_webhook_events` with unique constraint `(provider, event_id)`.
   - If an event arrives with a duplicate ID, the route handler intercepts the unique violation, immediately acknowledges with HTTP 200 `status: 'DUPLICATE_IGNORED'`, and stops downstream processing.
3. **Idempotent Transitions**:
   - If a webhook for an already `SUCCEEDED` intent arrives, the use case safely no-ops without creating duplicate stock movements or journal entries.
