# Barber Paradise — Controlled Launch Gates (2026-10-13)

**Status: local/staging-candidate validated. PUBLIC PRODUCTION: NO-GO.**

## Scope

This stage responds to synthetic UI and logout/security problems discovered during P0 release preparation. The changes preserve every original dashboard in `demo-dashboard.tsx` or `demo-page.tsx` and existing layout visuals in separate client shell components. Nothing was deleted from PostgreSQL, and no public release or real payment occurred.

### Production mode UI

Production `NODE_ENV=production` renders truthful navigation hubs instead of fake customer counts, appointments, orders or simulated revenue:
- `/barber` → operational hub, links to POS, QR/customers, services, inventory, staff and affiliations.
- `/business` → operational hub, links to genuine server-backed management routes.
- `/portal` → safe entry for eligible professional/business users with explicit notice that client bookings/rewards are not certified.

Middleware enforces **server-side route restrictions after JWT validation**, not merely hiding menu items. The entire `/clientes` subtree and unfinished operational routes are redirected to `/feature-unavailable` while in production. For example: `/barber/accounting`, `/barber/appointments`, `/barber/earnings`, `/barber/metrics`, `/barber/payments`, `/barber/portfolio`, `/barber/profile`, `/barber/staff`, `/barber/wait-room`, `/barber/wallet`, `/business/accounting`, `/business/appointments`, `/business/orders`, `/business/roles`, `/business/security`, `/business/settings`. All existing page files remain intact for QA.

**Do not describe these blocked features as completed.** Barber QR remains operational via `/barber/customers` rather than the partly demo profile page. Payments via Wompi remain unverified and must not be presented as live.

### Session security

- Replaced navigation-only and stale-cookie logout in the admin, independent professional, barber, business, client and portal shells with `LogoutButton`, which sends POST `/api/auth/logout` and navigates to login only after server acknowledgement.
- Logout API now adds no-store and returns 503 if DB session revocation fails instead of claiming success.
- Admin, professional, client and portal server layouts check the current active PostgreSQL session. Admin additionally checks the current `isPlatformAdmin` database flag. Revoked JWTs do not authorize those pages.
- Production middleware no longer accepts the known developer fallback `AUTH_SECRET`; missing/short signing keys fail closed.

## Certification results

- Focused tests for launch route gating, real logout revocation and DB-active-user session validation: **9/9 PASS**.
- Full existing and new regression suite: **434/434 PASS, 59 suites, exit 0**, repeated after portal landing changes.
- `npm run typecheck`: **PASS, exit 0**.
- `npm run lint`: **PASS, exit 0** (9 existing nonblocking warnings).
- `git diff --check`: **PASS**.
- Clean Contabo Linux multi-stage Docker build from repo with Next 15 and production dependency pruning: **PASS, exit 0**.
- Production Docker HTTP smoke using signed synthetic JWT:
  - `/`, `/feature-unavailable`, `/qr-register` → HTTP 200.
  - `/clientes/appointments` without JWT → login redirect 307.
  - `/clientes/appointments`, `/barber/accounting`, `/business/orders` with JWT → `/feature-unavailable` redirect 307.
  - Anonymous POST `/api/auth/logout` → HTTP 200, session cookie cleared.
  - Disposable Docker test container removed after checks.
- Production dependency audit in preceding hardening stage: **0 known npm advisories for production dependencies**, not a security guarantee for other classes of vulnerabilities.

## Explicit launch blockers

1. **No Contabo VPS/domain production environment yet**; deployment TLS, firewalls, DNS and recovery cannot be verified.
2. **Wompi sandbox credentials unavailable locally**; real signed provider callbacks, payment capture/refund/reconciliation are not certified. No live electronic payments.
3. **S3/R2 object storage credentials not configured**; media processing worker is not yet packaged as a separately certified service in the Contabo release. Real uploads/CDN unverified.
4. **Customer booking portal and several owner/professional functions remain under construction**. The route gate prevents false representations but does not deliver those missing functionalities. A full consumer launch must wait for genuine appointment/customer UIs.
5. Dev-only npm audit still has advisories; they do not ship in the pruned web runtime but remain an upstream development/build hygiene task.
6. Additional security, observability, backup/restore, performance/load, staging canary and rollback evidence are still required.

## Preserved state

- Pre-change backup of 9 existing source files: `C:\MIVRA PROYECTS\BARBERIA\_release_gates_20261013-1335`.
- Previous full source/history/lockfile archive: `C:\MIVRA PROYECTS\BARBERIA\_dependency_remediation_20261013-125842`.
- Existing Git branch `stage5-media-cdn` remains unchanged as HEAD, with original user's uncommitted work preserved.
- The latest safe parent branch was `backup/security-hardened-20261013`.
- **No production deployment executed, no payment provider enabled, no existing data destroyed.**
