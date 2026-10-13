import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db, pool } from "@/infrastructure/database/client";
import { outboxEvents } from "@/infrastructure/database/schema/outbox";
import { DrizzleOutboxRepository } from "@/infrastructure/outbox/drizzle-outbox.repository";
import { InMemoryOutboxTransport } from "@/infrastructure/outbox/in-memory-outbox.transport";
import { OutboxPublisher } from "@/infrastructure/outbox/outbox-publisher";
import { OutboxWorker } from "@/infrastructure/outbox/outbox-worker";
import type { OutboxEnvelope } from "@/infrastructure/outbox/types";
import type { OutboxTransport, OutboxTransportResult } from "@/infrastructure/outbox/outbox-transport.interface";
import type { OutboxLogger } from "@/infrastructure/outbox/outbox-logger";

describe("Stage 4.0 Durable Outbox Publisher Foundation & Invariants", () => {
  const repository = new DrizzleOutboxRepository();
  const testTenantId = randomUUID();
  const testLocationId = randomUUID();

  // Test epoch in 2035 guarantees complete isolation from concurrent parallel test suites
  const TEST_EPOCH = new Date("2035-01-01T00:00:00.000Z");
  let testClockOffset = 0;

  function nextTestOccurredAt(): Date {
    testClockOffset += 1000;
    return new Date(TEST_EPOCH.getTime() + testClockOffset);
  }

  // Keep track of inserted IDs to clean up after tests
  const insertedIds: string[] = [];

  async function createTestEvent(overrides: Partial<typeof outboxEvents.$inferInsert> = {}) {
    const eventId = randomUUID();
    const [row] = await db
      .insert(outboxEvents)
      .values({
        eventId,
        eventType: overrides.eventType ?? "appointment.created",
        eventVersion: overrides.eventVersion ?? 1,
        tenantId: overrides.tenantId ?? testTenantId,
        locationId: overrides.locationId ?? testLocationId,
        aggregateId: overrides.aggregateId ?? randomUUID(),
        occurredAt: overrides.occurredAt ?? nextTestOccurredAt(),
        payload: overrides.payload ?? { testKey: "testValue", amount: 100 },
        status: overrides.status ?? "PENDING",
        attempts: overrides.attempts ?? 0,
        maxAttempts: overrides.maxAttempts ?? 3,
        nextAttemptAt: overrides.nextAttemptAt ?? new Date(Date.now() - 5000),
        lockedAt: overrides.lockedAt ?? null,
        lockedBy: overrides.lockedBy ?? null,
        lockExpiresAt: overrides.lockExpiresAt ?? null,
        publishedAt: overrides.publishedAt ?? null,
        failedAt: overrides.failedAt ?? null,
        lastError: overrides.lastError ?? null,
      })
      .returning();

    insertedIds.push(row.id);
    return row;
  }

  afterEach(async () => {
    if (insertedIds.length > 0) {
      await db.delete(outboxEvents).where(inArray(outboxEvents.id, insertedIds));
      insertedIds.length = 0;
    }
  });

  // 1. Two concurrent publishers never claim the same live lease
  it("1. Two concurrent publishers never claim the same live lease (FOR UPDATE SKIP LOCKED)", async () => {
    const batchSize = 10;
    for (let i = 0; i < batchSize; i++) {
      await createTestEvent();
    }

    // Launch two workers attempting to claim the batch simultaneously
    const [claimA, claimB] = await Promise.all([
      repository.claimBatch({
        workerId: "worker-A",
        batchSize,
        leaseDurationMs: 30_000,
        publishFrom: TEST_EPOCH,
      }),
      repository.claimBatch({
        workerId: "worker-B",
        batchSize,
        leaseDurationMs: 30_000,
        publishFrom: TEST_EPOCH,
      }),
    ]);

    const idsA = new Set(claimA.events.map((e) => e.id));
    const idsB = new Set(claimB.events.map((e) => e.id));

    // Overlap must be strictly empty
    for (const id of idsA) {
      expect(idsB.has(id)).toBe(false);
    }

    // All claimed events must equal the total created
    expect(idsA.size + idsB.size).toBe(batchSize);

    // Verify row ownership in database
    for (const ev of claimA.events) {
      const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, ev.id));
      expect(row.status).toBe("PROCESSING");
      expect(row.lockedBy).toBe("worker-A");
      expect(row.attempts).toBe(1);
    }
    for (const ev of claimB.events) {
      const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, ev.id));
      expect(row.status).toBe("PROCESSING");
      expect(row.lockedBy).toBe("worker-B");
      expect(row.attempts).toBe(1);
    }
  });

  // 2. Expired lease is recoverable
  it("2. Expired lease is recoverable by another worker", async () => {
    const expiredTime = new Date(Date.now() - 10_000);
    const event = await createTestEvent({
      status: "PROCESSING",
      lockedBy: "crashed-worker",
      lockedAt: new Date(Date.now() - 40_000),
      lockExpiresAt: expiredTime,
      attempts: 1,
      maxAttempts: 5,
    });

    const claimResult = await repository.claimBatch({
      workerId: "worker-recovery",
      batchSize: 10,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
      now: new Date(),
    });

    expect(claimResult.recoveredExpiredLeases).toBeGreaterThanOrEqual(1);

    const recovered = claimResult.events.find((e) => e.id === event.id);
    expect(recovered).toBeDefined();
    expect(recovered?.lockedBy).toBe("worker-recovery");
    expect(recovered?.attempts).toBe(2);
    expect(recovered?.status).toBe("PROCESSING");
  });

  // 3. Successful publish -> PUBLISHED
  it("3. Successful publish transitions status to PUBLISHED", async () => {
    const event = await createTestEvent();
    const transport = new InMemoryOutboxTransport();
    const publisher = new OutboxPublisher(repository, transport, {
      leaseDurationMs: 30_000,
    });

    // Claim event
    const claim = await repository.claimBatch({
      workerId: "worker-pub",
      batchSize: 1,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
    });
    expect(claim.events).toHaveLength(1);

    const result = await publisher.publishClaimed(claim.events[0], "worker-pub");
    expect(result.result).toBe("PUBLISHED");

    // Verify transport received envelope
    expect(transport.delivered).toHaveLength(1);
    expect(transport.delivered[0].eventId).toBe(event.eventId);
    expect(transport.delivered[0].eventType).toBe(event.eventType);

    // Verify database row
    const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, event.id));
    expect(row.status).toBe("PUBLISHED");
    expect(row.publishedAt).not.toBeNull();
    expect(row.lastError).toBeNull();
    expect(row.lockedBy).toBeNull();
    expect(row.lockExpiresAt).toBeNull();
  });

  // 4. Transient transport failure -> FAILED + scheduled retry
  it("4. Transient transport failure schedules retry with backoff", async () => {
    const event = await createTestEvent({ attempts: 0, maxAttempts: 5 });
    const transport = new InMemoryOutboxTransport(async () => ({
      ok: false,
      retryable: true,
      error: "Temporary network timeout",
    }));

    const publisher = new OutboxPublisher(repository, transport, {
      leaseDurationMs: 30_000,
      baseBackoffMs: 2000,
      random: () => 0.5, // jitter factor = 1.0
    });

    const claim = await repository.claimBatch({
      workerId: "worker-fail",
      batchSize: 1,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
    });

    const result = await publisher.publishClaimed(claim.events[0], "worker-fail");
    expect(result.result).toBe("RETRY_SCHEDULED");

    const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, event.id));
    expect(row.status).toBe("FAILED");
    expect(row.attempts).toBe(1);
    expect(row.lastError).toContain("Temporary network timeout");
    expect(row.lockedBy).toBeNull();
    expect(row.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  // 5. Backoff is bounded and testable
  it("5. Backoff calculation is bounded and deterministic", () => {
    const transport = new InMemoryOutboxTransport();
    const publisher = new OutboxPublisher(repository, transport, {
      leaseDurationMs: 30_000,
      baseBackoffMs: 1000,
      maxBackoffMs: 30_000,
      random: () => 0.5, // jitter = 0.8 + 0.5 * 0.4 = 1.0
    });

    const now = new Date("2026-10-08T12:00:00.000Z");

    // Attempt 1: 1000 * 2^0 * 1.0 = 1000ms
    const attempt1 = publisher.calculateNextAttemptAt(1, now);
    expect(attempt1.getTime() - now.getTime()).toBe(1000);

    // Attempt 2: 1000 * 2^1 * 1.0 = 2000ms
    const attempt2 = publisher.calculateNextAttemptAt(2, now);
    expect(attempt2.getTime() - now.getTime()).toBe(2000);

    // Attempt 3: 1000 * 2^2 * 1.0 = 4000ms
    const attempt3 = publisher.calculateNextAttemptAt(3, now);
    expect(attempt3.getTime() - now.getTime()).toBe(4000);

    // Attempt 4: 1000 * 2^3 * 1.0 = 8000ms
    const attempt4 = publisher.calculateNextAttemptAt(4, now);
    expect(attempt4.getTime() - now.getTime()).toBe(8000);

    // Attempt 10: capped at maxBackoffMs (30,000ms)
    const attempt10 = publisher.calculateNextAttemptAt(10, now);
    expect(attempt10.getTime() - now.getTime()).toBe(30_000);

    // Test jitter boundaries: with random() = 0 -> 0.8 factor
    const lowJitterPub = new OutboxPublisher(repository, transport, {
      leaseDurationMs: 30_000,
      baseBackoffMs: 1000,
      maxBackoffMs: 30_000,
      random: () => 0,
    });
    expect(lowJitterPub.calculateNextAttemptAt(1, now).getTime() - now.getTime()).toBe(800);

    // with random() = 1 -> 1.2 factor
    const highJitterPub = new OutboxPublisher(repository, transport, {
      leaseDurationMs: 30_000,
      baseBackoffMs: 1000,
      maxBackoffMs: 30_000,
      random: () => 1,
    });
    expect(highJitterPub.calculateNextAttemptAt(1, now).getTime() - now.getTime()).toBe(1200);
  });

  // 6. Exhausted attempts -> DEAD_LETTER
  it("6. Exhausted retry attempts transition to DEAD_LETTER", async () => {
    // Event at attempt 2 with max_attempts = 3
    const event = await createTestEvent({ attempts: 2, maxAttempts: 3 });

    const transport = new InMemoryOutboxTransport(async () => ({
      ok: false,
      retryable: true,
      error: "Persistent third failure",
    }));

    const publisher = new OutboxPublisher(repository, transport, {
      leaseDurationMs: 30_000,
    });

    const claim = await repository.claimBatch({
      workerId: "worker-dead",
      batchSize: 1,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
    });

    // Claim increments attempt from 2 to 3 (which reaches maxAttempts)
    expect(claim.events[0].attempts).toBe(3);

    const result = await publisher.publishClaimed(claim.events[0], "worker-dead");
    expect(result.result).toBe("DEAD_LETTER");

    const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, event.id));
    expect(row.status).toBe("DEAD_LETTER");
    expect(row.failedAt).not.toBeNull();
    expect(row.lastError).toContain("Persistent third failure");
    expect(row.lockedBy).toBeNull();
  });

  // 7. Crash-window re-delivery preserves the exact same eventId
  it("7. Crash-window re-delivery preserves exact eventId for consumer idempotency", async () => {
    const event = await createTestEvent({ maxAttempts: 5 });
    const receivedEnvelopes: OutboxEnvelope[] = [];

    const transport = new InMemoryOutboxTransport(async (envelope) => {
      receivedEnvelopes.push(envelope);
      return { ok: true };
    });

    // 1. Worker 1 claims event
    const claim1 = await repository.claimBatch({
      workerId: "worker-crash",
      batchSize: 1,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
    });

    // 2. Transport delivers envelope
    await transport.publish({
      eventId: claim1.events[0].eventId,
      eventType: claim1.events[0].eventType,
      eventVersion: claim1.events[0].eventVersion,
      tenantId: claim1.events[0].tenantId,
      locationId: claim1.events[0].locationId,
      aggregateId: claim1.events[0].aggregateId,
      occurredAt: claim1.events[0].occurredAt.toISOString(),
      payload: claim1.events[0].payload,
      deliveryAttempt: claim1.events[0].attempts,
    });

    // 3. Worker 1 crashes BEFORE calling markPublished!
    // Simulate lease expiration
    await pool.query(
      `UPDATE outbox_events SET lock_expires_at = $1 WHERE id = $2`,
      [new Date(Date.now() - 10_000), event.id]
    );

    // 4. Worker 2 recovers and claims the expired event
    const publisher2 = new OutboxPublisher(repository, transport, {
      leaseDurationMs: 30_000,
    });

    const claim2 = await repository.claimBatch({
      workerId: "worker-recovered",
      batchSize: 1,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
    });

    // 5. Worker 2 delivers and marks published
    await publisher2.publishClaimed(claim2.events[0], "worker-recovered");

    // Assert: Two deliveries occurred across the crash window
    expect(receivedEnvelopes).toHaveLength(2);
    // Both envelopes have the exact same stable eventId!
    expect(receivedEnvelopes[0].eventId).toBe(event.eventId);
    expect(receivedEnvelopes[1].eventId).toBe(event.eventId);
    expect(receivedEnvelopes[0].eventId).toBe(receivedEnvelopes[1].eventId);

    // State is final
    const [finalRow] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, event.id));
    expect(finalRow.status).toBe("PUBLISHED");
  });

  // 8. publishFrom excludes pre-cutover historical events
  it("8. publishFrom excludes historical events created prior to cutover", async () => {
    const historicalTime = new Date("2034-01-01T00:00:00Z");
    const cutoverTime = new Date("2034-06-01T00:00:00Z");
    const modernTime = new Date("2034-09-01T00:00:00Z");

    const historicalEvent1 = await createTestEvent({ occurredAt: historicalTime });
    const historicalEvent2 = await createTestEvent({ occurredAt: historicalTime });
    const modernEvent = await createTestEvent({ occurredAt: modernTime });

    const claim = await repository.claimBatch({
      workerId: "worker-cutover",
      batchSize: 10,
      leaseDurationMs: 30_000,
      publishFrom: cutoverTime,
    });

    // Only the modern event should be claimed
    expect(claim.events.some((e) => e.id === modernEvent.id)).toBe(true);
    expect(claim.events.some((e) => e.id === historicalEvent1.id)).toBe(false);
    expect(claim.events.some((e) => e.id === historicalEvent2.id)).toBe(false);

    // Verify historical events remained untouched in PENDING
    const [h1] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, historicalEvent1.id));
    const [h2] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, historicalEvent2.id));
    expect(h1.status).toBe("PENDING");
    expect(h1.attempts).toBe(0);
    expect(h2.status).toBe("PENDING");
    expect(h2.attempts).toBe(0);
  });

  // 9. Tenant/event identity remains unchanged and isolated
  it("9. Tenant and event identity are preserved without cross-tenant mutation", async () => {
    const tenantA = randomUUID();
    const tenantB = randomUUID();

    const evA = await createTestEvent({
      tenantId: tenantA,
      payload: { secret: "tenantA_data" },
      eventType: "order.completed",
    });
    const evB = await createTestEvent({
      tenantId: tenantB,
      payload: { secret: "tenantB_data" },
      eventType: "order.completed",
    });

    const transport = new InMemoryOutboxTransport();
    const publisher = new OutboxPublisher(repository, transport, { leaseDurationMs: 30_000 });

    const claim = await repository.claimBatch({
      workerId: "worker-iso",
      batchSize: 10,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
    });

    for (const ev of claim.events) {
      await publisher.publishClaimed(ev, "worker-iso");
    }

    const deliveredA = transport.delivered.find((d) => d.eventId === evA.eventId);
    const deliveredB = transport.delivered.find((d) => d.eventId === evB.eventId);

    expect(deliveredA?.tenantId).toBe(tenantA);
    expect((deliveredA?.payload as any)?.secret).toBe("tenantA_data");

    expect(deliveredB?.tenantId).toBe(tenantB);
    expect((deliveredB?.payload as any)?.secret).toBe("tenantB_data");
  });

  // 10. Stale lease owner cannot acknowledge/fail work after lease ownership changed
  it("10. Stale lease owner cannot mark published or failed after lease is claimed by another", async () => {
    const event = await createTestEvent({ attempts: 1, maxAttempts: 5 });

    // Worker 1 claims
    await repository.claimBatch({
      workerId: "worker-stale",
      batchSize: 1,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
    });

    // Simulate expiration & Worker 2 reclaiming
    await pool.query(
      `UPDATE outbox_events SET status = 'PROCESSING', locked_by = 'worker-new', lock_expires_at = $1 WHERE id = $2`,
      [new Date(Date.now() + 30_000), event.id]
    );

    // Stale Worker 1 attempts to mark published -> LEASE_LOST
    const pubResult = await repository.markPublished(event.id, "worker-stale");
    expect(pubResult).toBe("LEASE_LOST");

    // Stale Worker 1 attempts to mark failed -> LEASE_LOST
    const failResult = await repository.markFailed({
      id: event.id,
      workerId: "worker-stale",
      error: "Late failure",
      retryable: true,
      nextAttemptAt: new Date(Date.now() + 5000),
    });
    expect(failResult).toBe("LEASE_LOST");

    // The event remains actively owned by worker-new in the database
    const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, event.id));
    expect(row.lockedBy).toBe("worker-new");
    expect(row.status).toBe("PROCESSING");
  });

  // 11. Worker stops gracefully with AbortSignal
  it("11. Worker stops gracefully on AbortSignal", async () => {
    const transport = new InMemoryOutboxTransport();
    const publisher = new OutboxPublisher(repository, transport, { leaseDurationMs: 30_000 });
    const worker = new OutboxWorker(repository, publisher, {
      workerId: "worker-abort-test",
      publishFrom: TEST_EPOCH,
      pollIntervalMs: 50,
    });

    const abortController = new AbortController();

    // Start worker loop
    const runPromise = worker.run(abortController.signal);

    // Abort after 80ms
    setTimeout(() => {
      abortController.abort();
    }, 80);

    await expect(runPromise).resolves.toBeUndefined();
  });

  // 12. Publication timeout classification outside DB transaction
  it("12. Publication timeout is classified correctly without holding DB transaction", async () => {
    const event = await createTestEvent({ attempts: 0, maxAttempts: 5 });

    // Transport that hangs indefinitely until signal aborts
    const hangingTransport = new InMemoryOutboxTransport(async (_env, signal) => {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          resolve({ ok: true });
        }, 10_000);

        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          resolve({
            ok: false,
            retryable: true,
            error: "OUTBOX_PUBLISH_TIMEOUT",
          });
        });
      });
    });

    const publisher = new OutboxPublisher(repository, hangingTransport, {
      leaseDurationMs: 30_000,
      publishTimeoutMs: 100, // Timeout after 100ms
    });

    const claim = await repository.claimBatch({
      workerId: "worker-timeout",
      batchSize: 1,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
    });

    const result = await publisher.publishClaimed(claim.events[0], "worker-timeout");
    expect(result.result).toBe("RETRY_SCHEDULED");
    expect(result.errorCategory).toBe("TIMEOUT");

    const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, event.id));
    expect(row.status).toBe("FAILED");
    expect(row.lastError).toContain("OUTBOX_PUBLISH_TIMEOUT");
  });

  // 13. Sanitization of sensitive error data
  it("13. Sanitizes secrets and bounds error messages in last_error", async () => {
    const event = await createTestEvent();

    await repository.claimBatch({
      workerId: "worker-sec",
      batchSize: 1,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
    });

    const sensitiveError =
      "Failed to connect to postgresql://barber_admin:super_secret_pw@db.prod.internal:5432/barber " +
      "using authorization Bearer sensitive_jwt_token_123456789 and apiKey=prod_secret_api_key_abc " +
      "X".repeat(5000);

    const failResult = await repository.markFailed({
      id: event.id,
      workerId: "worker-sec",
      error: sensitiveError,
      retryable: true,
      nextAttemptAt: new Date(Date.now() + 10_000),
    });

    expect(failResult).toBe("RETRY_SCHEDULED");

    const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, event.id));
    expect(row.lastError).not.toContain("super_secret_pw");
    expect(row.lastError).not.toContain("sensitive_jwt_token_123456789");
    expect(row.lastError).not.toContain("prod_secret_api_key_abc");
    expect(row.lastError).toContain("[REDACTED]");
    expect(row.lastError?.length).toBeLessThanOrEqual(4000);
  });

  // 14. Batch telemetry results expose metrics for OpenTelemetry mapping
  it("14. Batch run exposes duration, event age, and error category metrics", async () => {
    const occurredAt = new Date("2035-01-01T00:00:00.000Z");
    const simulatedNow = new Date("2035-01-01T00:00:10.000Z"); // 10s age
    await createTestEvent({ occurredAt });

    const transport = new InMemoryOutboxTransport();
    const publisher = new OutboxPublisher(repository, transport, {
      leaseDurationMs: 30_000,
      clock: () => simulatedNow,
    });
    const worker = new OutboxWorker(repository, publisher, {
      workerId: "worker-metrics",
      publishFrom: TEST_EPOCH,
      clock: () => simulatedNow,
    });

    const batchResult = await worker.runOnce();

    expect(batchResult.workerId).toBe("worker-metrics");
    expect(batchResult.claimed).toBeGreaterThanOrEqual(1);
    expect(batchResult.published).toBeGreaterThanOrEqual(1);
    expect(batchResult.durationMs).toBeGreaterThanOrEqual(0);
    expect(batchResult.oldestClaimedAgeMs).toBe(10_000);
    expect(batchResult.errorCategories).toBeDefined();
  });

  // 15. High Concurrency Stress: 10 concurrent publishers competing for 50 events
  it("15. 10 Concurrent publishers competing for 50 events have zero overlap and zero duplicate leases", async () => {
    const totalEvents = 50;
    for (let i = 0; i < totalEvents; i++) {
      await createTestEvent();
    }

    const workerCount = 10;
    const batchSize = 10;

    const claimPromises = Array.from({ length: workerCount }, (_, i) =>
      repository.claimBatch({
        workerId: `concurrent-worker-${i}`,
        batchSize,
        leaseDurationMs: 30_000,
        publishFrom: TEST_EPOCH,
      })
    );

    const claimResults = await Promise.all(claimPromises);

    const allClaimedIds: string[] = [];
    const uniqueClaimedIds = new Set<string>();

    for (const res of claimResults) {
      for (const ev of res.events) {
        allClaimedIds.push(ev.id);
        expect(uniqueClaimedIds.has(ev.id)).toBe(false); // No two workers claimed the same event
        uniqueClaimedIds.add(ev.id);
      }
    }

    // Exactly 50 events claimed across all 10 workers
    expect(allClaimedIds.length).toBe(totalEvents);
    expect(uniqueClaimedIds.size).toBe(totalEvents);
  });

  // 16. Non-retryable transport failure moves directly to DEAD_LETTER
  it("16. Non-retryable transport failure transitions directly to DEAD_LETTER regardless of attempts", async () => {
    const event = await createTestEvent({ attempts: 0, maxAttempts: 10 });
    const transport = new InMemoryOutboxTransport(async () => ({
      ok: false,
      retryable: false, // Explicitly non-retryable (e.g. fatal validation or malformed payload)
      error: "FATAL_SCHEMA_VIOLATION",
    }));

    const publisher = new OutboxPublisher(repository, transport, { leaseDurationMs: 30_000 });

    const claim = await repository.claimBatch({
      workerId: "worker-fatal",
      batchSize: 1,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
    });

    const result = await publisher.publishClaimed(claim.events[0], "worker-fatal");
    expect(result.result).toBe("DEAD_LETTER");

    const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, event.id));
    expect(row.status).toBe("DEAD_LETTER");
    expect(row.failedAt).not.toBeNull();
    expect(row.lastError).toContain("FATAL_SCHEMA_VIOLATION");
  });

  // 17. Expired lease with attempts >= maxAttempts transitions to DEAD_LETTER during claim sweep
  it("17. Expired lease with exhausted attempts transitions to DEAD_LETTER during claim sweep", async () => {
    const expiredTime = new Date(Date.now() - 15_000);
    const event = await createTestEvent({
      status: "PROCESSING",
      lockedBy: "dead-worker",
      lockedAt: new Date(Date.now() - 45_000),
      lockExpiresAt: expiredTime,
      attempts: 5,
      maxAttempts: 5, // Exhausted
    });

    const claimResult = await repository.claimBatch({
      workerId: "worker-sweep",
      batchSize: 10,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
    });

    expect(claimResult.deadLetteredExpiredLeases).toBeGreaterThanOrEqual(1);

    const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, event.id));
    expect(row.status).toBe("DEAD_LETTER");
    expect(row.failedAt).not.toBeNull();
    expect(row.lastError).toContain("Worker lease expired after final delivery attempt");
  });

  // 18. Non-cooperative transport that never resolves and ignores AbortSignal settles within bounded timeout
  it("18. Non-cooperative transport that never resolves and ignores AbortSignal settles within bounded timeout", async () => {
    const event = await createTestEvent({ attempts: 0, maxAttempts: 5 });

    // Non-cooperative transport: publish returns a Promise that never resolves and ignores AbortSignal
    let transportReceivedEnvelope: OutboxEnvelope | null = null;
    const nonCooperativeTransport: OutboxTransport = {
      publish: async (envelope, _signal) => {
        transportReceivedEnvelope = envelope;
        return new Promise<OutboxTransportResult>(() => {
          // Intentionally never resolves and never attaches signal listener
        });
      },
    };

    const publisher = new OutboxPublisher(repository, nonCooperativeTransport, {
      leaseDurationMs: 30_000,
      publishTimeoutMs: 75, // Bounded timeout between 50-100ms
    });

    const claim = await repository.claimBatch({
      workerId: "worker-noncoop",
      batchSize: 1,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
    });
    expect(claim.events).toHaveLength(1);

    const startedAt = Date.now();
    const result = await publisher.publishClaimed(claim.events[0], "worker-noncoop");
    const duration = Date.now() - startedAt;

    // Must settle within bounded test window: >= 70ms and well under 2000ms
    expect(duration).toBeGreaterThanOrEqual(70);
    expect(duration).toBeLessThan(2000);

    // Transport did receive envelope
    expect(transportReceivedEnvelope).not.toBeNull();
    expect(transportReceivedEnvelope!.eventId).toBe(event.eventId);

    // Result must classify TIMEOUT and schedule retry
    expect(result.result).toBe("RETRY_SCHEDULED");
    expect(result.errorCategory).toBe("TIMEOUT");
    expect(result.error).toContain("OUTBOX_PUBLISH_TIMEOUT");

    // Database row must be updated to FAILED with attempts = 1
    const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, event.id));
    expect(row.status).toBe("FAILED");
    expect(row.attempts).toBe(1);
    expect(row.lastError).toContain("OUTBOX_PUBLISH_TIMEOUT");
    expect(row.lockedBy).toBeNull();
    expect(row.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  // 19. Capturing logger + transport error containing raw secrets are sanitized in logs and database
  it("19. Capturing logger + transport error containing raw secrets are sanitized in logs and database", async () => {
    const event = await createTestEvent({ attempts: 0, maxAttempts: 5 });

    const rawPassword = "super_secret_db_password_12345!";
    const rawBearer = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive_jwt_payload_data.xyz";
    const rawApiKey = ["sk", "live", "syntheticNeverRealFixtureKey1234567890"].join("_");
    const rawPostgresCredentials = "barber_superuser:extreme_db_secret_999";
    const rawPostgresUrl = `postgresql://${rawPostgresCredentials}@db-internal.production:5432/barber_ledger`;

    const sensitiveError =
      `Transport failed connecting to ${rawPostgresUrl} with apiKey=${rawApiKey} ` +
      `and Bearer ${rawBearer} and password=${rawPassword} ` +
      "EXTRA_DATA_".repeat(500);

    const loggedEvents: { level: string; message: string; fields?: Record<string, unknown> }[] = [];
    const capturingLogger: OutboxLogger = {
      info(message, fields) {
        loggedEvents.push({ level: "INFO", message, fields });
      },
      warn(message, fields) {
        loggedEvents.push({ level: "WARN", message, fields });
      },
      error(message, fields) {
        loggedEvents.push({ level: "ERROR", message, fields });
      },
    };

    const failingTransport = new InMemoryOutboxTransport(async () => ({
      ok: false,
      retryable: true,
      error: sensitiveError,
    }));

    const publisher = new OutboxPublisher(repository, failingTransport, {
      leaseDurationMs: 30_000,
      logger: capturingLogger,
    });

    const claim = await repository.claimBatch({
      workerId: "worker-capturing-sec",
      batchSize: 1,
      leaseDurationMs: 30_000,
      publishFrom: TEST_EPOCH,
    });
    expect(claim.events).toHaveLength(1);

    const result = await publisher.publishClaimed(claim.events[0], "worker-capturing-sec");
    expect(result.result).toBe("RETRY_SCHEDULED");

    // 1. Process result must NOT leak raw secrets
    expect(result.error).not.toContain(rawPassword);
    expect(result.error).not.toContain(rawBearer);
    expect(result.error).not.toContain(rawApiKey);
    expect(result.error).not.toContain(rawPostgresCredentials);
    expect(result.error).not.toContain("extreme_db_secret_999");
    expect(result.error).toContain("[REDACTED]");

    // 2. Capturing logger: verify no raw secret appears anywhere in logged message or fields
    expect(loggedEvents.length).toBeGreaterThan(0);
    for (const entry of loggedEvents) {
      const serialized = JSON.stringify(entry);
      expect(serialized).not.toContain(rawPassword);
      expect(serialized).not.toContain(rawBearer);
      expect(serialized).not.toContain(rawApiKey);
      expect(serialized).not.toContain(rawPostgresCredentials);
      expect(serialized).not.toContain("extreme_db_secret_999");
      expect(serialized).toContain("[REDACTED]");
      // Ensure payload data is not logged
      expect(serialized).not.toContain("testKey");
    }

    // 3. Database row: verify last_error is sanitized and bounded <= 4000
    const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, event.id));
    expect(row.status).toBe("FAILED");
    expect(row.lastError).not.toBeNull();
    expect(row.lastError).not.toContain(rawPassword);
    expect(row.lastError).not.toContain(rawBearer);
    expect(row.lastError).not.toContain(rawApiKey);
    expect(row.lastError).not.toContain(rawPostgresCredentials);
    expect(row.lastError).not.toContain("extreme_db_secret_999");
    expect(row.lastError).toContain("[REDACTED]");
    expect(row.lastError!.length).toBeLessThanOrEqual(4000);
  });
});

