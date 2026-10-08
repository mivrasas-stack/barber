# ADR-029: Single Financial Source Authority: Appointment vs. Order

## Status
Approved

## Context
In Barber Paradise v2, service appointments can either be completed directly through operational appointment workflows (e.g. direct service completion in Stage 3A) or billed through a point-of-sale checkout (Stage 3B) alongside retail products.

Without strict source authority, completing an appointment through POS could lead to duplicate revenue postings:
- Once via direct appointment completion (`sourceType = 'APPOINTMENT'`).
- Once via POS order checkout (`sourceType = 'ORDER'`).

This would erroneously record 100,000 COP of revenue for a 50,000 COP haircut.

## Decision
1. **Single Accounting Authority Rule**:
   - For any appointment billed via POS, `sourceType = 'ORDER'` is the **sole accounting authority**.
2. **Operational Status Transition**:
   - When an order checkout finishes, the associated appointment transitions to `COMPLETED` (never `CANCELLED`, unless a true commercial cancellation occurs).
   - An entry in `appointment_status_history` documents the transition with reason: `"Completed via POS Order #${order.orderNumber}"`.
3. **Mutual Exclusion Protection**:
   - `PostServiceRevenueUseCase` verifies whether an order linked to `appointment.id` has been completed. If so, it rejects execution with `ConflictError` (HTTP 409).
   - `CompleteOrderUseCase` verifies whether a posted journal entry with `sourceType = 'APPOINTMENT'` and `sourceId = appointment.id` already exists. If so, it halts checkout with `ConflictError` to block double posting.

## Consequences
- Guaranteed zero double-counting of service revenue.
- Clear lineage tracing every peso back to either a direct service log or a retail order ticket.
- Full compliance with certified Stage 3A ledger invariants.
