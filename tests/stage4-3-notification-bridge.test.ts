import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import type Redis from "ioredis";
import { BullMQOutboxTransport } from "@/infrastructure/redis/bullmq-outbox.transport";
import {
  closeRedisConnections,
  getRedisWorkerClient,
} from "@/infrastructure/redis/redis-connection-factory";
import { env } from "@/shared/config/env";
import {
  OutboxNotificationBridge,
  type NotificationEventProcessor,
} from "@/modules/notifications/infrastructure/outbox-notification-bridge";
import { SilentNotificationLogger } from "@/modules/notifications/infrastructure/notification-logger";
import type { ProcessNotificationEventResult } from "@/modules/notifications/application/process-notification-event.usecase";
import type { OutboxEnvelope } from "@/infrastructure/outbox/types";

function makeEnvelope(eventType = "appointment.created"): OutboxEnvelope {
  return {
    eventId: randomUUID(),
    eventType,
    eventVersion: 1,
    tenantId: randomUUID(),
    locationId: randomUUID(),
    aggregateId: randomUUID(),
    occurredAt: new Date().toISOString(),
    payload: {
      status: "PENDING",
    },
    deliveryAttempt: 1,
  };
}

function processed(eventId: string): ProcessNotificationEventResult {
  return {
    status: "PROCESSED",
    eventId,
    intentsCreated: 1,
    duplicatesSkipped: 0,
    deliveriesCreated: 2,
    inboxItemsCreated: 1,
  };
}

async function waitForJobState(
  transport: BullMQOutboxTransport,
  eventId: string,
  expected: "completed" | "failed",
  timeoutMs = 8000
) {
  const queue = transport.getQueue();
  const jobId = BullMQOutboxTransport.formatJobId(eventId);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await queue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      if (state === expected) {
        return job;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  const job = await queue.getJob(jobId);
  const state = job ? await job.getState() : "missing";
  throw new Error(
    `Timed out waiting for job ${jobId} to become ${expected}; current=${state}`
  );
}

describe("Stage 4.3B Notification Queue Bridge", () => {
  let workerClient: Redis;

  beforeAll(() => {
    workerClient = getRedisWorkerClient();
  });

  afterAll(async () => {
    await closeRedisConnections();
  });

  it("uses a dedicated notification queue distinct from realtime", () => {
    const processor: NotificationEventProcessor = {
      async execute(envelope) {
        return processed(envelope.eventId);
      },
    };
    const bridge = new OutboxNotificationBridge({
      processor,
      logger: new SilentNotificationLogger(),
    });

    expect(bridge.queueName).toBe(env.REDIS_NOTIFICATION_QUEUE_NAME);
    expect(bridge.queueName).not.toBe(env.REDIS_REALTIME_QUEUE_NAME);
  });

  it("processEnvelope forwards a valid immutable event to the notification processor", async () => {
    const received: OutboxEnvelope[] = [];
    const processor: NotificationEventProcessor = {
      async execute(envelope) {
        received.push(envelope);
        return processed(envelope.eventId);
      },
    };
    const bridge = new OutboxNotificationBridge({
      processor,
      logger: new SilentNotificationLogger(),
    });
    const event = makeEnvelope();

    const result = await bridge.processEnvelope(event);

    expect(received).toEqual([event]);
    expect(result.status).toBe("PROCESSED");
    expect(result.eventId).toBe(event.eventId);
  });

  it("invalid envelopes fail permanently instead of consuming the retry budget", async () => {
    const processor: NotificationEventProcessor = {
      async execute(envelope) {
        return processed(envelope.eventId);
      },
    };
    const bridge = new OutboxNotificationBridge({
      processor,
      logger: new SilentNotificationLogger(),
    });

    await expect(
      bridge.processEnvelope({
        eventId: "",
        eventType: "",
      } as OutboxEnvelope)
    ).rejects.toThrow("NOTIFICATION_ENVELOPE_INVALID");
  });

  it("BullMQ retries transient notification processing failures and eventually completes", async () => {
    const queueName = `test-notification-retry-${randomUUID()}`;
    const prefix = "bp:test:notification";
    let calls = 0;

    const processor: NotificationEventProcessor = {
      async execute(envelope) {
        calls += 1;
        if (calls < 3) {
          throw new Error("temporary database connection timeout");
        }
        return processed(envelope.eventId);
      },
    };

    const transport = new BullMQOutboxTransport({
      queueName,
      prefix,
      connection: workerClient,
      processing: {
        attempts: 3,
        backoff: {
          type: "fixed",
          delay: 25,
        },
      },
      retention: {
        completedAgeSec: 60,
        completedCount: 100,
        failedAgeSec: 60,
        failedCount: 100,
      },
    });

    const bridge = new OutboxNotificationBridge({
      queueName,
      prefix,
      workerConnection: workerClient,
      processor,
      logger: new SilentNotificationLogger(),
      concurrency: 1,
      autoStart: true,
    });

    const event = makeEnvelope("subscription.invoice.generated.v1");
    const publish = await transport.publish(event);
    expect(publish.ok).toBe(true);

    const job = await waitForJobState(transport, event.eventId, "completed");

    expect(calls).toBe(3);
    expect(job.attemptsMade).toBe(3);

    await bridge.close();
    await transport.getQueue().obliterate({ force: true });
    await transport.close();
  }, 15_000);

  it("sanitizes processor exceptions before BullMQ persists the failed reason", async () => {
    const queueName = `test-notification-secret-${randomUUID()}`;
    const prefix = "bp:test:notification";
    const rawSecret =
      "Bearer abcdefghijklmnopqrstuvwxyz password=hunter2 postgresql://user:supersecret@localhost:5432/db";

    const processor: NotificationEventProcessor = {
      async execute() {
        throw new Error(rawSecret);
      },
    };

    const transport = new BullMQOutboxTransport({
      queueName,
      prefix,
      connection: workerClient,
      processing: {
        attempts: 1,
      },
      retention: {
        completedAgeSec: 60,
        completedCount: 100,
        failedAgeSec: 60,
        failedCount: 100,
      },
    });

    const bridge = new OutboxNotificationBridge({
      queueName,
      prefix,
      workerConnection: workerClient,
      processor,
      logger: new SilentNotificationLogger(),
      concurrency: 1,
      autoStart: true,
    });

    const event = makeEnvelope();
    const publish = await transport.publish(event);
    expect(publish.ok).toBe(true);

    const job = await waitForJobState(transport, event.eventId, "failed");
    const failedReason = job.failedReason ?? "";

    expect(failedReason).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(failedReason).not.toContain("hunter2");
    expect(failedReason).not.toContain("supersecret");

    await bridge.close();
    await transport.getQueue().obliterate({ force: true });
    await transport.close();
  }, 15_000);
});
