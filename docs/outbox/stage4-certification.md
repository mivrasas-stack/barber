# Stage 4.0.1 — Durable Outbox Publisher Hardening & Certification Report

**Date:** 2026-10-08  
**Branch:** `stage4-outbox-workers`  
**Verdict:** **FROZEN**

## Scope

Stage 4.0.1 completes the production hardening of the broker-neutral transactional outbox publisher foundation backed by PostgreSQL leases with strict **at-least-once** delivery semantics.

The certified implementation preserves ADR-045 and all previously frozen transactional invariants while closing two critical robustness gaps identified during post-certification review:
1. **Hard Non-Cooperative Transport Timeout:** Enforces deterministic publisher-level timeout boundaries via a safe promise race wrapper, guaranteeing worker progress even when downstream transports ignore `AbortSignal` or fail to settle.
2. **Centralized Diagnostic Sanitization:** Implements deterministic secret redaction across structured logs and database error columns, preventing credential or token leaks without exposing sensitive event payloads.

PostgreSQL remains authoritative; Redis/Stage 4.1 remains decoupled and out of scope.

## Architecture & Hardening Implemented

- **Centralized Diagnostic Sanitizer (`outbox-sanitizer.ts`):**
  - Deterministic redaction of Bearer tokens, API keys, passwords, and PostgreSQL connection credentials.
  - Length-bounding to 4000 characters to conform with database schema limits.
  - Shared across repository persistence, publisher failure handling, and worker cycle error logging.
  - Zero payload data logged in telemetry or error fields.
- **Publisher Hard Timeout Race Wrapper (`OutboxPublisher`):**
  - Wraps transport calls with a bounded `Promise.race` incorporating hard timeout and parent abort signals.
  - Dispatches `abort()` to transport `AbortController` to allow cooperative transports to cancel pending network I/O.
  - Returns `TIMEOUT` and schedules retry even if transport promises never settle.
  - Attaches rejection swallow handler (`rawTransportPromise.catch(() => {})`) to completely prevent unhandled promise rejections if late failures occur.
  - Preserves invariant: no database transaction is held during external transport publication.
- **Schema & Migration (`0008_deep_amazoness.sql`):** Added delivery attempts tracking, lease expiration, worker ownership (`locked_by`, `locked_at`, `lock_expires_at`), timestamps (`published_at`, `failed_at`, `updated_at`), error diagnostics (`last_error`), and partial B-Tree indexes for ready event claiming and expired lease recovery.
- **Repository Interface & Implementation (`OutboxRepository` & `DrizzleOutboxRepository`):**
  - High-concurrency claiming with `FOR UPDATE SKIP LOCKED`.
  - Atomically transitions expired leases whose retry attempts are exhausted to `DEAD_LETTER`.
  - Atomically reclaims expired leases with remaining attempts as retryable `FAILED`.
  - Strict ownership/lease checks on `renewLease`, `markPublished`, and `markFailed` returning `LEASE_LOST` to protect against stale worker writes.
  - Bounded and sanitized `last_error` diagnostic storage redacting sensitive tokens, passwords, and connection strings.
- **Transport Interface & In-Memory Fake (`OutboxTransport` & `InMemoryOutboxTransport`):**
  - Decoupled delivery contract receiving immutable `OutboxEnvelope`.
  - Supports deterministic test simulation of network failures, non-cooperative hanging transports, and delivery verification.
- **Worker (`OutboxWorker`):**
  - Configurable polling, concurrency batching, and lease duration.
  - Mandatory `publishFrom` cutover boundary protecting historical backlogs.
  - Graceful cancellation loop via `AbortSignal`.
  - Telemetry-ready batch summary reporting claimed, published, retried, dead-lettered, duration, oldest event age, and error category breakdowns.

## Quality Gates

| Gate | Result |
| --- | --- |
| TypeScript typecheck (`npm run typecheck`) | PASS (`tsc --noEmit` exited 0) |
| Linter (`npm run lint`) | PASS (clean, warnings only) |
| Production Next.js build (`npm run build`) | PASS — 120/120 static pages generated |
| Full automated test suite (`npm test`) | PASS — 22 files / 158 tests passing |
| Dedicated Stage 4.0 test suite (`vitest run tests/stage4-outbox-foundation.test.ts`) | PASS — 19/19 tests passing across multiple consecutive runs |
| Fresh disposable PostgreSQL database migrations | PASS — migrations 0000 -> 0008 applied and verified |

## Concurrency & Safety Invariants Certified

1. **Multi-Worker Claim Safety:** 10 concurrent publishers competing simultaneously for 50 events claimed every event exactly once with zero collisions and zero duplicate leases (`FOR UPDATE SKIP LOCKED`).
2. **Expired Lease Recovery:** Crashed worker leases that expire are automatically recovered and reclaimed by healthy workers.
3. **Dead-Letter Terminal State:** Exhausted retry attempts transition to `DEAD_LETTER`; events are never silently deleted or lost.
4. **Stale Lease Protection:** Stale lease owners cannot acknowledge or fail work once ownership has been reassigned to another worker.
5. **Crash-Window At-Least-Once Delivery:** Duplicate deliveries across publisher crash windows preserve the exact same `eventId`, enabling downstream idempotency.
6. **Historical Cutover Isolation:** Historical backlog created prior to `publishFrom` is excluded from automatic publishing.
7. **Cross-Tenant Isolation:** Tenant and location identifiers are immutable and forwarded without mutation or leakage.
8. **Hard Non-Cooperative Transport Timeout:** Non-cooperative transports that ignore abort signals or return never-resolving promises are bounded by the publisher's timer, classifying as `TIMEOUT` and scheduling retries without hanging or leaking unhandled rejections (Test 18).
9. **Structured Log & Database Sanitization:** All transport errors are sanitized through `sanitizeAndBoundError`, completely redacting passwords, bearer tokens, API keys, and connection credentials from both structured logs and the database `last_error` column with zero payload leakage (Test 19).

## Next Steps: Stage 4.1 Readiness

With Stage 4.0.1 hardened and frozen, Stage 4.1 can safely implement a Redis/queue-backed `OutboxTransport` behind the existing transport interface without modifying domain producers or transactional boundaries.
