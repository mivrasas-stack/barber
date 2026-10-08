# Payments Core Architecture (Stage 3C.1)

## Overview
Stage 3C.1 establishes the online payment processing infrastructure for Barber Paradise v2. It decouples asynchronous gateway lifecycles from synchronous POS orders, preserves double-entry financial invariants, prevents physical stock overselling through inventory reservations, and provides cryptographic webhook validation with replay protection.

## Core Aggregates & Relational Schema
The module introduces 6 dedicated tables in `src/infrastructure/database/schema/payments.ts`:

1. **`payment_intents`**:
   - Primary aggregate root coordinating checkout payment sessions.
   - Fields: `id`, `tenantId`, `collectorTenantId`, `orderId`, `amountMinor`, `currency`, `provider`, `status` (`PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `EXPIRED`), `idempotencyKey`, `metadata`, `createdAt`, `updatedAt`.
2. **`payment_attempts`**:
   - Individual gateway attempts under an intent.
   - Fields: `id`, `paymentIntentId`, `attemptNumber`, `providerTransactionId`, `status`, `paymentMethodType`, `gatewayResponseCode`, `rawResponse`.
3. **`payment_webhook_events`**:
   - Immutable log of all inbound webhook deliveries.
   - Fields: `id`, `provider`, `eventId`, `eventType`, `payload`, `signatureVerified`, `processedStatus`, `receivedAt`, `processedAt`.
   - Unique index: `(provider, event_id)` for replay protection.
4. **`refunds`**:
   - Formal refund transactions linked to captured intents.
   - Fields: `id`, `paymentIntentId`, `amountMinor`, `status`, `reason`, `providerRefundId`, `createdAt`.
5. **`payment_reconciliations`**:
   - Audit records of server-to-server transaction status queries.
   - Fields: `id`, `paymentIntentId`, `provider`, `internalStatus`, `providerStatus`, `discrepancyFound`, `discrepancyDetails`, `resolvedAt`.
6. **`inventory_reservations`**:
   - Short-lived physical stock holds during asynchronous checkout sessions.
   - Fields: `id`, `paymentIntentId`, `productVariantId`, `inventoryPositionId`, `quantity`, `status` (`ACTIVE`, `COMMITTED`, `RELEASED`, `EXPIRED`), `expiresAt`.

## Architectural Flow
```
User Checkout / POS
        ↓
CreatePaymentIntentUseCase
   ├── Validates Order & Server Amount
   ├── Atomically Reserves Stock (inventory_positions.reserved += qty)
   ├── Dispatches Gateway Transaction via IPaymentProvider
   └── Emits outbox event 'payment.intent.created'
        ↓
Customer Pays at Gateway (Async)
        ↓
Inbound Webhook (/api/v1/payments/webhooks/wompi)
   ├── Cryptographic Signature Check (SHA-256)
   ├── Database Replay Guard (payment_webhook_events)
   └── ProcessWebhookUseCase
         ├── Locks PaymentIntent (FOR UPDATE)
         ├── If APPROVED:
         │     ├── Commits Stock: reserved -= qty, on_hand -= qty, stock_movements (SALE)
         │     ├── Completes Order & Linked Appointment
         │     └── Double-Entry Posting:
         │           DEBIT 1060_PAYMENT_PROVIDER_CLEARING
         │           CREDIT 4010_SERVICE_SALES_REVENUE / 4020_PRODUCT_SALES_REVENUE
         │           DEBIT 5020_COST_OF_GOODS_SOLD (if product)
         │           CREDIT 1030_INVENTORY_ASSET (if product)
         └── If DECLINED:
               └── Releases Stock: reserved -= qty, available restored
```
