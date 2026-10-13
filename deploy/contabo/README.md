# Barber Paradise — Contabo VPS deployment candidate

**Status: infrastructure preparation only. NO PUBLIC GO-LIVE AUTHORIZED.**
This is a new, isolated deployment recipe. It does not replace the older `docker-compose.production.yml` and does not execute any deployment automatically.

## Recommended server

Start with Contabo Cloud VPS 6 (6 shared vCPU, 12 GB RAM, 200 GB SSD), Ubuntu LTS and a domain that points to the VPS IPv4. Cloud VPS 4 (8 GB) is only a conservative minimum for fewer background workers; reserve capacity for PostgreSQL, Redis, OS page cache and application burst. The plan should be checked against production load tests.

Public inbound **only** TCP 80/443 and SSH restricted to your administrator IP; UDP 443 is optional (HTTP/3). Use the Contabo network firewall and Ubuntu UFW. **Never expose** PostgreSQL :5432, Redis :6379, application :3000, or realtime :9003 directly.

## Before first deployment

1. Provision Ubuntu LTS with an SSH public key; create a non-root sudo user, verify its login **before** disabling root/password SSH. Set automatic security updates; install Docker Engine + official Compose plugin from Docker's repository.
2. Create DNS `A` record, e.g. `barber.tu-dominio.com`, pointing to VPS IPv4. Wait for DNS propagation. For Caddy automatic HTTPS both ports **80 and 443** must be reachable.
3. Obtain approved source branch / signed release tag. The current P0 snapshot `backup/p0-staging-candidate-20261013` is **for staging evaluation only**. Do not deploy the GitHub development branch directly to real customers.
4. Clone repository to `/opt/barber-paradise` under a dedicated deploy user. Create `.env.production` by copying `.env.production.example`. Do **not** commit or send it through chat. Ensure `umask 077` and `chmod 600 .env.production`. Use `openssl rand -hex 32` to generate AUTH_SECRET and similarly safe alphanumeric database/Redis passwords (to avoid URL-encoding problems).
5. Fill `APP_DOMAIN`, `NEXT_PUBLIC_APP_URL=https://APP_DOMAIN`, DB username/name/password, `REDIS_PASSWORD`, **OUTBOX_PUBLISH_FROM** (explicit UTC cutover timestamp), `TRUSTED_PROXY_COUNT=1`, HTTPS origins and provider settings. Production DATABASE_URL is composed inside the containers; do not point it at localhost.
6. *Staging:* WOMPI_ENVIRONMENT=sandbox; NOTIFICATION_DELIVERY_ENABLED=false until providers verified; configure real S3/R2 test bucket before certifying media. No real customer data, money or secrets from the development laptop.

## Safe staged release order

From repository root on Ubuntu:

```bash
set -euo pipefail
umask 077
cp .env.production.example .env.production
chmod 600 .env.production
# Edit secrets, domain and provider settings privately. Do NOT run before that.
COMPOSE="docker compose --env-file .env.production -f deploy/contabo/compose.yaml"
node deploy/contabo/check-env.cjs .env.production
$COMPOSE --profile migration config --quiet
$COMPOSE build web
$COMPOSE up -d postgres redis
# Make a fresh offsite backup if upgrading an existing installation.
$COMPOSE --profile migration run --rm migrate
$COMPOSE up -d web realtime outbox notifications caddy
$COMPOSE ps
curl --fail --silent --show-error "https://$(grep ^APP_DOMAIN= .env.production | cut -d= -f2)/api/health"
```

Do NOT copy the template literally without setting all required variables: Compose intentionally rejects missing DB/Redis/domain and cutover keys.

Caddy terminates TLS automatically for `APP_DOMAIN`, proxies the site to `web:3000` and the optional `/realtime` path to `realtime:9003`. WebSocket integration requires separate authenticated browser testing; it is not enough to validate Caddy syntax.

### Maintenance, backups and rollback

- Use a scheduled **offsite, encrypted** PostgreSQL backup, verified through a restore to a disposable PostgreSQL container. A snapshot on the same VPS is not a sufficient backup. Add and test retention and alerting. Don't back up the raw `.env.production` to an unencrypted bucket.
- Minimal manual backup command before migrations:
  `$COMPOSE exec -T postgres sh -c 'exec pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > /secure-offsite-staging/barber-db-$(date -u +%Y%m%dT%H%M%SZ).dump`.
  This path is an *example* and must be an approved secure, external location.
- For rollback, retain prior app image and source tag. If a DB migration has run, restore/reverse it only using a rehearsed recovery plan; rolling back the app image alone might be unsafe.
- Watch `$COMPOSE logs --tail=150 web realtime outbox notifications caddy` and inspect `$COMPOSE ps`. Set up centralized monitoring, uptime checks, storage/CPU/memory alerts and recovery drill before production.
- Require explicit release authorization after Wompi sandbox signing/capture/refund/reconciliation, R2/S3 media upload/processing/delivery, audit triage of high-severity dependencies, static/mock customer screens and security review.

## Existing constraints (do not silently disable)

- `OUTBOX_PUBLISH_FROM` is mandatory. Set the deployment-specific cutover timestamp; do not replay demo outbox events.
- Notification worker may run with delivery disabled until an authorized provider is configured.
- **Media processing worker is not bundled yet**: Stage5 has queue/scheduler/processor components, but no release-certified runtime entrypoint. Media production flows remain blocked pending a dedicated verified worker and object storage E2E.
- Redis and PostgreSQL use Docker volumes on the same host; backups must leave the host.
- The Dockerfile keeps `tsx` in the runtime image because existing worker scripts use TypeScript. Improve this (bundle worker JS) after validating all worker entrypoints.
- A green Docker config/build does **not** certify a live VPS, TLS, external Wompi webhooks, network firewalls, alerts or capacity.
