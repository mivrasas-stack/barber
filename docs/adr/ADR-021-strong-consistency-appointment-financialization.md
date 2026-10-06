# ADR-021: Pure PostgreSQL Strong Consistency for Appointment Financialization

## Status
Approved

## Context
In microservice or loosely coupled asynchronous architectures, appointment completion and billing/financialization are frequently separated by event brokers. This introduces eventual consistency delays, lost events, race conditions on status retries, and the risk that an appointment is completed in the schedule but never posted to accounting.

## Decision
For Barber Paradise v2 Stage 3A:
1. **Transactional Atomicity**:
   - Transitioning an appointment to `COMPLETED` runs inside a single PostgreSQL ACID transaction (`db.transaction`).
   - `PostServiceRevenueUseCase` executes within that exact transaction.
   - If ledger line balance fails, accounts are missing, or constraints are violated, the entire appointment status update rolls back.
2. **Deterministic Snapshot Reliance**:
   - Financial amounts are calculated strictly from immutable `price_minor` snapshots recorded on `appointment_services` and active `professional_affiliation_terms` version snapshots, completely ignoring any subsequent price changes in the master catalog.
3. **Outbox & Audit Integration**:
   - Domain events and audit logs are recorded atomically within the same transaction.

## Consequences
- Impossible to have a completed appointment without a corresponding balanced journal entry.
- Absolute transactional authority rests in PostgreSQL without third-party broker dependencies.
