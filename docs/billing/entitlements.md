# Module Entitlements & Precedence Hierarchy

## 1. Precedence Resolution
When resolving module access for a tenant:
```text
┌─────────────────────────────────────────────────────────┐
│ 1. Admin FORCE_DISABLED (Security Override)             │
├─────────────────────────────────────────────────────────┤
│ 2. Subscription Suspension (SUSPENDED / CANCELLED)      │
├─────────────────────────────────────────────────────────┤
│ 3. Admin FORCE_ENABLED (Promotional Override)           │
├─────────────────────────────────────────────────────────┤
│ 4. Plan Inclusion (Modules in active Subscription Plan) │
├─────────────────────────────────────────────────────────┤
│ 5. Module Prerequisites / Dependencies                  │
└─────────────────────────────────────────────────────────┘
```

## 2. Billing Recovery Paradox Resolution
- Suspended accounts cannot access booking, calendar, inventory, or POS.
- However, billing endpoints (`/api/v1/subscription/*`, `/barber/admin/billing`, `/professional/billing`) bypass the paid module entitlement guard and only require authentication and workspace ownership/manager membership.
- This allows delinquent workspaces to self-recover without customer support intervention.
