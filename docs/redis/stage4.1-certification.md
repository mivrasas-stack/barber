# Stage 4.1 — Redis Infrastructure, Durable Queue Transport & Distributed Rate Limiting Certification Report

**Date:** 2026-10-08  
**Branch:** `stage4.1-redis-queue-rate-limit`  
**Verdict:** **STAGE 4.1 FROZEN**

---

## 1. Executive Summary & Scope

Stage 4.1 successfully delivers the distributed delivery and rate-limiting infrastructure for Barber Paradise v2, building atop the hardened Stage 4.0.1 PostgreSQL outbox publisher foundation without weakening any transactional invariants.

### Key Capabilities Delivered:
1. **Local Redis Infrastructure:** Production-grade Docker Compose service with persistence (`appendonly yes`, `appendfsync everysec`), no-eviction policy (`maxmemory-policy noeviction`), and automated healthchecks.
2. **Centralized Redis Connection Architecture:** Isolated connection lifecycles separating fast-failing producer request paths from persistent reconnecting BullMQ workers, with zero per-request allocation and zero credential leakage.
3. **BullMQ-Backed OutboxTransport:** Implementation of the frozen `OutboxTransport` interface featuring immutable envelope preservation, collision-free `jobId` deduplication (`evt_${eventId}`), bounded queue retention, and PostgreSQL as the single retry authority.
4. **Distributed Atomic Token Bucket Rate Limiting:** Lua-powered atomic bucket operations in Redis with SHA-256 identity hashing for PII protection, dynamic key TTL expiration, and policy-driven fail-open / fail-closed semantics during Redis outages.
5. **Surgical Route Integration:** Applied to high-value endpoints (`/api/auth/login`, `POST /api/v1/appointments`, `POST /api/v1/pos/checkout`, `POST /api/v1/payments/intents`, `POST /api/v1/admin/billing/run`) with trusted proxy IP extraction and standard HTTP 429 response contracts.
6. **Infrastructure Health Observability:** Comprehensive component health checks distinguishing PostgreSQL, Redis, and Queue Producer states via `/api/health`.

---

## 2. Architectural Invariants Certified

- **PostgreSQL Source of Truth:** PostgreSQL remains the sole authority for users, tenants, auth sessions, appointments, inventory, orders, double-entry ledger, payments, refunds, and subscriptions.
- **Redis as Ephemeral Infrastructure:** Redis is strictly ephemeral transport and caching infrastructure. No domain entity or financial state is ever authored or master-stored in Redis.
- **Outage Resilience & Availability:** If Redis crashes or network partitions occur, transactional business operations (appointments, POS checkouts, payments) fail open with degraded telemetry. Business transactions are never blocked by Redis unavailability, and database correctness is completely preserved.
- **At-Least-Once Delivery Preservation:** Outbox publishing across crash windows remains at-least-once. Stable `eventId` preservation guarantees downstream consumer idempotency.
- **Zero Secret / PII Leakage:** Credentials, Redis passwords, Bearer tokens, and client IP/emails are deterministicly redacted or SHA-256 hashed before key creation or log output.
- **No Competing Retries:** Outbox publishing uses BullMQ job `attempts = 1`; PostgreSQL outbox owns publication retries, eliminating exponential retry storms.

---

## 3. Dependency Choices & Connection Modes

### Dependencies
- `ioredis@^6.0.0`: Battle-tested, high-performance Redis client with native TypeScript types and clustered/standalone support.
- `bullmq@^6.3.11`: Production-proven queue orchestrator built on Redis streams/hashes with atomic Lua scripts.

### Connection Modes Matrix
| Connection Mode | Factory Method | `enableOfflineQueue` | `maxRetriesPerRequest` | `connectTimeout` | `commandTimeout` | Reconnect Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Producer / Request-Path** | `getRedisProducerClient()` | `false` (fail fast) | `1` | 2,000ms | 2,000ms | Fast bounded backoff (2 attempts) |
| **Worker / Queue Transport** | `getRedisWorkerClient()` | `true` (buffer blips) | `null` (BullMQ invariant) | 10,000ms | Managed by BullMQ | Exponential backoff + jitter (up to 30s) |
| **Health / Admin** | `getRedisHealthClient()` | `false` (fail fast) | `1` | 2,000ms | 2,000ms | None (probe only) |

---

## 4. BullMQ Outbox Transport Semantics

- **Queue Name:** Configurable via `REDIS_OUTBOX_QUEUE_NAME` (default: `barber-paradise-outbox`).
- **Queue Prefix:** Configurable via `REDIS_QUEUE_PREFIX` (default: `bp:queue`).
- **Job ID Format:** `evt_${sanitizedEventId}` preventing Redis key delimiter ambiguities.
- **Deduplication:** BullMQ natively deduplicates duplicate job additions while the original job exists in waiting, active, completed, or failed states.
- **Retention Bounds:**
  - Completed jobs: `removeOnComplete: { age: 86400, count: 5000 }` (24h retention window for dedup).
  - Failed jobs: `removeOnFail: { age: 604800, count: 5000 }` (7-day retention window for ops).
- **Error Classification:** Network/socket disconnects, timeouts, and broker errors return `{ ok: false, retryable: true, error: string }`. Programming/schema errors return `{ ok: false, retryable: false, error: string }`.

---

## 5. Distributed Token Bucket Rate Limiting

### Atomic Lua Algorithm
- The entire evaluation (elapsed time calculation, token replenishment, cost evaluation, token decrement, and TTL update) executes atomically in a single Redis `eval` command via `token-bucket.lua`.
- Zero multi-step race conditions across concurrent processes.

### Central Policy Registry
| Policy Name | Target Scope | Capacity | Refill Rate | Default Outage Policy |
| :--- | :--- | :--- | :--- | :--- |
| `auth.login` | IP + Normalized Email | 5 | 0.2 tokens/sec (1 per 5s) | **FAIL-OPEN** (configurable to fail-closed) |
| `appointment.create` | Tenant + User/IP | 10 | 1.0 token/sec | **FAIL-OPEN** |
| `pos.checkout` | Tenant + Cashier/Staff | 20 | 5.0 tokens/sec | **FAIL-OPEN** |
| `payment.intent` | Tenant + Actor | 10 | 1.0 token/sec | **FAIL-OPEN** |
| `admin.billing.run` | Admin User ID | 2 | 0.033 tokens/sec (1 per 30s) | **FAIL-OPEN** |

### PII & Identity Protection
- All rate-limit keys use SHA-256 hex digests: `bp:rl:v1:{policy}:{sha256(normalizedIdentity)}`.
- Key TTL is calculated dynamically as `max(60, (capacity / refillRate) * 2)` seconds, ensuring abandoned keys expire automatically.

---

## 6. Route Integrations & Trusted Proxy Handling

### HTTP 429 Contract
- Status: `429 Too Many Requests`.
- Headers: `Retry-After: <integer seconds>`.
- Body:
  ```json
  {
    "error": "Too many requests. Please try again later.",
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 5
  }
  ```

### Trusted Proxy Defense
- `extractClientIp` evaluates reverse proxy depth via `TRUSTED_PROXY_COUNT`.
- Spoofed client-injected `X-Forwarded-For` headers are filtered out, using the true hop preceding the trusted proxy layer.

---

## 7. Quality Gates & Certification Evidence

| Quality Gate | Requirement | Result | Evidence / Notes |
| :--- | :--- | :--- | :--- |
| **Docker Compose Config** | Validated config | **PASS** | `docker compose config` clean |
| **Redis Healthcheck** | Redis 7.2 engine healthy | **PASS** | `PONG` response, `noeviction`, `appendonly yes` |
| **TypeScript Typecheck** | `npm run typecheck` | **PASS** | `tsc --noEmit` exited 0 |
| **ESLint Linter** | `npm run lint` | **PASS** | Clean, 0 errors |
| **Production Build** | `npm run build` | **PASS** | 120/120 static and dynamic routes compiled, `/api/health` online |
| **Dedicated Stage 4.1 Suite** | Minimum 21 tests (Run 1) | **PASS** | 21/21 passing in 4.18s |
| **Dedicated Stage 4.1 Suite** | Minimum 21 tests (Run 2) | **PASS** | 21/21 passing in 3.85s |
| **Stage 4.0 Outbox Tests** | Regression check | **PASS** | 19/19 passing |
| **Stage 3C.1 Webhook Tests** | 50-concurrency untouched | **PASS** | 5/5 passing (50 concurrent webhooks: exactly 1 wins) |
| **Full Automated Test Suite** | `npm test` | **PASS** | 23 files / 179 tests passing (100% green) |

---

## 8. 21 Dedicated Invariant Test Breakdown

1. **Redis Health & Infrastructure Status:** `checkRedisHealth` succeeds, `/api/health` reports status correctly.
2. **BullMQ Envelope Immutability:** Preserves `OutboxEnvelope` fields without data loss.
3. **Safe Job ID Mapping:** `jobId` formatted safely without colon or numeric pitfalls (`evt_${eventId}`).
4. **Broker Deduplication:** Same `eventId` published twice yields exactly 1 job in BullMQ.
5. **Fast Outage Failures:** Unreachable Redis returns retryable failure quickly (< 2.5s) without hanging.
6. **Connection Recovery:** Re-establishing Redis allows subsequent publications to succeed.
7. **Bounded Retention:** Default job options enforce bounded `removeOnComplete` and `removeOnFail`.
8. **Complex Payload Preservation:** Nested JSON payloads preserved end-to-end.
9. **Publisher Hard Timeout Protection:** Outbox publisher hard timeout bounds non-cooperative hanging transports.
10. **Secret Redaction:** Passwords and tokens redacted from diagnostic logs and database columns.
11. **Token Bucket Burst:** Allows burst up to configured capacity.
12. **Rejection & Retry-After:** Rejection returns accurate remaining count and `retryAfterMs`.
13. **Controlled Refill:** Refill over simulated/controlled time replenishes tokens accurately.
14. **Atomic Concurrency:** 50 concurrent requests competing for 5 tokens results in exactly 5 winners and 45 rejections.
15. **Cross-Tenant/Policy Isolation:** Independent buckets do not cross-contaminate.
16. **Privacy Protection:** Redis keys contain SHA-256 hashes instead of raw IP/emails.
17. **Key Expiry:** Redis keys carry positive TTL and expire automatically when idle.
18. **Fail-Open Outage Semantics:** Business routes preserve availability during Redis failure.
19. **Fail-Closed Outage Semantics:** Abuse-sensitive routes reject requests during Redis failure when configured.
20. **Route-Level 429 Contract:** Direct HTTP route invocations return 429 with `Retry-After`.
21. **Trusted Proxy Defense:** Spoofed `X-Forwarded-For` chains resolved correctly by proxy depth.

---

## 9. Known Risks & Next-Stage Recommendations

### Known Risks & Operational Guidelines
- **At-Least-Once Delivery Reminder:** While BullMQ dedup suppresses duplicates during the retention window, consumers must maintain database-level idempotency on `eventId` for crashes outside the retention window.
- **Redis Memory Sizing:** Maintain Redis `maxmemory-policy noeviction`. Monitor memory growth in high-throughput environments to ensure retention windows match volume.

### Next-Stage Recommendations
- **Stage 4.2:** Implement domain consumers for notifications (SMS/Email) and client realtime push (WebSockets/SSE) listening to the durable BullMQ outbox queue.
