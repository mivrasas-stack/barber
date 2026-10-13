# ADR-049: Media Object Storage, Processing and CDN Architecture

## Status

**ACCEPTED — Stage 5A**

## Context

Barber Paradise already has durable domain state, transactional outbox, Redis/BullMQ, realtime and notifications. Media is the next infrastructure boundary.

The current codebase has media references but no certified media subsystem:

- `professional_profiles.avatar_media_id` already anticipates an opaque media reference.
- UI components such as `UploadWorkDialog` currently create browser-local previews with `URL.createObjectURL` and do not persist files.
- Several pages still use mock/static image URLs.
- There is no object storage integration, signed upload flow, media metadata table, image processing worker, CDN contract, lifecycle policy or private-asset authorization layer.

This ADR defines the target architecture before implementation.

## Decision

### 1. PostgreSQL stores metadata, not media bytes

PostgreSQL MUST NOT store:

- image binary blobs;
- video binary blobs;
- base64-encoded image/video content;
- provider-specific temporary upload bodies.

PostgreSQL remains authoritative for media metadata, ownership, lifecycle and relationships.

Object bytes live in object storage.

### 2. Object storage is provider-neutral

Core contracts use a provider-neutral object storage interface.

Candidate production backends may include:

- Cloudflare R2 / S3-compatible storage;
- Amazon S3;
- Google Cloud Storage.

The domain/application layer MUST NOT depend directly on AWS, Cloudflare or GCP SDK types.

A storage adapter owns provider-specific signing and object APIs.

### 3. Canonical media architecture

```text
Client
  |
  | request upload intent
  v
Next.js API / Media Application Service
  |
  +--> authorize tenant/user/resource
  |
  +--> create durable media_asset row (UPLOADING)
  |
  +--> storage adapter creates signed upload URL
  v
Client ------------------------------> Object Storage
        direct signed upload

Client
  |
  | complete upload
  v
Media API
  |
  +--> HEAD/verify object metadata
  +--> validate allowed size/type
  +--> media_asset -> UPLOADED
  +--> enqueue processing job / outbox event
  v
BullMQ Media Worker
  |
  +--> fetch source object
  +--> validate/decode
  +--> strip metadata
  +--> normalize
  +--> generate variants
  +--> write immutable derivative objects
  +--> persist media_variant rows
  v
CDN
  |
  v
Browser / Mobile Client
```

### 4. Direct-to-object-storage upload

The application server should not proxy normal large file bodies.

Preferred upload flow:

1. authenticated client asks application for upload intent;
2. server validates permission, resource type, MIME allowlist and declared size;
3. PostgreSQL records an upload/media intent;
4. server generates a short-lived signed upload URL;
5. client uploads directly to object storage;
6. client confirms upload;
7. server verifies the object exists and matches constraints;
8. async processing begins.

Benefits:

- application replicas remain stateless;
- large uploads do not consume Next.js worker memory/bandwidth;
- horizontal scaling remains simple;
- object-storage multipart upload can be introduced later without changing domain state.

### 5. Durable data model

Stage 5B should introduce at minimum:

#### media_assets

Logical media ownership and lifecycle.

Recommended fields:

- id UUID
- tenantId nullable where global/public platform asset is justified
- ownerUserId nullable
- mediaKind: IMAGE | VIDEO | DOCUMENT where explicitly supported
- purpose: PROFESSIONAL_AVATAR | TENANT_LOGO | PORTFOLIO | SERVICE_IMAGE | PRODUCT_IMAGE | RECEIPT | ATTACHMENT
- visibility: PUBLIC | TENANT | PRIVATE
- originalFilename nullable and sanitized
- sourceObjectKey
- mimeType
- sizeBytes
- checksumSha256 nullable before verification
- width/height nullable
- durationMs nullable
- status: UPLOADING | UPLOADED | PROCESSING | READY | FAILED | QUARANTINED | DELETED
- createdAt / updatedAt / uploadedAt / processedAt / deletedAt
- processingVersion
- lastError sanitized

#### media_variants

Immutable derivatives:

- id
- mediaAssetId
- variantKey
- objectKey
- mimeType
- width/height
- sizeBytes
- checksumSha256
- createdAt

Unique `mediaAssetId + variantKey`.

#### media_upload_intents

If separate from `media_assets`, stores:

- id
- mediaAssetId
- objectKey
- expiresAt
- maxBytes
- allowedMime
- completedAt
- createdAt

Upload authorization expires quickly and is not reusable indefinitely.

A single-table design is acceptable if invariants remain explicit.

### 6. Object key design

Object keys MUST be immutable and non-guessable.

Example:

```text
media/v1/{tenantScope}/{assetId}/source/{randomOrChecksum}.{ext}
media/v1/{tenantScope}/{assetId}/variants/{processingVersion}/{variantKey}.{ext}
```

Do not use:

- raw customer email;
- phone number;
- tenant slug as the sole security boundary;
- user-provided filename as the canonical key;
- sequential numeric IDs alone.

Renaming business entities must not require moving object bytes.

### 7. Image processing

Image processing runs asynchronously in a worker, never in the business transaction.

Required processing:

- decode actual bytes rather than trusting extension;
- validate dimensions;
- normalize orientation;
- strip EXIF/GPS metadata;
- prevent decompression bombs through pixel/dimension bounds;
- produce optimized derivatives;
- generate WebP;
- generate AVIF where supported/cost-effective;
- retain an appropriate source/original according to policy;
- calculate checksums and metadata.

Initial image variant set should be purpose-driven rather than universal.

Example avatar variants:

- 64x64
- 128x128
- 256x256
- 512x512

Portfolio/product variants may use width-oriented responsive derivatives such as:

- 320w
- 640w
- 1280w
- 1920w if original supports it.

Never upscale beyond useful source resolution unless explicitly required.

### 8. Video scope

Video processing is substantially more expensive than images.

Stage 5 should treat video separately:

- signed direct upload is allowed only behind explicit limits;
- validate MIME/container after upload;
- async thumbnail generation may be Stage 5;
- full transcoding/HLS may be deferred until product usage justifies cost.

The existing UI promise of "video up to 50MB" is not a certified backend contract until Stage 5 implements it.

### 9. CDN strategy

Public immutable variants use long-lived CDN caching:

```text
Cache-Control: public, max-age=31536000, immutable
```

because object keys change when bytes/processing versions change.

Mutable business references point to a new mediaAsset/variant; they do not overwrite cached bytes under the same immutable key.

Private media MUST NOT be made public just for CDN convenience.

Private delivery uses:

- application authorization + short-lived signed CDN/object URL; or
- CDN signed cookies/URLs where supported.

### 10. CDN invalidation

Prefer immutable object-key versioning over CDN purge.

Normal update:

```text
old asset key remains immutable
new upload -> new asset/key
database reference switches
old asset becomes unreferenced/deleted later
```

CDN purge is exceptional operational tooling, not the routine update mechanism.

### 11. Authorization

Upload authorization is derived server-side.

A client-provided `tenantId`, `ownerUserId`, `professionalId`, product ID or other entity ID never grants media access by itself.

Before issuing a signed upload or read URL, the application verifies:

- authenticated user;
- active membership/role;
- resource ownership;
- tenant boundary;
- media purpose allowed for that resource;
- file limits.

Private read authorization is repeated when generating read credentials.

### 12. MIME, size and content validation

Validation happens twice.

Before upload:

- declared MIME allowlist;
- declared size ceiling;
- purpose-specific limits.

After upload:

- object size from storage metadata;
- real byte signature / decoder validation;
- image dimensions/pixel limit;
- media-specific constraints.

Do not rely solely on browser `accept` or filename extension.

### 13. Security and malware

For images:

- decoding/re-encoding derivatives reduces dangerous metadata/content;
- source assets can remain quarantined until validation succeeds.

For documents/attachments, if supported later:

- malware scanning is mandatory before external availability.

SVG should be rejected by default for user-uploaded content unless a robust sanitization pipeline is explicitly introduced.

### 14. Lifecycle and orphan cleanup

Media state must survive partial failures.

Examples:

- upload intent created but client never uploads;
- object uploaded but completion API never called;
- processing crashes after writing some variants;
- DB update fails after variant object succeeds;
- business resource is deleted while media remains.

Lifecycle jobs must safely clean:

- expired UPLOADING assets;
- orphaned source objects;
- superseded variants;
- assets marked DELETED after a retention/grace period.

Cleanup is idempotent.

### 15. Relationship to domain records

Business tables reference opaque media IDs, not provider URLs.

Good:

```text
professional_profiles.avatar_media_id -> media_assets.id
```

The application resolves the current presentation URL/variant.

Provider URLs must not become permanent domain identifiers.

### 16. Media delivery API

Suggested application endpoints:

- POST /api/v1/media/upload-intents
- POST /api/v1/media/{id}/complete
- GET /api/v1/media/{id}
- DELETE /api/v1/media/{id}

Resource-specific application services may wrap these capabilities so arbitrary clients cannot attach media to resources they do not own.

### 17. Observability

Required metrics include:

- upload intents created/completed/expired;
- upload bytes;
- processing duration p50/p95/p99;
- processing failure rate;
- source/variant storage bytes;
- CDN hit ratio;
- origin egress;
- orphan count;
- queue depth/age;
- image input/variant dimensions;
- cost by tenant/purpose where feasible.

Never log signed URLs or credentials.

### 18. Cost controls

Purpose-specific limits protect cost.

Examples to validate during implementation:

- avatar/logo: image only, low MB ceiling;
- product/service image: moderate image ceiling;
- portfolio image: higher but bounded;
- video: strict explicit quota and tenant plan/entitlement.

Future tenant quotas should count logical source bytes and/or normalized storage according to one documented policy.

### 19. Failure behavior

If object storage is unavailable:

- business transactions unrelated to media continue;
- new media upload intents fail cleanly;
- existing PostgreSQL business state is not corrupted.

If media processing is unavailable:

- uploaded asset remains durable in UPLOADED/PROCESSING/FAILED;
- worker can retry idempotently;
- last known READY asset may remain active until replacement becomes READY.

If CDN is unavailable:

- application can degrade to signed origin delivery only if policy/cost permits;
- domain state remains unaffected.

### 20. Provider recommendation policy

Keep core provider-neutral.

For production selection, compare:

- S3 + CloudFront;
- Cloudflare R2 + Cloudflare CDN;
- Google Cloud Storage + Cloud CDN.

Selection should consider:

- existing cloud/runtime;
- egress pricing;
- signed URL support;
- regional availability;
- image transformation strategy;
- operational simplicity.

Do not adopt multiple storage providers in Stage 5 without a measured requirement.

## Stage sequence

### Stage 5B — Durable Media Core + Signed Image Upload

- schema/migration;
- storage interface;
- deterministic local/fake storage adapter;
- upload intent authorization;
- signed upload contract;
- completion verification;
- image-only initial scope;
- tests and fresh DB certification.

### Stage 5C — Image Processing Worker

- BullMQ media processing queue/worker;
- source validation;
- EXIF removal;
- dimension limits;
- responsive variants;
- WebP/AVIF strategy;
- retry/dead-letter;
- lifecycle cleanup foundation;
- tests.

### Stage 5D — CDN & Product Integration

- CDN URL resolver;
- public/private delivery policy;
- professional avatars;
- tenant logos where domain supports them;
- portfolio images;
- service/product images where schema/product flow supports them;
- replace browser-only/mock upload surfaces;
- cache headers;
- metrics.

### Stage 5E — Certification

- fresh DB migrations;
- upload authorization/security tests;
- cross-tenant tests;
- content-type spoof tests;
- oversized file tests;
- 50-concurrent completion/idempotency tests;
- worker retry/crash tests;
- orphan cleanup tests;
- typecheck/lint/full tests/build;
- freeze.

## Non-goals

Stage 5 does not introduce:

- microservices decomposition;
- generic document management;
- arbitrary public file hosting;
- CDN as source of truth;
- storing signed URLs in business tables;
- video streaming platform/HLS unless separately approved;
- AI-generated image persistence without normal media validation.
