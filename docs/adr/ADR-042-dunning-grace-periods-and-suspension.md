# ADR-042: Dunning, Grace Periods, and Automated Suspension

## Status
Accepted (FROZEN in Stage 3C.2)

## Context
When an automated charge fails or an invoice goes unpaid, immediately suspending the tenant's workspace creates poor customer experience and operational friction. Conversely, failing to suspend delinquent accounts creates uncollectible platform debt. A structured dunning lifecycle with a defined grace period is required.

## Decision
1. **Dunning Lifecycle State Machine**:
   - `ACTIVE`: Fully paid and operational.
   - `PAST_DUE`: Due date has arrived without invoice payment. Grace period countdown initiated (`grace_ends_at = asOf + 3 days`). Workspace remains **operational** (`isOperational = true`).
   - `GRACE_PERIOD`: Explicit grace countdown state for critical alerts.
   - `SUSPENDED`: Grace period expired (`now > grace_ends_at`). Workspace is locked out of operational modules (`isOperational = false`).
   - `CANCELLED`: Subscription terminated at period end or by admin.
2. **Deterministic Lifecycle Progression (`ProcessSubscriptionLifecycleUseCase`)**:
   - Evaluates past-due subscriptions against policy.
   - Subscriptions past `graceEndsAt` are transitioned to `SUSPENDED`, `suspended_at` is stamped, status history is recorded, and `subscription.suspended.v1` is emitted.
   - Subscriptions with `cancel_at_period_end = true` reaching `current_period_end` are transitioned to `CANCELLED`.
3. **Immediate Reactivation on Payment**:
   - As soon as the delinquent invoice is settled, the subscription returns to `ACTIVE`, clearing `past_due_at`, `grace_ends_at`, and `suspended_at`.

## Consequences
- **Positive**: Professional grace experience giving tenants 3 days to update payment details before business interruption.
- **Positive**: Automated debt containment preventing delinquent platform usage.
