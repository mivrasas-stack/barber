# ADR-043: Billing Recovery Paradox and Entitlement Precedence

## Status
Accepted (FROZEN in Stage 3C.2)

## Context
When a tenant's subscription is suspended, all paid software features must be blocked. However, if the system blocks *all* requests to the platform, the tenant is caught in a deadlock paradox: they cannot log in or access the billing dashboard to pay their bill, making self-serve recovery impossible.

## Decision
1. **Entitlement Precedence Hierarchy**:
   ```text
   1. Admin FORCE_DISABLED (highest priority, security lock)
   2. Subscription Suspension (SUSPENDED / CANCELLED denies all paid modules)
   3. Admin FORCE_ENABLED (promotional override)
   4. Plan Inclusion (standard tier modules)
   5. Module Dependencies (prerequisites check)
   ```
2. **Billing Recovery Paradox Resolution**:
   - The billing and payment recovery domain (`/api/v1/subscription/*`, `/barber/admin/billing`, `/professional/billing`) is explicitly exempted from the operational module entitlement check.
   - Access to billing only requires valid user authentication and workspace ownership/administrative membership (`isOwnerOrAdmin = true`).
   - The UI presents a dedicated suspended banner with one-click invoice payment, allowing the customer to clear their debt and immediately restore full operational access.

## Consequences
- **Positive**: Self-serve reactivation without requiring manual platform support intervention.
- **Positive**: Clear, deterministic authorization precedence.
