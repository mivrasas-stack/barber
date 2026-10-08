# Payments Security, Secrets Management & Multi-Tenant Authorization

## Multi-Tenant Authorization
1. **Tenant Isolation**:
   - Every payment intent is tagged with `tenant_id` (the client's workspace) and `collector_tenant_id` (the legal recipient of funds).
   - In single-barber solo setups, `tenant_id == collector_tenant_id`.
   - In host/barbershop setups, payment intents enforce that users can only view or initiate payments belonging to their active workspace membership.
2. **Module Entitlements**:
   - `PAYMENTS` module entitlement is checked during payment operations via `PaymentAuthGuard`. If a tenant lacks the required subscription tier or entitlement, payment processing is blocked with `PAYMENTS_MODULE_DISABLED`.
3. **Role-Based Access Control**:
   - Initiating payments / viewing intents: Available to `BARBER`, `SALON_OWNER`, `MANAGER`, `SOLO_PROFESSIONAL`.
   - Authorizing refunds: Restricted to privileged roles (`SALON_OWNER`, `MANAGER`, or the `SOLO_PROFESSIONAL` owning the workspace).
   - Reconciling transactions: Restricted to administrative roles.

## Secrets & Credential Storage
1. **Zero Secret Leakage**:
   - Wompi private keys, event secrets, and integrity secrets are injected via server environment variables (`WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET`).
   - Private keys and hashing secrets are never sent to client bundles or logged in audit tables.
   - Frontend components only receive the public key (`NEXT_PUBLIC_WOMPI_PUBLIC_KEY`) and server-generated integrity signatures for checkout widgets.
