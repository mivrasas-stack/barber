# Barber Paradise — Customer premium modules, real data (2026-10-13)

**Status:** Local implementation validated; NOT YET a public production authorization. The canonical portal is `/customers`. Real barber/customer data remains scoped per authenticated user and tenant.

## Layout and modules

The existing black-and-gold bento customer dashboard and its original route names/navigation are retained. Inside these modules, the former `/clientes` mock data has been replaced in the canonical customer implementation with:
- `/customers/profile`: premium VIP profile, real name/email and linked barber shops from `customer_relationships`; dynamic points/rank/progress/badges from completed appointments (with actual service rows); actual completed POS purchase total from `orders`; NO fabricated points, streaks, images or benefits.
- `/customers/appointments`: existing secured PostgreSQL booking flow (idempotent scheduling) styled as a glassmorphic, gold-accented booking card; service filter linking back from catalog and actual appointment snapshots.
- `/customers/services`: live services by active barber shop/location/staff with current price and duration via `/api/v1/customers/booking-options`; links directly to booking.
- `/customers/favoritos`: customer-specific saved shop/staff entries, with per-tenant relationship and staff ownership checks; add/remove persisted to `customer_favorites`.
- `/customers/products`: premium boutique browsing real active product variants, correct server prices and active location inventory of the barber shops linked to this customer, subject to subscription entitlement; **online payments remain disabled** until certified.
- `/customers/sala-espera`: products from eligible categories defined in the business product catalog (e.g. slug `bebidas`, `comidas`, `snacks`, `cafeteria`, `sala-espera`), selected by active booking and exact shop/location. An authenticated customer with a booking near its appointment may issue a persisted DRAFT order using server pricing and idempotency, receiving a `WR-<uuid>` reference. The order is explicitly **pending** and products are **not reserved at request time**. A staff member with POS permissions enters that reference in the real `/barber/pos`, confirms physical receipt of cash, and the existing CompleteOrderUseCase validates inventory, posts the ledger and marks COMPLETED transactionally.
- `/customers/resenas`: comments/1–5-star ratings per barber shop or specific barber, submitted only against **this customer's completed appointment**. A unique constraint allows one review of each target type per appointment. Reviews show verified but pseudonymous clients; no dummy reviews. Reviews currently publish on submission and still need a future business moderation/reporting UI.

## Loyalty policy

`100` points per completed appointment with at least one linked service. Only `appointments.status='COMPLETED'` qualifies. Business owners/staff control appointment completion, never the customer. Rank progression is calculated from the completed appointment ledger, so no separate mutable points balance can be arbitrarily written or double-awarded by replaying a client request.

Tier thresholds: Bronce 0, Plata 500, Oro VIP 1500, Platino VIP 3000, Diamante 6000. Badge thresholds: 1, 5, 15, 30, 60 completed cuts. Points and badges are **recognition only**; redemption or financial discounts are not enabled without separately approved rules.

## Database and safety

- Backed up the entire existing source and Git history before changes in `C:\MIVRA PROYECTS\BARBERIA\_customer_all_modules_20261013-153018`.
- Made and verified a custom-format PostgreSQL backup before any schema migration: `barber-pre-customer-modules-20261013.dump` in that same protected folder (5.2 MB).
- Additive migration `0014_first_maggott.sql` adds `customer_favorites` and `customer_reviews`, foreign keys, uniqueness and valid enum/rating constraints. No table drops or data deletion; `npm run db:migrate` PASS.
- Customer JWTs are re-verified with PostgreSQL sessions, never trust supplied userId, tenantId, ratings, product price or checkout status. Customer favorites only allow active linked tenant/staff; reviews only allow actual completed appointments owned by that customer; waiting orders enforce booking identity, actual location, recent time window, stock snapshot and unique replay key.
- Wait-room cashier endpoint uses tenant membership, permission and active subscription checks and the existing finance/inventory transaction, never accepts or records payments from the customer app.
- All legacy `/clientes/*` browser routes are redirected to the canonical `/customers/*` counterparts in both dev and production, to prevent old synthetic screens from being used. Original legacy source files are kept for design reference; the customer-facing canonical portal uses no legacy data arrays.
- Scoped business `/barber/customers` and `/business/customers` continue to work unchanged.

## Verification

- Focused new integration tests `tests/customer-experience-real.test.ts`: **5/5 PASS**. This includes authenticated real loyalty, cross-tenant product visibility, favorites persistence, review eligibility/uniqueness, and full cashier workflow (DRAFT -> cash COMPLETED), stock decrement, finance journal and idempotent replay.
- Full tests: **444/444 PASS** on second run without concurrent Docker build. Initial concurrent run had one existing webhook-concurrency timing failure (443/444); isolated rerun **5/5 PASS**. Do not hide this evidence.
- TypeScript: PASS; lint: 0 errors and 9 pre-existing warnings.
- Docker Linux Next production build: PASS. Any final follow-up builds should use the last code snapshot.
- Edge browser E2E against `http://localhost:9002`: **PASS, exit 0**, verified `/customers`, `/customers/profile` (real points, badges, linked business), `/customers/appointments` (glass booking), `/customers/services`, `/customers/favoritos`, `/customers/products`, `/customers/sala-espera`, `/customers/resenas` with user-scoped QA records; also confirmed login redirect for anonymous access. Browser captures saved only in protected local QA folder.

## Outstanding production considerations

This work does **not** certify a public production launch: Wompi real webhooks/settlements, S3/R2 asset uploads and media, opening-hours/holiday scheduling, role-driven management of waiting-room category names, product photographs, review moderation, infrastructure staging/monitoring and offsite restore rehearsals remain separate release gates. Waiting-room order stock is checked again at payment and **cannot be guaranteed until cash transaction completes**. Rewards have no monetary redemption. User account fixtures created by tests are synthetic; no real historical customer data was removed.
