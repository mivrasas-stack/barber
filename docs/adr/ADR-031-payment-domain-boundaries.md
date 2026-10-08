# ADR-031: Payments Domain Boundaries & Separation from Commerce and Ledger

## Status
Approved

## Context
Online payment processing introduces asynchronous lifecycles, external latency, gateway outages, customer drop-offs, and third-party provider semantics (e.g. Wompi, card processors). If payment logic is tightly coupled into POS orders or directly mutates financial ledger balances before settlement confirmation, the system risks race conditions, ghost orders, ledger contamination, and phantom inventory consumption.

## Decision
1. **Decoupled Domain Boundary**:
   - The `payments` module operates as an independent bounded context managing payment intents, attempts, provider communication, and webhooks.
   - Orders (`commerce` module) and Journal Entries (`finance` module) remain strictly independent.
2. **Payment Intent as State Coordinator**:
   - An order triggers a `PaymentIntent` with fixed server-validated amounts and currency.
   - The order remains in `PENDING` status while payment attempts are processed asynchronously.
3. **No Direct Ledger Mutation Before Verification**:
   - Neither payment creation nor client redirects post to the double-entry journal.
   - Double-entry posting occurs strictly upon verified cryptographic confirmation (`SUCCEEDED`) or via verified reconciliation.
4. **Clean Abstraction Over Providers**:
   - Domain logic interacts only with `IPaymentProvider` and `IPaymentRepository` interfaces, keeping provider SDKs and HTTP clients at the infrastructure layer.

## Consequences
- Orders and ledger invariants cannot be corrupted by external gateway network errors or cancelled checkout sessions.
- Clean separation allows plugging multiple payment gateways (Wompi, Mercado Pago, Stripe) without altering commerce or accounting invariants.
- Full transactional safety and auditable boundaries.
