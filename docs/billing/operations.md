# Billing Operations & Administration

## 1. Running the Billing Cycle
Platform administrators can trigger automated billing cycle executions via API:
```http
POST /api/v1/admin/billing/run
Content-Type: application/json

{
  "asOf": "2026-10-08T00:00:00Z",
  "force": false
}
```

The execution pipeline:
1. `ExpireTrialsUseCase`: Converts expired trials to `PAST_DUE` with opening invoices.
2. `GenerateDueInvoicesUseCase`: Creates next billing period invoices for mature subscriptions.
3. `ProcessSubscriptionLifecycleUseCase`: Evaluates grace period expirations (`-> SUSPENDED`) and scheduled cancellations (`-> CANCELLED`).

## 2. Platform Admin Actions
- **Extend Trial**: `POST /api/v1/admin/subscriptions/[id]/extend-trial` (body: `{ "days": 14 }`).
- **Administrative Suspension**: `POST /api/v1/admin/subscriptions/[id]/suspend` (body: `{ "reason": "Audit" }`).
- **Administrative Reactivation**: `POST /api/v1/admin/subscriptions/[id]/reactivate`.
- **List Subscriptions**: `GET /api/v1/admin/subscriptions`.
