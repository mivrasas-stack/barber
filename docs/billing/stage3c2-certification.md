# Stage 3C.2 — SaaS Billing Certification Report

**Date:** 2026-10-08  
**Branch:** `stage3c-saas-billing`  
**Certification HEAD:** `406b6da`  
**Verdict:** **FROZEN**

## Scope

Stage 3C.2 establishes SaaS subscription billing on top of the existing Payment Core and Financial Core while preserving tenant isolation, accounting correctness, idempotency, entitlement precedence, billing recovery and concurrency guarantees.

The certified implementation includes the billing architecture and ADR-038 through ADR-044, migration `0007`, subscription lifecycle/application use cases, billing APIs, billing dashboards, Payment Core integration, reconciliation, security and concurrency test suites.

## Quality Gates

| Gate | Result |
| --- | --- |
| TypeScript typecheck | PASS |
| Production Next.js build | PASS — 120/120 static pages generated |
| Normal database full test suite | PASS — 21 files / 139 tests |
| Fresh PostgreSQL database migrations | PASS |
| Fresh database seed | PASS |
| Fresh database full test suite | PASS — 21 files / 139 tests |
| Billing concurrency tests | PASS |
| Billing security tests | PASS |
| Billing reconciliation tests | PASS |
| Payment/webhook regression tests | PASS |
| Finance/ledger regression tests | PASS |
| Scheduling/booking regression tests | PASS |
| Commerce/inventory/POS regression tests | PASS |

## Fresh Database Certification

A separate disposable certification database was created without modifying the development database.

The following sequence completed successfully:

1. Create empty PostgreSQL database.
2. Apply every tracked Drizzle migration from zero.
3. Execute the complete development seed.
4. Execute the complete automated test suite.

Result: **139 / 139 tests passed**.

This demonstrates that the repository is reconstructible from migrations and seed without relying on hidden local schema state.

## Concurrency Invariants Revalidated

The certification suite revalidated, among others:

- 50 concurrent appointment attempts: exactly one booking wins.
- 50 concurrent checkout attempts against the final inventory unit: exactly one succeeds, stock never becomes negative.
- 50 concurrent payment refund attempts: no over-refund.
- 50 concurrent billing invoice generators: exactly one invoice is created.
- 50 concurrent payment attempts against the same subscription invoice: exactly one succeeds and no duplicate SaaS revenue is posted.
- 50 concurrent identical payment webhooks: exactly one effective processing path, remaining requests classified as duplicates, no financial corruption.
- Double-entry ledger global balance remains valid.

## Type Safety Correction During Certification

The Stage 3C.2 concurrency test contained an unsafe TypeScript access against a discriminated union. The test was corrected to narrow the union with `"status" in r` before reading `status`.

Commit:

`406b6da test(billing): narrow concurrent payment result type`

No production-domain behavior was changed by this correction.

## Observation — Webhook Test Flakiness

The first complete-suite execution produced one intermittent failure in the 50-concurrent-webhook assertion: one webhook was processed, 39 were classified as duplicates and 10 were caught as generic failures.

The issue was **not reproducible** in:

- an isolated webhook-suite execution;
- the next complete-suite execution;
- the fresh-database complete-suite execution.

All subsequent runs produced the expected 1 processed + 49 duplicates with no corruption.

This is therefore classified as a **non-blocking test-harness / resource-pressure observation**, not as a proven Payment Core correctness defect. It remains on the reliability watchlist and must be revisited if it reproduces in CI or load certification.

## Production Build Warnings

The production build completes, but the following quality debt remains:

- several raw `<img>` usages should migrate to `next/image` or the future media/CDN abstraction;
- global font loading should be modernized;
- `AddAppointmentForm.tsx` has a React hook dependency warning;
- Vitest warns that its TypeScript config currently relies on a CommonJS/ESM compatibility path that may change in a future Vite major release.

These warnings do not block Stage 3C.2 correctness certification, but they must be addressed before final production-readiness certification.

## Freeze Decision

Stage 3C.2 is considered **FROZEN** because:

- migrations are reproducible from an empty PostgreSQL database;
- seed is reproducible;
- typecheck is green;
- production build completes;
- all 139 tests pass on the existing development database;
- all 139 tests pass on a freshly reconstructed database;
- concurrency, security, payment, reconciliation and accounting regressions remain green;
- no known Stage 3C.2 correctness blocker remains.

Future work must preserve these invariants.

## Next Stage

The next architectural dependency is **Stage 4.0 — Transactional Outbox Publisher + Worker Foundation**.

Stage 4 must introduce asynchronous execution without moving authoritative business state out of PostgreSQL and without weakening the transactional guarantees already certified here.
