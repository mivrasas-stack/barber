# Stage 5 — Media, Object Storage & CDN Implementation Plan

## Baseline

Stage 4.3 is frozen at `edb7ecf`.

Existing media-related observations:

- `professional_profiles.avatar_media_id` is already an opaque media reference field.
- `UploadWorkDialog` currently previews local browser files only using `URL.createObjectURL`.
- Portfolio/profile screens contain upload affordances but no certified storage pipeline.
- Static/mock image URLs are still used throughout several UI data sources.
- No object-storage or CDN infrastructure exists yet.

## Objective

Deliver a secure, scalable media subsystem for images first, using direct signed uploads, durable PostgreSQL metadata, asynchronous processing and CDN-backed immutable variants.

## Stage 5B — Signed Image Upload Foundation

### Scope

- media schema + migration;
- media domain types;
- provider-neutral object storage interface;
- deterministic fake/local test adapter;
- upload intent creation;
- authorization;
- signed upload generation;
- completion verification;
- image-only initial allowlist.

### Initial media purposes

- PROFESSIONAL_AVATAR
- PORTFOLIO
- SERVICE_IMAGE
- PRODUCT_IMAGE
- TENANT_LOGO only when a durable tenant logo relationship is defined

Do not invent domain relationships that do not yet exist.

### Safety

- no base64/database blobs;
- no raw file body through normal Next.js API for routine uploads;
- no SVG by default;
- no signed URL logging;
- strict tenant/resource ownership checks;
- MIME and size checked before and after upload.

### Tests

- unauthorized cross-tenant upload rejected;
- signed intent expires;
- oversized declaration rejected;
- MIME allowlist enforced;
- completion verifies object exists;
- repeated completion is idempotent;
- object key contains no PII;
- 50 concurrent completion attempts converge on one valid asset state.

## Stage 5C — Processing Worker

### Scope

- media BullMQ queue;
- image worker;
- byte-signature/decode validation;
- dimension/pixel bounds;
- EXIF/GPS stripping;
- resize/crop policies;
- WebP and optional AVIF;
- immutable variants;
- status/retry/dead-letter;
- cleanup primitives.

### Variant policy

Define variants per purpose. Avoid generating every possible size for every upload.

### Tests

- corrupt image rejected/quarantined;
- extension/MIME spoof rejected;
- decompression bomb/dimension ceiling enforced;
- duplicate jobs are idempotent;
- worker crash after derivative write is recoverable;
- stale worker cannot corrupt READY metadata;
- exact deterministic variant set.

## Stage 5D — CDN and UI Integration

### Scope

- public CDN URL resolver;
- private signed read URL path;
- immutable cache-control;
- professional avatar integration;
- portfolio upload integration;
- service/product image integration where authorized;
- replace mock/browser-only upload paths progressively.

### Client contract

UI requests upload intent -> uploads directly -> completes -> polls/receives realtime status -> swaps to READY media variant.

No UI component should need provider-specific storage knowledge.

## Stage 5E — Certification

Required gates:

- dedicated media test suite twice;
- cross-tenant security;
- 50-concurrent idempotency;
- fresh database migration;
- existing Stage 4 regression suites;
- `npm run typecheck`;
- `npm run lint`;
- `npm test`;
- `npm run build`;
- storage outage behavior;
- processing outage behavior;
- object lifecycle/orphan checks.

## CDN/cache target

Public READY variants:

```text
Cache-Control: public, max-age=31536000, immutable
```

Business records reference media IDs. Variant URLs are resolved from immutable keys.

## Deferred

- full video transcoding/HLS;
- generic attachments;
- marketing asset manager;
- multi-provider active-active storage;
- automatic AI media generation pipeline.

## Exit

Stage 5 is complete only when image upload, processing, authorization and CDN delivery are certified end-to-end without weakening existing business invariants.
