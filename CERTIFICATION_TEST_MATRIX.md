# MIVRA Barber - production acceptance matrix

Audit updated: 2026-10-11. Repository branch: stage5-media-cdn.

**Deployment decision: NO-GO for public production.** Passing the build or existing unit tests does not certify user-facing E2E functionality.

| Area | Evidence | Decision |
| --- | --- | --- |
| TypeScript | npm run typecheck, exit 0 in current audit | PASS |
| Current build | Local Next.js 15.5.27, npm run build exit 0; 127/127 routes; lint and Edge warnings | PASS with warnings |
| Existing integration/unit tests | Latest full Vitest rerun (2026-10-11): 50 files / 394 tests passed, exit code 0 | PASS, automated only |
| Booking concurrency / GiST deadlock | PostgreSQL 40P01 while checking appointment exclusion constraint reproduced; repository now maps this specific conflict to HTTP 409. Full suite 383/383 after fix | PASS, automated only |
| Browser E2E | No verified full browser journeys for client/professional/admin with real persisted state | BLOCKED |
| Payment provider and webhook | Integration tests exist, real provider staging webhook not proven in this audit | BLOCKED |
| S3/R2 upload/processing/delivery | In-memory/media tests exist, external storage E2E not proven | BLOCKED |
| Demo content | 12 TSX route files still reference dummyBarbers/dummyServices/dummyProducts | FAIL |
| Product and service image persistence | No full verified end-to-end image attachment | BLOCKED |
| Recent service and portfolio routes | 11 new service and portfolio route tests passed (tenant isolation, inactive membership, invalid input, private delivery, deletion) | PASS, automated; browser E2E still pending |
| Lint | Build reports image, font and React Hook warnings | WARN |
| Production infrastructure | Development Compose now binds PostgreSQL and Redis to 127.0.0.1; containers recreated, both healthy | PASS for host exposure; production deployment still pending |
| Backups / migrations / restore | No isolated restoration test recorded in this audit | BLOCKED |
| Dependency security | npm audit --omit=dev after pinned transitive patches reports 0 critical, 26 high, 67 moderate, 1 low, 94 total | FAIL |

Major findings: Next.js upgraded from 15.3.8 to 15.5.27. Removed vulnerable xlsx dependency and introduced CSV export with formula injection protection. Three critical alerts were removed with pinned transitive package overrides: handlebars 4.7.10, proxy-addr 2.0.8 and websocket-driver 0.7.5. Remaining high-severity findings and clean install certification still block production. Portfolio now requires active tenant membership and respects each asset visibility. Review reachability, update dependencies in controlled increments, and rerun all validations after each update. Do not run automatic force fixes on a production-ready branch.

Required for approval: resolve security findings, remove/separate mocks, certify authorized service/portfolio CRUD, exercise real staging payment and object storage adapters, migrate test database, verify backup/restore, perform browser E2E with isolated test accounts, and repeat clean build+test+audit.

No real charges or destructive database actions have been performed.
