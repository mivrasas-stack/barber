import { describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import type { Queue } from "bullmq";
import { FanoutOutboxTransport } from "@/infrastructure/outbox/fanout-outbox.transport";
import { BullMQOutboxTransport } from "@/infrastructure/redis/bullmq-outbox.transport";
import { parseOutboxPublishFrom } from "@/infrastructure/outbox/server";
import type {
  OutboxTransport,
  OutboxTransportResult,
} from "@/infrastructure/outbox/outbox-transport.interface";
import type { OutboxEnvelope } from "@/infrastructure/outbox/types";

function envelope(): OutboxEnvelope {
  return {
    eventId: randomUUID(),
    eventType: "appointment.created",
    eventVersion: 1,
    tenantId: randomUUID(),
    locationId: randomUUID(),
    aggregateId: randomUUID(),
    occurredAt: new Date().toISOString(),
    payload: {
      appointmentId: randomUUID(),
      status: "PENDING",
    },
    deliveryAttempt: 1,
  };
}

class RecordingTransport implements OutboxTransport {
  readonly received: OutboxEnvelope[] = [];
  readonly signals: Array<AbortSignal | undefined> = [];

  constructor(
    private readonly result: OutboxTransportResult = { ok: true },
    private readonly thrownError?: unknown
  ) {}

  async publish(
    value: OutboxEnvelope,
    signal?: AbortSignal
  ): Promise<OutboxTransportResult> {
    this.received.push(value);
    this.signals.push(signal);

    if (this.thrownError !== undefined) {
      throw this.thrownError;
    }

    return this.result;
  }
}

describe("Stage 4.3B Outbox Fanout Transport", () => {
  it("publishes the exact same immutable envelope to every target", async () => {
    const realtime = new RecordingTransport();
    const notifications = new RecordingTransport();
    const transport = new FanoutOutboxTransport([
      { name: "realtime", transport: realtime },
      { name: "notifications", transport: notifications },
    ]);
    const event = envelope();
    const controller = new AbortController();

    const result = await transport.publish(event, controller.signal);

    expect(result).toEqual({ ok: true });
    expect(realtime.received).toEqual([event]);
    expect(notifications.received).toEqual([event]);
    expect(realtime.signals[0]).toBe(controller.signal);
    expect(notifications.signals[0]).toBe(controller.signal);
  });

  it("returns retryable failure when one target has a transient failure", async () => {
    const realtime = new RecordingTransport({ ok: true });
    const notifications = new RecordingTransport({
      ok: false,
      retryable: true,
      error: "temporary redis timeout",
    });
    const transport = new FanoutOutboxTransport([
      { name: "realtime", transport: realtime },
      { name: "notifications", transport: notifications },
    ]);

    const result = await transport.publish(envelope());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryable).toBe(true);
      expect(result.error).toContain("notifications");
      expect(result.error).toContain("temporary redis timeout");
    }
    expect(realtime.received).toHaveLength(1);
    expect(notifications.received).toHaveLength(1);
  });

  it("honors a non-retryable target failure instead of retrying the whole fanout forever", async () => {
    const realtime = new RecordingTransport({ ok: true });
    const notifications = new RecordingTransport({
      ok: false,
      retryable: false,
      error: "invalid notification envelope",
    });
    const transport = new FanoutOutboxTransport([
      { name: "realtime", transport: realtime },
      { name: "notifications", transport: notifications },
    ]);

    const result = await transport.publish(envelope());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryable).toBe(false);
      expect(result.error).toContain("invalid notification envelope");
    }
  });

  it("sanitizes target exceptions before returning aggregated diagnostics", async () => {
    const secret =
      "Bearer abcdefghijklmnopqrstuvwxyz password=hunter2 postgresql://user:supersecret@localhost:5432/db";
    const realtime = new RecordingTransport({ ok: true });
    const notifications = new RecordingTransport(
      { ok: true },
      new Error(secret)
    );
    const transport = new FanoutOutboxTransport([
      { name: "realtime", transport: realtime },
      { name: "notifications", transport: notifications },
    ]);

    const result = await transport.publish(envelope());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryable).toBe(true);
      expect(result.error).not.toContain("abcdefghijklmnopqrstuvwxyz");
      expect(result.error).not.toContain("hunter2");
      expect(result.error).not.toContain("supersecret");
      expect(result.error).toContain("notifications");
    }
  });

  it("rejects empty fanout configuration and duplicate target names", () => {
    expect(() => new FanoutOutboxTransport([])).toThrow(
      "OUTBOX_FANOUT_TARGET_REQUIRED"
    );

    expect(
      () =>
        new FanoutOutboxTransport([
          { name: "notifications", transport: new RecordingTransport() },
          { name: "notifications", transport: new RecordingTransport() },
        ])
    ).toThrow("OUTBOX_FANOUT_DUPLICATE_TARGET:notifications");
  });

  it("preserves Stage 4.1 attempts=1 by default while allowing bounded consumer retries", async () => {
    const calls: Array<{
      name: string;
      data: OutboxEnvelope;
      options: Record<string, unknown>;
    }> = [];

    const fakeQueue = {
      async add(
        name: string,
        data: OutboxEnvelope,
        options: Record<string, unknown>
      ) {
        calls.push({ name, data, options });
        return {};
      },
    } as unknown as Queue;

    const defaultTransport = new BullMQOutboxTransport({
      queue: fakeQueue,
    });
    await defaultTransport.publish(envelope());

    expect(calls[0].options.attempts).toBe(1);
    expect(calls[0].options.backoff).toBeUndefined();

    const retryingTransport = new BullMQOutboxTransport({
      queue: fakeQueue,
      processing: {
        attempts: 8,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    });
    await retryingTransport.publish(envelope());

    expect(calls[1].options.attempts).toBe(8);
    expect(calls[1].options.backoff).toEqual({
      type: "exponential",
      delay: 1000,
    });

    expect(
      () =>
        new BullMQOutboxTransport({
          queue: fakeQueue,
          processing: { attempts: 0 },
        })
    ).toThrow("OUTBOX_QUEUE_PROCESSING_ATTEMPTS_INVALID");
  });

  it("requires an explicit valid outbox cutover timestamp", () => {
    expect(() => parseOutboxPublishFrom(undefined)).toThrow(
      "OUTBOX_PUBLISH_FROM_REQUIRED"
    );
    expect(() => parseOutboxPublishFrom("not-a-date")).toThrow(
      "OUTBOX_PUBLISH_FROM_INVALID"
    );

    const value = "2026-10-08T00:00:00.000Z";
    expect(parseOutboxPublishFrom(value).toISOString()).toBe(value);
  });
});
