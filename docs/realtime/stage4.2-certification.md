# Stage 4.2 — Realtime Gateway, Ephemeral Presence & Outbox Fanout Foundation Certification Report

**Date:** 2026-10-08  
**Branch:** `stage4.2-realtime-presence`  
**Verdict:** **STAGE 4.2 FROZEN**

---

## 1. Executive Summary & Scope

Stage 4.2 successfully delivers an independently scalable, hardened Realtime Gateway and Presence foundation for Barber Paradise v2, building atop the certified Stage 4.1 Redis queue transport and Stage 4.0 transactional PostgreSQL outbox publisher.

### Key Capabilities Delivered:
1. **Independently Scalable WebSocket Gateway:** Standards-based WebSocket server powered by the `ws` package, decoupling realtime persistent connections from Next.js serverless execution constraints.
2. **Server-Side Authentication & Identity Derivation:** Sockets authenticate via signed session tokens (`HS256`); client-supplied tenant, user, or role claims are never trusted; distributed token bucket rate limiting protects connection and auth endpoints from abuse.
3. **Strict Topic Authorization & Tenant Isolation:** Strongly-typed topic patterns (`tenant:{id}`, `location:{id}`, `professional:{id}`, `appointment:{id}`, `order:{id}`, `customer:{id}`, `user:{id}`) with server-side authorization preventing cross-tenant leakage.
4. **Ephemeral Redis Presence with Dynamic TTL:** Transient presence tracking stored in Redis with 60-second TTL, active heartbeat (`ping`/`pong`) refresh, and explicit disconnect cleanup.
5. **Horizontal Multi-Replica Fanout:** Redis Pub/Sub broadcast distribution across all gateway replicas, delivering events strictly to authorized local subscribers.
6. **Durable Outbox-to-Realtime Bridge:** BullMQ consumer reading transactional outbox events, deduplicating idempotently on `eventId`, filtering against an explicit supported-event whitelist, and redacting sensitive payloads prior to browser delivery.
7. **Robust Backpressure & Reconnect Protection:** Enforced max payload bytes (32 KB), max subscriptions per socket (50), slow-consumer buffer termination (> 1 MB `bufferedAmount`), and graceful shutdown draining with retryable code `1012 (Service Restart)`.

---

## 2. Architectural Invariants Certified

- **PostgreSQL Sole Authoritative Source of Truth:** PostgreSQL remains the sole authority for appointments, users, tenants, locations, memberships, catalog, inventory, orders, ledger, payments, and subscriptions. Realtime is strictly an ephemeral distribution channel.
- **Redis as Ephemeral Infrastructure:** Redis is strictly transient transport and caching infrastructure. No domain entity or presence state is permanently master-stored in Redis.
- **Zero Business Corruption on Realtime / Redis Outage:** If Redis Pub/Sub crashes or partitions, business operations (appointments, POS checkouts, payments, ledger postings) in PostgreSQL are 100% unaffected. Realtime gracefully degrades and clients recover via authoritative HTTP REST queries.
- **No Long-Lived Sockets in Serverless Handlers:** Realtime runs as a dedicated Node.js service (`src/infrastructure/realtime/server.ts`), preserving Next.js edge/serverless boundaries.
- **Zero Secret / PII Leakage:** Credentials, raw tokens, passwords, and sensitive columns are redacted or SHA-256 masked before logging, telemetry, or browser event dispatch.

---

## 3. Dependency Choices & Transport Decisions

### Dependencies
- `ws@^8.18.0`: High-performance, standards-compliant WebSocket implementation for Node.js.
- `ioredis@^6.0.0`: Centralized Redis client for Pub/Sub broadcasting and ephemeral presence.
- `bullmq@^6.3.11`: Reliable queue consumer for transactional outbox jobs.
- `zod@^3.24.2`: Strict frame schema validation and topic parsing.

### Transport Evaluation Matrix
| Candidate | Strengths | Weaknesses | Decision |
| :--- | :--- | :--- | :--- |
| **Server-Sent Events (SSE)** | Native browser API | Unidirectional; requires separate HTTP requests for subscription and heartbeats | **REJECTED** |
| **Socket.IO** | Fallback HTTP polling | Heavy proprietary protocol; complex sticky-session requirement | **REJECTED** |
| **Next.js Serverless Route** | Integrated runtime | Connection termination timeouts; incompatible with long-lived sockets | **REJECTED** |
| **Raw `ws` WebSocket Server** | Fast, minimal framing, full-duplex, stateless horizontal scale | Requires custom reconnection & ping/pong logic | **ACCEPTED** |

---

## 4. Security & Authorization Architecture

### Authentication Flow
1. Sockets connect via standard `ws://` / `wss://` upgrade.
2. In production, `Origin` header is verified against `REALTIME_ALLOWED_ORIGINS`.
3. Socket must send `{ "type": "auth", "token": "..." }` within 10 seconds. Sockets failing to authenticate are terminated with code `4401 (Authentication Timeout)`.
4. The server decodes the JWT, verifies cryptographic signature against `AUTH_SECRET`, verifies active user status, and loads authorized `tenantIds`.

### Topic Scopes & Authorization Matrix
| Topic Pattern | Target Scope | Authorization Rule |
| :--- | :--- | :--- |
| `tenant:{tenantId}` | Entire tenant broadcast | Authenticated user must have active membership in `tenantId` (or platform admin). |
| `location:{locationId}` | Specific branch | User belongs to tenant owning the location (or platform admin). |
| `professional:{professionalId}` | Barber feed | User is that professional OR belongs to tenant workspace (or platform admin). |
| `appointment:{appointmentId}` | Booking stream | User is customer, assigned barber, or tenant staff (or platform admin). |
| `order:{orderId}` | Order stream | User is customer or tenant cashier/staff (or platform admin). |
| `customer:{customerId}` | Customer stream | User is matching customer or tenant staff (or platform admin). |
| `user:{userId}` | Private user stream | Strictly requires authenticated `userId === topicId` (or platform admin). |

---

## 5. Ephemeral Presence & Horizontal Fanout Semantics

### Ephemeral Presence Keys
- Connection Key: `bp:presence:conn:{connectionId}` storing connection metadata with `EX 60`.
- User Tenant Set: `bp:presence:t:{tenantId}:{userId}` storing active connection IDs with `EXPIRE 60`.
- Heartbeat (`ping` -> `pong`) refreshes TTL on active keys.
- Disconnect explicitly removes connection key and set membership.
- Node crash self-heals within 60 seconds as keys expire naturally.

### Horizontal Fanout
- Publisher: Dispatches serialized envelopes to Redis channel `bp:realtime:fanout`.
- Subscriber: Every gateway replica subscribes and passes incoming envelopes to local clients matching the authorized topic.
- Multi-replica statelessness: Clients reconnecting to any gateway replica re-authenticate and immediately resume receiving live events without sticky sessions.

---

## 6. Outbox-to-Realtime Bridge Semantics

- **Queue Name:** `barber-paradise-outbox` (BullMQ from Stage 4.1).
- **Deduplication:** Atomic Redis key `bp:realtime:dedup:{eventId}` with 24h TTL prevents duplicate fanout broadcasts across BullMQ retries.
- **Whitelist Registry:** Explicit mapper registry (`SUPPORTED_EVENT_REGISTRY`) maps domain events to client-safe topics and removes internal database columns and secrets.
- **Unsupported Events:** Events like internal audits or system jobs are safely ignored (`SKIPPED_UNSUPPORTED`) without throwing errors.

---

## 7. Quality Gates & Certification Evidence

| Quality Gate | Requirement | Result | Evidence / Notes |
| :--- | :--- | :--- | :--- |
| **Stage 4.2 Suite (Run 1)** | Dedicated 23 tests | **PASS** | 23/23 passing in 3.07s |
| **Stage 4.2 Suite (Run 2)** | Dedicated 23 tests | **PASS** | 23/23 passing in 3.00s |
| **Stage 4.1 Dedicated Suite** | Redis Queue & Rate Limit | **PASS** | 21/21 passing in 478ms |
| **Stage 4.0 Outbox Suite** | Outbox foundation | **PASS** | 19/19 passing in 1.57s |
| **Stage 3C.1 Webhook Suite** | 50-concurrency webhooks | **PASS** | 5/5 passing (50 concurrent webhooks: exactly 1 wins) |
| **TypeScript Typecheck** | `npm run typecheck` | **PASS** | `tsc --noEmit` exited 0 |
| **ESLint Linter** | `npm run lint` | **PASS** | 0 errors |
| **Docker Compose Config** | Validated config | **PASS** | `docker compose config` clean |
| **Production Build** | `npm run build` | **PASS** | 120/120 static and dynamic routes compiled |
| **Full Automated Test Suite** | `npm test` | **PASS** | 24 files / 202 tests passing (100% green) |

---

## 8. Invariant Test Breakdown

1. **Invalid/expired auth rejected:** Returns `AUTH_FAILED` error.
2. **Valid auth establishes identity:** Verified session yields `ready` message.
3. **Client authority elevation rejected:** Server enforces server-side tenant/user identity.
4. **Cross-tenant subscribe rejected:** Denied with `UNAUTHORIZED_TOPIC`.
5. **Authorized topics accepted:** Valid `tenant`, `location`, `user` topics accepted.
6. **Malformed JSON rejected:** Returns `MALFORMED_MESSAGE`.
7. **Unknown message type rejected:** Returns `UNKNOWN_MESSAGE_TYPE`.
8. **Oversized frame rejected:** Frames > 32 KB closed with code `1009`.
9. **Subscription limit enforced:** Sockets exceeding 50 subscriptions rejected.
10. **Presence key gets TTL:** Connected users receive positive TTL on Redis keys.
11. **Heartbeat refreshes TTL:** `ping`/`pong` refreshes Redis presence expiration.
12. **Disconnect removes presence:** Socket termination cleans up presence records.
13. **Multi-gateway fanout:** Two gateways receive identical fanout envelope via Redis Pub/Sub.
14. **Topic isolation:** Subscribers receive only events matching their authorized topics.
15. **Outage resilience:** Unreachable Redis degrades fanout gracefully without domain corruption.
16. **Backpressure protection:** Buffered amount > 1 MB terminates slow consumers.
17. **Heartbeat timeout protection:** Unresponsive sockets terminated by heartbeat monitor.
18. **Graceful shutdown:** Drains sockets with retryable code `1012 (Service Restart)`.
19. **Outbox event mapping:** Sanitizes payloads and computes target topics.
20. **Unsupported outbox events dropped:** Safely ignored without exceptions.
21. **Idempotent deduplication:** Re-delivered `eventId` processed exactly once.
22. **Zero secret/token logging:** Tokens and credentials masked before emission.
23. **Cross-gateway reconnection:** Seamless re-auth and resubscription on replica failover.
24. **Stage 4.1 regression certified:** 21/21 rate limiting and BullMQ queue tests pass.
25. **Stage 4.0 regression certified:** 19/19 outbox foundation tests pass.
26. **Financial & concurrency invariants certified:** Ledger balance and 50-concurrency tests pass.

---

## 9. Known Risks & Next-Stage Recommendations

### Operational Guidelines
- **Best-Effort Realtime Delivery:** Realtime WebSocket push is ephemeral. Clients must query authoritative REST HTTP endpoints upon reconnecting to catch up on state changes.
- **Heartbeat Margins:** Reverse proxies (ALB/Nginx) must configure `proxy_read_timeout >= 60s` to accommodate the 15-second heartbeat interval.

### Next-Stage Recommendations
- **Stage 4.3 Notifications:** Connect outbound email (Resend/SendGrid) and SMS/WhatsApp providers to the durable BullMQ outbox queue, leveraging the idempotency and rate limiting patterns certified in Stage 4.1 and Stage 4.2.
