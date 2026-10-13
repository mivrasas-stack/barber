# Barber Paradise — Official `/customers` portal (2026-10-13)

## Result
The end-customer portal is **`/customers`** (not `/barber/customers`, `/business/customers`, `/portal`, or `/clientes`).
No deployment to production has occurred.

### New canonical customer pages
- `/customers`: signed-in customer dashboard showing their upcoming real appointments.
- `/customers/appointments`: real appointment list and appointment-request/booking form. The selectable barber, location and service combinations come from **active PostgreSQL tables** (tenant, service, active location, active staff, explicit staff service and location assignments), with a valid scheduling subscription entitlement.
- `/customers/profile`: actual account name/email and affiliated barberies from customer relationships, no mock personas.
- Each is checked at the Edge for JWT and in the server-side layout using the active PostgreSQL session, so revoked credentials don't pass.
- Authenticated customer API `/api/v1/customers/me` only returns their own appointments, profiles and relationships, with private, no-store responses.
- Authenticated customer catalog `/api/v1/customers/booking-options` reads configured, entitled service combinations.
- POST `/api/v1/customers/me/appointments` calls the existing transactional appointment engine (idempotency, slot exclusion, audit and outbox), sets identity from the session, validates selected service/staff/location, requires 1h..60d in advance, and links the authenticated customer to the barber shop.
- `GET /api/v1/appointments/[id]` now requires a valid session and enforces ownership or active workspace access (404 on unauthorized cross-user lookup).

### Routing
- Customer login defaults to `/customers`; owner remains `/business`; employees remain `/barber`; platform admins remain `/admin`.
- `/customers/:path*` is protected in middleware.
- Old `/clientes`, `/clientes/appointments` and `/clientes/profile` redirect to their canonical `/customers` counterparts in production, after authentication. Other legacy customer demo subroutes redirect to the official customer homepage in production.
- The previous `/clientes` implementation was not deleted (still available for local QA).

### Validation
- Pre-change complete source/history backup: `C:\MIVRA PROYECTS\BARBERIA\_customers_portal_safety_20261013-143221`.
- New PostgreSQL integration tests including booking, idempotency, cross-account isolation, anonymous blocking, forged identity prevention and other-tenant appointment-detail rejection: **4/4 PASS**.
- Full regression: **439/439 PASS, 60 test files, exit 0**.
- TypeScript: **PASS**.
- Contabo Docker multi-stage production image build: **PASS, exit 0**.
- Browser E2E against the clean **production Docker image**: **PASS, exit 0**, two independently authenticated customer contexts, true appointments from PostgreSQL, profile pages, a new real booking confirmed HTTP 201, isolated user histories, and anonymous access redirected to login.
- ESLint: **PASS, exit 0, 0 errors, 9 preexisting warnings**.
- The local Next.js dev server on :9002 initially had a stale compilation cache. Its generated cache was preserved in the local QA backup, the dev server was restarted, and the same signed-in customer route passed Edge smoke at **http://localhost:9002/customers**, exit 0.

### Boundaries / remaining release work
- Do not claim comprehensive appointment slot listing or business-hours support: the customer currently chooses a candidate date/time, and the server validates the overlap during atomic reservation. Dedicated opening hours, holidays and explicit availability UI still need implementation and certification.
- Legacy mock views are not official and remain blocked from production.
- Verified QR identities are linked through existing `customerRelationships`; a typed email alone never claims an account.
- No Wompi real payments, S3/R2 provider certification, Contabo VPS deployment or public production launch occurred.
- QA database received synthetic test accounts/barbershop, reservations and session records only; existing business data was not deleted.
