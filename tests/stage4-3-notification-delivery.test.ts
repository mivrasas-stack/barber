import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  notificationDeliveries,
  notificationIntents,
} from "@/infrastructure/database/schema/notifications";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { DrizzleNotificationDeliveryRepository } from "@/modules/notifications/infrastructure/drizzle-notification-delivery.repository";
import { FakeNotificationProvider } from "@/modules/notifications/infrastructure/fake-notification.provider";
import type { NotificationProviderMessage } from "@/modules/notifications/domain/notification-channel-provider.interface";

describe("Stage 4.3C1 Notification Delivery — leases, retries and provider boundary", () => {
  const tenantIds: string[] = [];
  const intentIds: string[] = [];

  async function createTenant(label: string): Promise<string> {
    const suffix = randomUUID().slice(0, 8);
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: `notif-delivery-${label}-${suffix}`,
        name: `Notification Delivery ${label} ${suffix}`,
      })
      .returning({ id: tenants.id });

    tenantIds.push(tenant.id);
    return tenant.id;
  }

  async function createDelivery(
    tenantId: string,
    input: {
      channel?: "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";
      status?: string;
      attempts?: number;
      maxAttempts?: number;
      nextAttemptAt?: Date;
      lockedAt?: Date | null;
      lockedBy?: string | null;
      lockExpiresAt?: Date | null;
    } = {}
  ): Promise<{ intentId: string; deliveryId: string }> {
    const eventId = randomUUID();
    const [intent] = await db
      .insert(notificationIntents)
      .values({
        sourceEventId: eventId,
        sourceEventType: "appointment.created",
        tenantId,
        recipientKind: "CONTACT",
        recipientReference: `contact:${randomUUID()}`,
        category: "APPOINTMENT",
        policyKey: "appointment.created.transactional",
        templateKey: "appointment.created",
        templateVersion: 1,
        locale: "es-CO",
        timezone: "America/Bogota",
        payload: {
          appointmentId: randomUUID(),
          status: "PENDING",
        },
        dedupeKey: randomUUID(),
        mandatory: true,
        status: "CREATED",
      })
      .returning({ id: notificationIntents.id });

    intentIds.push(intent.id);

    const [delivery] = await db
      .insert(notificationDeliveries)
      .values({
        notificationIntentId: intent.id,
        channel: input.channel ?? "EMAIL",
        status: input.status ?? "PENDING",
        attempts: input.attempts ?? 0,
        maxAttempts: input.maxAttempts ?? 8,
        nextAttemptAt: input.nextAttemptAt ?? new Date(),
        lockedAt: input.lockedAt ?? null,
        lockedBy: input.lockedBy ?? null,
        lockExpiresAt: input.lockExpiresAt ?? null,
      })
      .returning({ id: notificationDeliveries.id });

    return {
      intentId: intent.id,
      deliveryId: delivery.id,
    };
  }

  async function getDelivery(id: string) {
    const [row] = await db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.id, id))
      .limit(1);
    return row;
  }

  afterEach(async () => {
    if (intentIds.length > 0) {
      await db
        .delete(notificationDeliveries)
        .where(inArray(notificationDeliveries.notificationIntentId, intentIds));
      await db
        .delete(notificationIntents)
        .where(inArray(notificationIntents.id, intentIds));
    }

    if (tenantIds.length > 0) {
      await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    }

    intentIds.length = 0;
    tenantIds.length = 0;
  });

  it("1. claimBatch only claims due external channels and never reclaims IN_APP delivery rows", async () => {
    const tenantId = await createTenant("external-only");
    await createDelivery(tenantId, { channel: "IN_APP" });
    const external = await createDelivery(tenantId, { channel: "EMAIL" });
    const repository = new DrizzleNotificationDeliveryRepository();

    const result = await repository.claimBatch({
      workerId: "worker-a",
      batchSize: 10,
      leaseDurationMs: 30_000,
    });

    expect(result.deliveries).toHaveLength(1);
    expect(result.deliveries[0].id).toBe(external.deliveryId);
    expect(result.deliveries[0].channel).toBe("EMAIL");
    expect(result.deliveries[0].status).toBe("PROCESSING");
    expect(result.deliveries[0].attempts).toBe(1);
  });

  it("2. concurrent workers claim disjoint batches with FOR UPDATE SKIP LOCKED", async () => {
    const tenantId = await createTenant("concurrent");
    for (let index = 0; index < 20; index += 1) {
      await createDelivery(tenantId, {
        channel: index % 2 === 0 ? "EMAIL" : "SMS",
      });
    }

    const repository = new DrizzleNotificationDeliveryRepository();
    const [a, b] = await Promise.all([
      repository.claimBatch({
        workerId: "worker-a",
        batchSize: 10,
        leaseDurationMs: 30_000,
      }),
      repository.claimBatch({
        workerId: "worker-b",
        batchSize: 10,
        leaseDurationMs: 30_000,
      }),
    ]);

    expect(a.deliveries).toHaveLength(10);
    expect(b.deliveries).toHaveLength(10);

    const ids = [
      ...a.deliveries.map((delivery) => delivery.id),
      ...b.deliveries.map((delivery) => delivery.id),
    ];

    expect(new Set(ids).size).toBe(20);
    expect(
      a.deliveries.every((delivery) => delivery.lockedBy === "worker-a")
    ).toBe(true);
    expect(
      b.deliveries.every((delivery) => delivery.lockedBy === "worker-b")
    ).toBe(true);
  });

  it("3. an expired lease with remaining attempts is recovered and reclaimed", async () => {
    const tenantId = await createTenant("recover");
    const { deliveryId } = await createDelivery(tenantId);
    const repository = new DrizzleNotificationDeliveryRepository();
    const start = new Date("2030-01-01T10:00:00.000Z");

    const first = await repository.claimBatch({
      workerId: "worker-old",
      batchSize: 1,
      leaseDurationMs: 1_000,
      now: start,
    });
    expect(first.deliveries[0].id).toBe(deliveryId);

    const second = await repository.claimBatch({
      workerId: "worker-new",
      batchSize: 1,
      leaseDurationMs: 1_000,
      now: new Date(start.getTime() + 1_001),
    });

    expect(second.recoveredExpiredLeases).toBe(1);
    expect(second.deliveries).toHaveLength(1);
    expect(second.deliveries[0].id).toBe(deliveryId);
    expect(second.deliveries[0].lockedBy).toBe("worker-new");
    expect(second.deliveries[0].attempts).toBe(2);
  });

  it("4. stale lease owners cannot settle work after another worker reclaimed it", async () => {
    const tenantId = await createTenant("stale");
    const { deliveryId } = await createDelivery(tenantId);
    const repository = new DrizzleNotificationDeliveryRepository();
    const start = new Date("2030-01-01T10:00:00.000Z");

    await repository.claimBatch({
      workerId: "worker-old",
      batchSize: 1,
      leaseDurationMs: 1_000,
      now: start,
    });

    await repository.claimBatch({
      workerId: "worker-new",
      batchSize: 1,
      leaseDurationMs: 1_000,
      now: new Date(start.getTime() + 1_001),
    });

    const stale = await repository.markSent({
      id: deliveryId,
      workerId: "worker-old",
      provider: "FAKE",
      providerMessageId: "stale-message",
      sentAt: new Date(start.getTime() + 1_100),
    });
    expect(stale).toBe("LEASE_LOST");

    const owner = await repository.markSent({
      id: deliveryId,
      workerId: "worker-new",
      provider: "FAKE",
      providerMessageId: "accepted-message",
      sentAt: new Date(start.getTime() + 1_100),
    });
    expect(owner).toBe("SENT");

    const row = await getDelivery(deliveryId);
    expect(row.status).toBe("SENT");
    expect(row.providerMessageId).toBe("accepted-message");
  });

  it("5. transient failures schedule a due retry and sanitize persisted diagnostics", async () => {
    const tenantId = await createTenant("retry");
    const { deliveryId } = await createDelivery(tenantId);
    const repository = new DrizzleNotificationDeliveryRepository();
    const now = new Date("2030-01-01T10:00:00.000Z");
    const nextAttemptAt = new Date(now.getTime() + 10_000);

    await repository.claimBatch({
      workerId: "worker-retry",
      batchSize: 1,
      leaseDurationMs: 30_000,
      now,
    });

    const result = await repository.markFailed({
      id: deliveryId,
      workerId: "worker-retry",
      retryable: true,
      nextAttemptAt,
      now,
      error:
        "Bearer abcdefghijklmnopqrstuvwxyz password=hunter2 postgresql://user:supersecret@localhost/db",
    });

    expect(result).toBe("RETRY_SCHEDULED");

    const row = await getDelivery(deliveryId);
    expect(row.status).toBe("FAILED");
    expect(row.nextAttemptAt.getTime()).toBe(nextAttemptAt.getTime());
    expect(row.lastError).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(row.lastError).not.toContain("hunter2");
    expect(row.lastError).not.toContain("supersecret");

    const early = await repository.claimBatch({
      workerId: "worker-too-early",
      batchSize: 1,
      leaseDurationMs: 30_000,
      now: new Date(nextAttemptAt.getTime() - 1),
    });
    expect(early.deliveries).toHaveLength(0);

    const due = await repository.claimBatch({
      workerId: "worker-due",
      batchSize: 1,
      leaseDurationMs: 30_000,
      now: nextAttemptAt,
    });
    expect(due.deliveries).toHaveLength(1);
    expect(due.deliveries[0].id).toBe(deliveryId);
    expect(due.deliveries[0].attempts).toBe(2);
  });

  it("6. exhausting max attempts transitions the delivery to DEAD_LETTER", async () => {
    const tenantId = await createTenant("exhausted");
    const { deliveryId } = await createDelivery(tenantId, {
      maxAttempts: 1,
    });
    const repository = new DrizzleNotificationDeliveryRepository();
    const now = new Date("2030-01-01T10:00:00.000Z");

    const claim = await repository.claimBatch({
      workerId: "worker-final",
      batchSize: 1,
      leaseDurationMs: 30_000,
      now,
    });
    expect(claim.deliveries[0].attempts).toBe(1);

    const result = await repository.markFailed({
      id: deliveryId,
      workerId: "worker-final",
      retryable: true,
      nextAttemptAt: new Date(now.getTime() + 1_000),
      now,
      error: "temporary failure on final allowed attempt",
    });

    expect(result).toBe("DEAD_LETTER");
    const row = await getDelivery(deliveryId);
    expect(row.status).toBe("DEAD_LETTER");
    expect(row.failedAt).not.toBeNull();
  });

  it("7. non-retryable provider failures go directly to DEAD_LETTER", async () => {
    const tenantId = await createTenant("permanent");
    const { deliveryId } = await createDelivery(tenantId);
    const repository = new DrizzleNotificationDeliveryRepository();
    const now = new Date("2030-01-01T10:00:00.000Z");

    await repository.claimBatch({
      workerId: "worker-permanent",
      batchSize: 1,
      leaseDurationMs: 30_000,
      now,
    });

    const result = await repository.markFailed({
      id: deliveryId,
      workerId: "worker-permanent",
      retryable: false,
      nextAttemptAt: new Date(now.getTime() + 1_000),
      now,
      error: "INVALID_DESTINATION",
    });

    expect(result).toBe("DEAD_LETTER");
    expect((await getDelivery(deliveryId)).status).toBe("DEAD_LETTER");
  });

  it("8. SENT can be advanced to DELIVERED only by matching provider identity", async () => {
    const tenantId = await createTenant("delivered");
    const { deliveryId } = await createDelivery(tenantId);
    const repository = new DrizzleNotificationDeliveryRepository();
    const now = new Date("2030-01-01T10:00:00.000Z");

    await repository.claimBatch({
      workerId: "worker-sent",
      batchSize: 1,
      leaseDurationMs: 30_000,
      now,
    });

    await repository.markSent({
      id: deliveryId,
      workerId: "worker-sent",
      provider: "FAKE",
      providerMessageId: "provider-123",
      sentAt: now,
    });

    expect(
      await repository.markDelivered(deliveryId, "wrong-provider-id", now)
    ).toBe(false);
    expect(
      await repository.markDelivered(deliveryId, "provider-123", now)
    ).toBe(true);
    expect((await getDelivery(deliveryId)).status).toBe("DELIVERED");
  });

  it("9. fake provider is deterministic, idempotency-aware and never performs external I/O", async () => {
    const provider = new FakeNotificationProvider({
      name: "FAKE_EMAIL",
      channels: ["EMAIL"],
    });

    const message: NotificationProviderMessage = {
      deliveryId: randomUUID(),
      idempotencyKey: randomUUID(),
      channel: "EMAIL",
      destination: "recipient@example.test",
      templateKey: "appointment.created",
      templateVersion: 1,
      locale: "es-CO",
      timezone: "America/Bogota",
      data: {
        appointmentId: randomUUID(),
      },
      rendered: {
        subject: "Appointment created",
        text: "Appointment created",
        html: "<p>Appointment created</p>",
      },
    };

    const result = await provider.send(message);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBe("FAKE_EMAIL");
      expect(result.providerMessageId).toBe(
        `fake_${message.deliveryId}`
      );
    }
    expect(provider.sentMessages).toHaveLength(1);
    expect(provider.sentMessages[0].idempotencyKey).toBe(
      message.idempotencyKey
    );

    const unsupported = await provider.send({
      ...message,
      channel: "SMS",
    });
    expect(unsupported).toEqual({
      ok: false,
      retryable: false,
      error: "NOTIFICATION_CHANNEL_NOT_SUPPORTED",
      provider: "FAKE_EMAIL",
    });
    expect(provider.sentMessages).toHaveLength(1);
  });

  it("10. quiet-hour deferral refunds the claim attempt and schedules the next due time", async () => {
    const tenantId = await createTenant("defer");
    const { deliveryId } = await createDelivery(tenantId);
    const repository = new DrizzleNotificationDeliveryRepository();
    const now = new Date("2030-01-01T10:00:00.000Z");
    const nextAttemptAt = new Date(now.getTime() + 60_000);

    const claimed = await repository.claimBatch({
      workerId: "worker-defer",
      batchSize: 1,
      leaseDurationMs: 30_000,
      now,
    });
    expect(claimed.deliveries[0].attempts).toBe(1);

    const result = await repository.defer({
      id: deliveryId,
      workerId: "worker-defer",
      nextAttemptAt,
      reason: "QUIET_HOURS",
      now,
    });

    expect(result).toBe("DEFERRED");
    const row = await getDelivery(deliveryId);
    expect(row.status).toBe("PENDING");
    expect(row.attempts).toBe(0);
    expect(row.nextAttemptAt.getTime()).toBe(nextAttemptAt.getTime());
    expect(row.lockedBy).toBeNull();
    expect(row.lastError).toBe("QUIET_HOURS");
  });

  it("11. suppression is lease-owner guarded and persists only masked/hash destination metadata", async () => {
    const tenantId = await createTenant("suppress");
    const { deliveryId } = await createDelivery(tenantId);
    const repository = new DrizzleNotificationDeliveryRepository();
    const now = new Date("2030-01-01T10:00:00.000Z");

    await repository.claimBatch({
      workerId: "worker-suppress",
      batchSize: 1,
      leaseDurationMs: 30_000,
      now,
    });

    const stale = await repository.suppress({
      id: deliveryId,
      workerId: "wrong-worker",
      reason: "DESTINATION_SUPPRESSED",
      now,
    });
    expect(stale).toBe("LEASE_LOST");

    const result = await repository.suppress({
      id: deliveryId,
      workerId: "worker-suppress",
      reason: "DESTINATION_SUPPRESSED",
      destinationHash: "a".repeat(64),
      destinationMasked: "u***@example.test",
      now,
    });

    expect(result).toBe("SUPPRESSED");
    const row = await getDelivery(deliveryId);
    expect(row.status).toBe("SUPPRESSED");
    expect(row.destinationHash).toBe("a".repeat(64));
    expect(row.destinationMasked).toBe("u***@example.test");
    expect(row.lastError).toBe("DESTINATION_SUPPRESSED");
    expect(row.lockedBy).toBeNull();
  });
});
