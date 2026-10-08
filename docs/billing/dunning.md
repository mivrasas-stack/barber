# Dunning & Grace Periods

## 1. Dunning Policy
Default configuration (`DEFAULT_BILLING_POLICY`):
- `gracePeriodDays`: 3 days.
- `maxPaymentAttempts`: 4 attempts.
- `suspendAfterPastDueDays`: 7 days.
- `retryScheduleDays`: `[0, 1, 3, 7]`.

## 2. Notification & Warning Flow
- **Day 0**: Invoice generated / payment fails. Status -> `PAST_DUE`. Grace period ends at `now + 3 days`.
- **Days 1–3 (Grace Period)**: Dashboard shows amber banner with countdown timer. Workspace remains operational.
- **Day 3+ (Suspension)**: Grace period expires. Status -> `SUSPENDED`. Operational features locked. Rose banner displayed with 1-click payment resolution.
- **Recovery**: Settling invoice immediately clears suspension and restores operational status.
