# Barber Paradise v2 — SaaS Subscription Billing Architecture

## 1. High-Level Overview
Stage 3C.2 introduces full SaaS subscription lifecycle management and recurring billing for Barber Paradise. It handles multi-tenant workspace monetization across traditional barbershops (`BUSINESS`) and independent solo professionals (`SOLO_PROFESSIONAL`).

```text
┌─────────────────────────────────────────────────────────────┐
│                    Subscription Engine                      │
├─────────────────┬─────────────────────┬─────────────────────┤
│ Subscription    │ Billing Cycle       │ Dunning &           │
│ Lifecycle       │ & Invoicing         │ Suspension          │
│ • Plans         │ • Period Snapshots  │ • Grace Period (3d) │
│ • Trials        │ • Idempotent Runs   │ • Auto-Suspension   │
│ • Up/Downgrades │ • Double-Entry      │ • Recovery Bypass   │
└────────┬────────┴──────────┬──────────┴──────────┬──────────┘
         │                   │                     │
         ▼                   ▼                     ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│ Entitlements    │ │ Payments Core   │ │ Double-Entry Ledger │
│ Resolver        │ │ (Wompi/Test)    │ │ (Platform Accounts) │
└─────────────────┘ └─────────────────┘ └─────────────────────┘
```

## 2. Core Entities
- **SubscriptionPlan (`subscription_plans`)**: Tier definitions (`SOLO_STARTER`, `SOLO_PRO`, `SOLO_ELITE`, `BUSINESS_BASIC`, `BUSINESS_SCALE`), pricing in minor units, billing periods (`MONTHLY`, `YEARLY`), and default trial days.
- **TenantSubscription (`tenant_subscriptions`)**: The subscription state attached to a workspace. Tracks operational status, trial end, billing cycle boundaries, and scheduled changes.
- **SubscriptionInvoice (`subscription_invoices`)**: Immutable historical billing document snapshotting the plan code, name, and unit prices.
- **SubscriptionStatusHistory (`subscription_status_history`)**: Append-only log of every lifecycle state transition.
- **BillingRun (`billing_runs`)**: Execution history of automated billing cycles.

## 3. Financial Integration
Platform licensing revenue is cleanly separated from customer shop revenue. All subscription settlements post double-entry journal entries to `1060_PAYMENT_PROVIDER_CLEARING` (DEBIT) and `4060_SAAS_SUBSCRIPTION_REVENUE` (CREDIT) with status `POSTED`.
