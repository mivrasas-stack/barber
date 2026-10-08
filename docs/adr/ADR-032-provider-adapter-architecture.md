# ADR-032: Provider Adapter Architecture & Polymorphic Dispatching

## Status
Approved

## Context
Payment gateways differ in signing algorithms, payload schemas, transaction statuses, and error codes. Directly inlining gateway-specific logic into use cases would create high coupling and fragile webhook handlers.

## Decision
1. **IPaymentProvider Port**:
   - Every provider adapter implements a unified interface:
     - `createTransaction(intent)`: initializes gateway transaction.
     - `verifyWebhook(payload, signature, headers)`: cryptographically verifies authenticity.
     - `queryTransaction(providerTransactionId)`: active server-to-server status check.
     - `requestRefund(providerTransactionId, amountMinor, reason)`: issues gateway refund.
2. **PaymentProviderFactory**:
   - Dynamic instantiation based on provider enum (`WOMPI`, `TEST`).
   - Tenant-scoped or global configuration injection (integrity secrets, merchant keys).
3. **Deterministic Test Adapter**:
   - `TestPaymentProvider` provides fully deterministic simulations for integration testing, synthetic webhook emissions, and fault injection without calling real external APIs.
4. **Wompi Adapter**:
   - Full implementation of Wompi's SHA-256 integrity signature concatenation (`reference + amountInCents + currency + integritySecret`) and webhook event checksum verification (`event.data.transaction.id + event.data.transaction.status + event.data.transaction.amount_in_cents + timestamp + eventSecret`).

## Consequences
- Single point of integration for new payment gateways.
- High testability: automated test suites run hermetically using `TestPaymentProvider`.
- Production gateways strictly adhere to cryptographic signing and verification specifications.
