# Subscription Lifecycle & State Machine

## 1. Lifecycle States
A `TenantSubscription` transitions through the following formal states:

```text
               ┌─────────────┐
               │  TRIALING   │ (14 days default, or 0 days)
               └──────┬──────┘
                      │ Trial expires
                      ▼
               ┌─────────────┐
               │  PAST_DUE   │ (Grace period: 3 days)
         ┌────►│ (Operational│
         │     └──────┬──────┘
Payment  │            │ Grace period expires
recovers │            ▼
         │     ┌─────────────┐
         │     │  SUSPENDED  │ (Non-operational; billing open)
         │     └──────┬──────┘
         │            │
         └────────────┤
                      ▼
               ┌─────────────┐
               │   ACTIVE    │ (Fully operational, invoices paid)
               └──────┬──────┘
                      │ cancel_at_period_end === true && period ends
                      ▼
               ┌─────────────┐
               │  CANCELLED  │ (Terminal state)
               └─────────────┘
```

## 2. Operational vs Non-Operational Access
- **Operational (`isOperational === true`)**:
  - `TRIALING`, `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD`.
  - Modules granted by the plan are functional.
- **Non-Operational (`isOperational === false`)**:
  - `SUSPENDED`, `CANCELLED`.
  - All paid operational modules return `isEnabled = false` with source `SUBSCRIPTION_REQUIRED`.

## 3. Plan Changes
- **Upgrade**: If immediate or if in trial/higher tier, the new plan takes effect immediately.
- **Downgrade**: Stored in `pendingPlanId` and `pendingPlanEffectiveAt = currentPeriodEnd`. Applied automatically when the next billing cycle invoice is paid.
