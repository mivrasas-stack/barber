# Billing Security & Multi-Tenant Isolation

## 1. Multi-Tenant Isolation
- Invoices are strictly partitioned by `tenantId`.
- API endpoints verify that the authenticated caller holds an active membership in the target workspace.
- Cross-tenant invoice lookups return `404 Not Found` or `403 Forbidden`.

## 2. Role Boundaries
- Only workspace `OWNER` or `ADMIN` (and independent solo professionals in their personal workspace) can view invoices, change plans, cancel subscriptions, or make subscription payments.
- Standard barbers or employees have zero access to billing endpoints.

## 3. Double-Entry Auditability
- Subscription revenue is posted into immutable double-entry journal entries (`SUBSCRIPTION_BILLING`).
- Every lifecycle state transition is logged to `subscription_status_history` with the actor user ID, previous status, next status, source, and reason.
