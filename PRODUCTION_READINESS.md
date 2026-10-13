# Production readiness - 2026-10-09

Verified: fresh suite 383/383 (48 test files); TypeScript passed; Next.js 15.5.27 production build reverified on 2026-10-09 after appointment deadlock fix: optimized compile passed, 127/127 static pages generated, exit code 0. Lint emitted nonblocking warnings.

Outstanding:
- Clean npm ci installation in isolated staging and rerun all checks (local build already exits 0)
- Auth, bookings, payments, inventory, tenancy E2E acceptance
- Real S3/R2 avatar, portfolio and image-processing E2E
- Service and product image association
- Replace or isolate remaining demo data
- Payment webhooks, background workers, migrations, backups, HTTPS and monitoring

Run npm ci, npm run typecheck, npm test, npm run build before deployment.

Use docker-compose.production.yml on production; do not merge with development docker-compose.yml. This file exposes no database ports and requires credentials. App and workers require separate private network configuration.
