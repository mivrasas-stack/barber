# ADR-045: Durable Outbox Publication with PostgreSQL Leases and At-Least-Once Delivery

## Status

**ACCEPTED & CERTIFIED — Stage 4.0**

## Context

Barber Paradise has accumulated domain events in `outbox_events` since the early transactional stages. Producers already persist business mutations and their corresponding outbox records inside the same PostgreSQL transaction.

At the start of Stage 4, the development database contains hundreds of historical `PENDING` events. Publishing them blindly when a broker is introduced could trigger stale notifications, realtime updates or other side effects.

The existing outbox schema is sufficient for durable capture but is not sufficient for safe horizontal publication because it does not yet model:

- concurrent claiming;
- worker ownership;
- expiring leases;
- retry attempts;
- retry scheduling;
- terminal dead-letter state;
- publication timestamps;
- failure diagnostics;
- explicit historical cutover.

Stage 4 must add asynchronous execution without weakening any frozen transactional invariant. PostgreSQL remains the source of truth.

## Decision

Stage 4.0 will implement a PostgreSQL-backed outbox publisher foundation with **at-least-once** delivery semantics.

The publisher will not depend on Redis. Redis/broker integration belongs to Stage 4.1 and will implement the transport interface established here.

### Delivery states

The supported lifecycle is:

```text
PENDING
   │ claim
   ▼
PROCESSING
   │
   ├── publish succeeds ─────────────► PUBLISHED
   │
   ├── publish fails + retries left ─► FAILED ──► PROCESSING
   │
   └── attempts exhausted ───────────► DEAD_LETTER
```

An expired `PROCESSING` lease may be reclaimed by another worker.

### Schema additions

`outbox_events` will gain operational delivery metadata:

- `attempts` — number of delivery claims attempted;
- `max_attempts` — terminal retry threshold;
- `next_attempt_at` — earliest timestamp at which the event may be claimed;
- `locked_at` — current lease acquisition time;
- `locked_by` — worker identity;
- `lock_expires_at` — lease expiration;
- `published_at` — successful publication timestamp;
- `failed_at` — terminal dead-letter timestamp;
- `last_error` — bounded diagnostic message;
- `updated_at` — operational state update timestamp.

Indexes will support ready-event claiming and expired-lease recovery.

### Claim algorithm

Workers claim a bounded batch in a short PostgreSQL transaction using row locks with `FOR UPDATE SKIP LOCKED`.

Eligible rows are:

- `PENDING` and due;
- retryable `FAILED` and due;
- `PROCESSING` with an expired lease.

Rows already locked by another publisher are skipped rather than blocking competing workers.

The claim transaction:

1. selects eligible IDs ordered by `occurred_at` and `id`;
2. locks them with `FOR UPDATE SKIP LOCKED`;
3. changes them to `PROCESSING`;
4. assigns `locked_by`, `locked_at`, and `lock_expires_at`;
5. increments `attempts`;
6. commits immediately.

No network call is executed while the database transaction is open.

### Publication transaction boundary

Publication occurs **after** the claim transaction commits.

For each claimed event:

1. renew/verify the lease before publication when necessary;
2. publish the immutable event envelope through an `OutboxTransport`;
3. on acknowledgement, atomically mark the event `PUBLISHED`;
4. on failure, persist the diagnostic error and schedule the next attempt with exponential backoff and jitter;
5. after the configured maximum attempts, move the event to `DEAD_LETTER`.

### At-least-once consequence

There is an unavoidable crash window:

```text
broker accepts event
        ↓
publisher process dies
        ↓
PUBLISHED was not persisted
        ↓
lease expires
        ↓
event is published again
```

Therefore consumers MUST be idempotent using `eventId` as the stable delivery identity.

Exactly-once delivery is not claimed.

### Event envelope

Transports receive an immutable envelope containing at minimum:

- `eventId`
- `eventType`
- `eventVersion`
- `tenantId`
- `locationId`
- `aggregateId`
- `occurredAt`
- `payload`

The transport must not infer authorization from tenant identifiers contained in the message.

### Event naming

The current repository contains both versioned and unversioned event names.

Examples include:

- `appointment.created`
- `order.completed`
- `payment.succeeded.v1`
- `subscription.invoice.generated.v1`

Stage 4.0 will **not rewrite frozen producer contracts** merely for cosmetic consistency.

The publisher treats `eventType` and `eventVersion` as opaque contract fields and forwards them unchanged.

A future contract-normalization ADR may define one canonical naming convention and compatibility aliases. Consumers introduced in Stage 4 must explicitly register the event types they support.

### Historical backlog cutover

A production publisher must not silently deliver every historical `PENDING` row on first startup.

The claim API therefore supports an optional `publishFrom` / minimum `occurredAt` boundary.

Production enablement must choose and record a cutover timestamp. Events older than the cutover remain durable and may be explicitly replayed, archived or terminally classified through a separate audited operation.

There is no automatic destructive migration of historical outbox rows.

### Worker model

Stage 4.0 establishes reusable worker primitives:

- bounded batch size;
- worker identity;
- polling interval;
- lease duration;
- publication timeout at the transport boundary;
- exponential retry backoff with jitter;
- graceful shutdown using `AbortSignal`;
- batch result counters for observability.

The worker may be horizontally replicated because PostgreSQL row claiming prevents duplicate simultaneous ownership. Duplicate delivery after crashes remains possible by design and is handled through consumer idempotency.

### Transport boundary

Stage 4.0 defines an `OutboxTransport` interface but does not bind the core to Redis, BullMQ, Kafka, RabbitMQ or any other broker.

Stage 4.1 will provide the chosen Redis/queue transport.

The Stage 4.0 foundation must be fully testable with deterministic in-memory/fake transports without marking arbitrary production events as delivered.

## Failure behavior

### Worker dies before publishing

The lease expires and another worker reclaims the event.

### Worker dies after publish but before marking PUBLISHED

The event may be delivered again. Consumer idempotency on `eventId` is mandatory.

### Transport is unavailable

The event is recorded as retryable `FAILED` and is scheduled with backoff. Business transactions are unaffected because they already committed before publication.

### Retry threshold is exhausted

The event becomes `DEAD_LETTER`. It is never silently deleted. Operators must be able to inspect and explicitly replay dead-letter events in a later operational stage.

### PostgreSQL is unavailable

No claim or state transition is possible. The worker stops making progress and reports the error. It must not fabricate publication success.

## Ordering

Stage 4.0 does **not** guarantee global ordering or strict per-aggregate ordering across independent workers.

Consumers must tolerate duplicate and potentially reordered events unless a specific future use case establishes a stronger ordering contract.

No current financial, inventory, booking or payment invariant may depend on asynchronous event order.

## Observability

Before full OpenTelemetry integration, each publisher batch must expose structured operational facts sufficient to later map into metrics:

- worker ID;
- claimed count;
- published count;
- failed/retry count;
- dead-letter count;
- batch duration;
- oldest claimed event age;
- transport error category.

Secrets and full sensitive payloads must never be logged.

## Stage 4.0 Non-Goals

Stage 4.0 explicitly does **not** introduce:

- Redis;
- BullMQ;
- Redis Streams;
- Redis Pub/Sub;
- WebSockets;
- SSE;
- notification providers;
- microservices;
- Kubernetes;
- read replicas;
- distributed caching;
- CDN/media processing.

Those capabilities depend on the safe delivery foundation established here.

## Testing requirements

Stage 4.0 is not frozen until automated tests prove:

1. two or more concurrent publishers never claim the same live lease;
2. an expired lease is recoverable;
3. successful publication transitions to `PUBLISHED`;
4. transient transport failure schedules a retry;
5. backoff is bounded and testable;
6. retry exhaustion transitions to `DEAD_LETTER`;
7. a crash-window replay preserves the same `eventId`;
8. historical cutover excludes pre-cutover rows;
9. unrelated tenants cannot affect each other's event identity or payload;
10. all previously frozen tests remain green;
11. migrations reproduce successfully on an empty PostgreSQL database.

## Consequences

### Positive

- Safe horizontal publisher scaling.
- No network call inside business transactions.
- Explicit crash recovery.
- Durable retry diagnostics.
- Broker independence.
- Clean foundation for Redis/queue integration.
- Historical event cutover is deliberate rather than accidental.

### Negative

- Delivery is at-least-once rather than exactly-once.
- Consumers must implement idempotency.
- Additional operational state is stored in PostgreSQL.
- Dead-letter monitoring and replay tooling will be required.
- Strict event ordering is intentionally not provided.

## Follow-up

After Stage 4.0 is certified, Stage 4.1 may introduce Redis and queue infrastructure behind the transport boundary without changing frozen domain transactions.
