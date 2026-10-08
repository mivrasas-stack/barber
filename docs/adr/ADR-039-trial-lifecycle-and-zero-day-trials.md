# ADR-039: Trial Lifecycle and Zero-Day Trials

## Status
Accepted (FROZEN in Stage 3C.2)

## Context
When tenants register in Barber Paradise, they are typically offered a free trial period (e.g. 14 days) to explore the system before being charged. However, certain commercial configurations require:
- Custom trial durations (e.g. promotional 30-day trials).
- Zero-day trials (e.g. enterprise or immediate-pay workspaces where credit card or prepayment is mandatory from day one).
- Automatic expiration when trial ends without silent continuation of free service.

## Decision
1. **Configurable Trial Duration**:
   - `subscription_plans` defines a default `trial_days` (e.g. 14).
   - Subscription creation supports explicit overrides via `trialDays`.
2. **Zero-Day Trial Handling**:
   - If `trialDays === 0`, `trialEndsAt` is set to `null` and `currentPeriodEnd` defaults to `now`.
   - The subscription is immediately eligible for invoice generation upon creation.
3. **Automated Trial Expiration (`ExpireTrialsUseCase`)**:
   - Subscriptions in `TRIALING` status where `trialEndsAt <= asOf` are evaluated.
   - For free plans (`priceMinor <= 0`), the subscription automatically converts to `ACTIVE`.
   - For paid plans, the engine generates an opening invoice for the first paid period, transitions the subscription to `PAST_DUE` with an active grace period, records status history, and emits `subscription.trial_expired.v1`.

## Consequences
- **Positive**: Strict, deterministic conversion from trial to billing.
- **Positive**: Zero possibility of perpetual unbilled access.
