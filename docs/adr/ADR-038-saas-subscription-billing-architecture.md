# ADR-038: SaaS Subscription Billing Architecture

## Status
Accepted (FROZEN in Stage 3C.2)

## Context
Barber Paradise v2 operates as a multi-tenant platform serving two types of tenants: traditional multi-chair barbershops (`BUSINESS`) and independent solo professionals (`SOLO_PROFESSIONAL`). To monetize the platform, we require a robust, automated subscription billing engine that supports trials, recurring plan charges, immutable invoicing, dunning, grace periods, automated service suspension, and entitlement enforcement.

Crucially, customer haircut payments (`commerce` / `orders` / `payments.core`) must be strictly segregated from SaaS platform subscription payments (`tenants` / `subscriptions` / `payments.saas_revenue`).

## Decision
1. **Bounded Context Segregation**:
   - Customer checkout payments belong to workspace merchants (the shop or professional).
   - Subscription payments belong to the platform owner (`Barber Paradise Platform`).
   - `payment_intents` records carry a typed `payment_purpose` column: `"ORDER_PAYMENT"` vs `"SUBSCRIPTION_INVOICE"`.
   - `order_id` is nullable for subscription payments, and `subscription_invoice_id` links directly to the billed invoice.

2. **Core Domain Model**:
   - `SubscriptionPlan`: Configurable pricing tier, audience, billing period, and trial configuration with versioning.
   - `TenantSubscription`: Active workspace subscription tracking current status, lifecycle timestamps, trial period, billing cycle dates, and scheduled plan changes.
   - `SubscriptionInvoice`: Immutable snapshot of a billed period with sequential invoice numbering, due date, line items, and payment status.
   - `SubscriptionStatusHistory`: Append-only audit trail recording every state transition, actor, and underlying cause.
   - `BillingRun`: Atomic execution log for batch billing cycle runners.

3. **Re-use of Payments Core**:
   - Rather than building a parallel gateway integration, subscription invoice payments reuse the existing provider adapters (`WompiPaymentProvider` and `TestPaymentProvider`) via `PaymentProviderFactory`.
   - Webhook processing in `ProcessWebhookUseCase` branches cleanly based on `intent.paymentPurpose` / `intent.subscriptionInvoiceId`.

## Consequences
- **Positive**: Clean separation of financial concerns between marketplace commerce and platform software licensing.
- **Positive**: Complete auditability of subscription state changes and invoices.
- **Negative**: Requires careful entitlement middleware routing so suspended tenants can access billing without hitting operational 403 blocks.
