# MIVRA Barber - production acceptance matrix

Audit updated: 2026-10-13. Repository branch: stage5-media-cdn.

**Deployment decision: NO-GO for public production.** Passing the build or existing unit tests does not certify user-facing E2E functionality.

| Area | Evidence | Decision |
| --- | --- | --- |
| TypeScript | npm run typecheck, exit 0 in current audit | PASS |
| Current build | Isolated Linux Node 22 image, fresh npm ci + typecheck + lint + build, all exit 0; existing UI warnings remain | PASS with warnings |
| Existing integration/unit tests | 2026-10-13: npm test, 51 files / 398 tests passing, exit 0 (silent: true avoids excess gateway worker console logs) | PASS, automated only |
| Booking concurrency / GiST deadlock | PostgreSQL 40P01 while checking appointment exclusion constraint reproduced; repository now maps this specific conflict to HTTP 409. Standalone scheduling 10/10; latest full suite 398/398 | PASS, automated only |
| Browser E2E | Headless Microsoft Edge smoke 6/6 routes, no uncaught JS exceptions; full persisted client/professional/admin journeys remain unverified | BLOCKED |
| Payment provider and webhook | Integration tests exist, real provider staging webhook not proven in this audit | BLOCKED |
| S3/R2 upload/processing/delivery | In-memory/media tests exist, external storage E2E not proven | BLOCKED |
| Demo content | 12 TSX route files still reference dummyBarbers/dummyServices/dummyProducts | FAIL |
| Product and service image persistence | No full verified end-to-end image attachment | BLOCKED |
| Recent service and portfolio routes | 15 service/portfolio/registration tests passed (tenant isolation, invalid input, private delivery, account takeover prevention) | PASS, automated; browser E2E still pending |
| Public professional registration | Existing-account takeover path closed; missing password/default removed; Zod validation; 4 new database-backed tests pass | PASS for tested cases; live onboarding E2E pending |
| Lint | npm run lint via ESLint CLI exit 0, 0 errors, 9 existing UI warnings | WARN |
| Production infrastructure | Development Compose now binds PostgreSQL and Redis to 127.0.0.1; containers recreated, both healthy | PASS for host exposure; production deployment still pending |
| Backups / migrations / restore | No isolated restoration test recorded in this audit | BLOCKED |
| Dependency security | npm audit --omit=dev after pinned transitive patches reports 0 critical, 26 high, 67 moderate, 1 low, 94 total | FAIL |

Major findings: Next.js upgraded from 15.3.8 to 15.5.27. Removed vulnerable xlsx dependency and introduced CSV export with formula injection protection. Three critical alerts were removed with pinned transitive package overrides: handlebars 4.7.10, proxy-addr 2.0.8 and websocket-driver 0.7.5. Clean Linux npm ci/build succeeded; remaining high-severity findings, real-provider integration and full browser journeys still block production. Portfolio now requires active tenant membership and respects each asset visibility. Review reachability, update dependencies in controlled increments, and rerun all validations after each update. Do not run automatic force fixes on a production-ready branch.

Required for approval: resolve security findings, remove/separate mocks, certify authorized service/portfolio CRUD, exercise real staging payment and object storage adapters, migrate test database, verify backup/restore, perform browser E2E with isolated test accounts, and repeat clean build+test+audit.

No real charges or destructive database actions have been performed.
