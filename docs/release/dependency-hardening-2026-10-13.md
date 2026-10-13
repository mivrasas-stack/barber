# Barber Paradise — Security dependency hardening (2026-10-13)

## Scope and safety
This change is an approved dependency-remediation exercise, not a public release. Historical business data, migrations, checkout logic, QR isolation and billing rules were not intentionally modified. Existing uncommitted work remains in `stage5-media-cdn`.

Recovery snapshot (before any dependency installation):
`C:\MIVRA PROYECTS\BARBERIA\_dependency_remediation_20261013-125842`
- `pre-remediation-source.tar`
- `history.bundle`
- `package.json` and `package-lock.json`
- `git-status.txt`

## Dependency classification
Production-only `npm audit --omit=dev`:
- Before: **94 total = 26 high + 67 moderate + 1 low**.
- After compatible security updates: 88 total = 26 high + 62 moderate.
- After removing unused dependencies/reclassifying tools: 2 total = 1 high + 1 moderate (nested Next PostCSS).
- After tightly scoped `overrides.next.postcss = 8.5.29` and `npm dedupe`: **0 critical, 0 high, 0 moderate, 0 low**; **exit 0**.

All-dependency audit (including development): **19 high, 60 moderate, 0 low**, mostly Genkit CLI / telemetry, Tailwind 3 tooling and ESLint Next. These are **not** considered remediated. This residual audit must be handled separately for developer/build security before calling the whole repository clean.

Changes:
1. Applied semver-compatible `npm audit fix` without `--force`; retained Next.js 15 and Tailwind 3.
2. Moved `genkit` and `@genkit-ai/googleai` into dev dependencies (their only source references are in the standalone `src/ai` developer flow).
3. Removed `@genkit-ai/next` and `firebase` (no source imports) and `patch-package` (no patches and no postinstall use).
4. Moved `tailwindcss-animate` and `@types/qrcode` / `@types/ws` to dev dependencies; retained `tsx` as an explicit runtime dependency for realtime/outbox/notification processes.
5. Pinned Next's nested `postcss` transitive dependency to the patched 8.5.29; existing top-level PostCSS is 8.5.30. Avoid unreviewed Next upgrades, and re-evaluate this override with future Next updates.
6. Changed Contabo Dockerfile to `npm prune --omit=dev` after build before copying runtime dependencies; the one-shot migration image explicitly uses the builder stage for `drizzle-kit`.
7. Compose syntax verified with migration profile after change.

## Verification
- `npm run typecheck`: **PASS** (exit 0).
- `npm run lint`: **PASS** (exit 0), 9 pre-existing nonblocking warnings.
- `npm test`: **425/425 tests PASS**, 56 files, exit 0; includes P0 QR, POS, staff, portal authorization, Wompi mock security.
- `npm audit --omit=dev`: **0 vulnerabilities**, exit 0.
- Fresh Contabo Docker build (Node 22, `npm ci`, Next build, dev pruning, runtime image): **PASS, exit 0**. Log: `hardened-docker-build.log` in the recovery folder.
- Runtime smoke: **PASS, exit 0**. Genkit, Firebase, Tailwind, ESLint and drizzle-kit absent; production `tsx`, Next, Next-internal PostCSS 8.5.29 and the Next BUILD_ID present.
- Launched the isolated production image, fetched the root route (HTTP 200), and removed the disposable test container.
- Compose config with dedicated one-shot migration builder target: **PASS, exit 0**.
- `npm audit` including dev: **79 total (19 high/60 moderate)**; these do not disappear from source developer tooling and must not be misrepresented as zero globally.

## Mandatory release gates still outstanding
- Wompi signed sandbox webhook / real-provider cashflow certification.
- External S3/R2 upload, media worker and CDN E2E certification.
- Product screens still showing mock/stub data (non-P0); block/hide unfinished features before real customers.
- Domain/VPS staging smoke, TLS, backups, monitoring, incident response and provider keys.
- Validate fresh build/worker start and rollback on staging. No production deployment was authorized or performed.
