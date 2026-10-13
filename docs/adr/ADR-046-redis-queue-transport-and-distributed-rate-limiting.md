# ADR-046: Redis Ephemeral Infrastructure, Durable Queue Transport & Distributed Rate Limiting

## Status

**ACCEPTED & CERTIFIED — Stage 4.1**

## Context

Stage 4.0 established a broker-neutral transactional outbox publisher foundation in PostgreSQL with row-level leasing (`FOR UPDATE SKIP LOCKED`), exponential backoff retries, and strict at-least-once delivery semantics. In Stage 4.0, transport testing utilized an in-memory transport implementation.

To scale event dispatching asynchronously and protect API entry points against burst traffic, abuse, and resource exhaustion in horizontally scaled multi-instance deployments, Barber Paradise requires:
1. A durable external queue broker transport implementing the frozen `OutboxTransport` interface.
2. A distributed, atomic rate-limiting engine.
3. Centralized Redis connection management with differentiated semantics for request paths and background workers.
4. Resilient failure semantics that preserve PostgreSQL transactional correctness during Redis outages.

### Core Architectural Invariants

- **PostgreSQL is the Sole Authoritative Source of Truth:** Tenants, users, authentication sessions, appointments, catalog, inventory positions, orders, double-entry ledger, payments, refunds, and subscriptions reside authoritatively in PostgreSQL.
- **Redis is Strictly Ephemeral / Delivery Infrastructure:** Redis functions as a transient job transport broker and a distributed counter/bucket cache. Under no circumstance does Redis become an authoritative domain store.
- **Zero Business Corruption on Redis Outage:** If Redis crashes, is partitioned, or suffers latency spikes, transactional business operations (bookings, POS checkout, payments, stock decrements, ledger postings) must NEVER be corrupted.
- **Transactional Boundary Independence:** Outbox events are written atomically inside PostgreSQL business transactions. No Redis network I/O is permitted inside any database transaction.
- **At-Least-Once Delivery Preservation:** Publication to Redis remains at-least-once. Exactly-once delivery is physically impossible in distributed crash windows and is explicitly rejected. Downstream consumers must remain idempotent on `eventId`.

---

## Decision

### 1. Broker Evaluation & Queue Transport Selection

We evaluated three potential transport mechanisms in the Node.js / TypeScript ecosystem:

| Transport | Durability & Persistence | Node/TS Ergonomics | Delayed / Retry Mechanics | Operational Overhead | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Raw Redis Pub/Sub** | **None** (Fire-and-forget; in-memory buffer only; offline subscribers drop messages) | Native `ioredis` | None | Low | **REJECTED** |
| **Redis Streams** | High (Append-only log; consumer groups; acknowledged offsets) | Requires custom consumer loop, PEL management, and custom Lua scripts | Manual implementation of backoff, delayed delivery, and dead-letters | High | **REJECTED** |
| **BullMQ** | High (Backed by Redis Streams, Hashes, and Sorted Sets with atomic Lua scripts) | First-class TypeScript SDK, typed jobs, event hooks, and queue abstractions | Built-in job lifecycle, backoff retries, atomic state transitions, deduplication | Moderate | **ACCEPTED** |

#### Why Redis Pub/Sub is NOT the Durable Queue for Outbox Delivery
Redis Pub/Sub is an ephemeral publish-and-forget channel. Messages are delivered only to connected clients in real time. If a worker is restarting, deploying, crashing, or experiencing network partitions, all published messages during that window are permanently lost. Pub/Sub has no persistent backlog, no acknowledgement protocol, no replayability, and no lease mechanism. It violates the core contract of a transactional outbox.

#### Why BullMQ over Raw Redis Streams for Stage 4.1
While Redis Streams (`XADD`, `XREADGROUP`) provides durable stream logs, building a reliable job queue on top of raw streams requires rolling custom implementations for:
- Deterministic job state machines (waiting, active, delayed, completed, failed);
- Concurrency limiting and atomic worker leases;
- Job deduplication with bounded retention;
- Safe cleanup of completed streams to prevent unbounded memory growth.

BullMQ provides an audited, production-proven implementation of these patterns in Node.js, backed by atomic Lua scripts. It satisfies all outbox transport requirements out-of-the-box.

---

### 2. BullMQ Outbox Transport Architecture

The `BullMQOutboxTransport` class implements the frozen `OutboxTransport` interface:

```typescript
export interface OutboxTransport {
  publish(
    envelope: OutboxEnvelope,
    signal?: AbortSignal
  ): Promise<OutboxTransportResult>;
}
```

#### Key Transport Mechanics:
1. **Queue Configuration & Naming:**
   - Centralized queue name: `barber-paradise-outbox` (configurable via `REDIS_OUTBOX_QUEUE_NAME`).
   - Default queue prefix: `bp:queue` (managed by BullMQ's `prefix` option; NEVER via `ioredis` `keyPrefix`).
2. **Job Identity & Deduplication:**
   - BullMQ accepts a custom `jobId`. We map the immutable domain `eventId` to `jobId: evt_${envelope.eventId}`.
   - Slashes and colons are avoided in `jobId` to prevent key parsing anomalies in Redis internals.
   - If a job with `evt_${eventId}` already exists in waiting, delayed, active, completed, or failed state, BullMQ natively deduplicates the submission and returns the existing job reference.
3. **Single Authority for Retry Policy:**
   - PostgreSQL outbox owns publication retry scheduling and backoff.
   - To avoid competing retry loops between PostgreSQL and BullMQ (which causes exponential delivery amplification), BullMQ jobs are enqueued with `attempts: 1`.
   - If transport publishing succeeds (`queue.add()` resolves), the outbox row is settled as `PUBLISHED`.
   - If transport publishing fails (Redis unavailable or timed out), the outbox publisher marks the row as `FAILED` and schedules a PostgreSQL retry with exponential backoff.
4. **Bounded Queue Retention:**
   - Unbounded job retention in Redis would eventually exhaust memory.
   - `removeOnComplete`: `{ age: 86400, count: 5000 }` (Retains completed job IDs up to 24 hours or 5,000 jobs to maintain deduplication protection against rapid retries).
   - `removeOnFail`: `{ age: 604800, count: 5000 }` (Retains failed job metadata up to 7 days for operational inspection).
5. **Envelope Immutability:**
   - The entire `OutboxEnvelope` (including `eventId`, `eventType`, `eventVersion`, `tenantId`, `locationId`, `aggregateId`, `occurredAt`, `payload`, `deliveryAttempt`) is preserved intact in the BullMQ job data payload.
6. **Error Classification:**
   - Network disconnections, connection timeouts, and command timeouts return `{ ok: false, retryable: true, error: string }`.
   - Programming or schema validation bugs return `{ ok: false, retryable: false, error: string }`.

---

### 3. Redis Connection Semantics & Connection Factory

BullMQ and general request-path Redis operations have diametrically opposed connection requirements:

| Dimension | Request-Path Redis (Producer / Rate Limiter) | Background Worker Redis (BullMQ Workers / Outbox) |
| :--- | :--- | :--- |
| **Primary Goal** | Fast failure; bounded latency; prevent request hangs | Persistent reconnection; high tolerance for temporary downtime |
| **`maxRetriesPerRequest`** | Low (e.g. `1`) | `null` (MANDATORY for BullMQ; BullMQ manages command queueing) |
| **`enableOfflineQueue`** | `false` (Fail immediately if disconnected; do not queue memory) | `true` (Allow commands to buffer during brief reconnections) |
| **Timeouts** | `connectTimeout: 2000ms`, `commandTimeout: 2000ms` | `connectTimeout: 10000ms` |
| **Reconnection Strategy** | Exponential backoff capped at 2,000ms | Exponential backoff with jitter capped at 30,000ms |

#### Implementation Rules:
- A centralized connection factory (`src/infrastructure/redis/redis-connection-factory.ts`) maintains isolated, lazily instantiated singleton clients:
  - `getProducerClient()`: Configured for request-path operations and rate limiting.
  - `getWorkerClient()`: Configured with `maxRetriesPerRequest: null` for BullMQ queues and workers.
  - `getHealthClient()`: Dedicated client for ping/healthcheck probes.
- **No Per-Request Clients:** Creating a new Redis client on every HTTP request is strictly prohibited.
- **Zero KeyPrefix in ioredis with BullMQ:** ioredis `keyPrefix` alters commands in ways that break BullMQ's internal Lua scripts and cluster slots. BullMQ prefixing must use BullMQ's native `prefix` queue option.
- **Engine Setting:** Redis must run with `maxmemory-policy: noeviction`. Evicting keys arbitrarily breaks BullMQ sorted sets and leads to corrupted job states.

---

### 4. Distributed Rate Limiter: Atomic Token Bucket

To prevent API abuse and resource starvation across multiple horizontal application instances, we implement an atomic Token Bucket rate limiter in Redis.

#### Algorithm & Atomicity:
- The rate limiter executes a single Lua script in Redis (`token_bucket.lua`).
- Reading the current token count, calculating refill based on elapsed milliseconds, evaluating cost against available tokens, deducting tokens, and refreshing the key TTL occur in one atomic Redis transaction.
- Zero race conditions or read-modify-write concurrency vulnerabilities between instances.

#### Return Payload:
```typescript
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  resetAt: Date;
  degraded: boolean;
  error?: string;
}
```

#### Key Namespacing & Privacy Protection:
- Namespace pattern: `bp:rl:v1:{policy}:{hashedIdentity}`.
- **PII & Secret Protection:**
  - Raw email addresses, IP addresses, tokens, and credentials MUST NEVER appear in Redis keys.
  - Identifiers are normalized (trimmed, lowercased) and hashed using SHA-256 before key generation.
  - Key expiry (TTL) is dynamically set to the time required to completely refill the bucket to capacity, ensuring abandoned keys expire automatically.

#### Central Policy Registry:
| Policy Name | Scope / Identity Strategy | Capacity (Burst) | Refill Rate (Tokens/sec) | Outage Behavior | Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `auth.login` | Hashed IP + Hashed Normalized Email | 5 | 0.2 (1 per 5s) | **FAIL-OPEN (with Degraded Telemetry)** | Prevents brute force without causing permanent lockout for legitimate users during transient Redis downtime. Configurable to fail-closed via environment. |
| `appointment.create` | Hashed TenantId + Hashed UserId (or IP) | 10 | 1.0 (1 per 1s) | **FAIL-OPEN (with Degraded Telemetry)** | Business-critical appointment booking. PostgreSQL transactional concurrency and slot uniqueness protect correctness. |
| `pos.checkout` | Hashed TenantId + Hashed CashierId | 20 | 5.0 (5 per 1s) | **FAIL-OPEN (with Degraded Telemetry)** | In-store checkout point of sale cannot halt customer transactions during Redis degradation. |
| `payment.intent` | Hashed TenantId + Hashed OrderActor | 10 | 1.0 (1 per 1s) | **FAIL-OPEN (with Degraded Telemetry)** | Payment generation. Idempotency repository in PostgreSQL prevents duplicate intent creation. |
| `admin.billing.run` | Hashed AdminUserId | 2 | 0.033 (1 per 30s) | **FAIL-OPEN (with Degraded Telemetry)** | Administrative billing cycle runs are heavy operations; rate-limited to prevent accidental double-execution while preserving operational capability. |

#### Webhook Exemption:
Payment provider webhooks (`/api/v1/payments/webhooks/*`) MUST NOT be subjected to destructive rate limiting. Dropping webhook requests causes payment gateways to retry with escalating backoff or fail customer settlements. Webhooks rely on cryptographic signature verification (`PaymentSignatureInvalidError`) and PostgreSQL idempotency tables as their first line of defense.

---

### 5. Outage Behavior & Failure Policy

When Redis is unreachable, unresponsive, or times out:
1. **Explicit Degraded Logging:** Emit structured log `rate_limit_degraded` with `policy`, `hashedIdentity`, and sanitized error category.
2. **Business Endpoint Fail-Open Policy:** For authenticated transactional business endpoints (`appointment.create`, `pos.checkout`, `payment.intent`, `admin.billing.run`), the system fails open (`allowed: true, degraded: true`). PostgreSQL transactional constraints and concurrency controls (`FOR UPDATE`, slot locks, idempotency keys) remain fully authoritative and defend data integrity.
3. **No Internal Error Leakage:** The HTTP client receives standard status codes (e.g. 429 when throttled, or normal 200/201 when permitted). Internal Redis error messages, connection strings, and stack traces are never exposed in API responses.

---

### 6. HTTP Contract & Trusted Proxy Handling

When rate limits are exceeded:
- **HTTP Status:** `429 Too Many Requests`.
- **Header:** `Retry-After: <seconds>` (calculated as `Math.ceil(retryAfterMs / 1000)`).
- **JSON Body:**
  ```json
  {
    "error": "Too many requests. Please try again later.",
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 5
  }
  ```

#### Trusted Proxy & IP Extraction:
- Applications deployed behind reverse proxies (Nginx, Cloudflare, AWS ALB) receive client IPs in `x-forwarded-for`.
- Blindly trusting the leftmost IP in `x-forwarded-for` allows attackers to spoof arbitrary IP addresses and bypass IP-based rate limiting.
- The system implements configurable trusted proxy validation (`TRUSTED_PROXY_COUNT` or `TRUSTED_PROXIES` environment variables). If unconfigured or untrusted, fallback to direct remote socket address or rightmost trusted proxy hop.

---

### 7. Explicit Stage 4.1 Non-Goals

The following areas are explicitly deferred to later stages:
- **No Realtime WebSockets / SSE:** Client push notifications and live dashboard subscriptions belong to Stage 4.2+.
- **No External Notification Delivery:** Email, SMS, and WhatsApp dispatchers are not part of Stage 4.1.
- **No Media / CDN Infrastructure:** Image uploads, resizing, and asset pipelines belong to Stage 5.
- **No Microservices Decomposition:** The system remains a modular monolith.
- **No Distributed Caching of Correctness-Critical State:** Balances, inventory quantities, appointment schedules, and subscription statuses MUST NOT be cached in Redis.

---

## Consequences

### Positive
- High-throughput, horizontally scalable outbox event delivery backed by industry-standard BullMQ.
- Elimination of double-retry storms by declaring PostgreSQL as the single retry authority for outbox dispatch.
- Atomic, race-condition-free distributed rate limiting using Redis Lua token buckets.
- Zero risk of PII or credentials leaking into Redis keys.
- Continuous business availability during Redis incidents via policy-driven fail-open semantics for authenticated operations.

### Negative / Trade-offs
- Introduces Redis and BullMQ as operational dependencies for development and production.
- Outbox delivery remains at-least-once: consumers must still implement idempotency using `eventId` since duplicate delivery windows exist if worker processes crash mid-flight.
