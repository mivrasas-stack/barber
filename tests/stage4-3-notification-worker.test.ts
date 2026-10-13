import { describe, expect, it, vi } from "vitest";
import type {
  NotificationChannelProvider,
  NotificationProviderMessage,
  NotificationProviderResult,
} from "@/modules/notifications/domain/notification-channel-provider.interface";
import type {
  ClaimedNotificationDelivery,
  NotificationDeliveryRepository,
} from "@/modules/notifications/domain/notification-delivery-repository.interface";
import type { NotificationTemplateRenderer } from "@/modules/notifications/domain/notification-template-renderer.interface";
import type { NotificationDeliveryPreparer } from "@/modules/notifications/application/notification-delivery-worker";
import {
  NotificationDeliveryWorker,
  type NotificationDeliveryWorkerLogger,
} from "@/modules/notifications/application/notification-delivery-worker";
import { FakeNotificationProvider } from "@/modules/notifications/infrastructure/fake-notification.provider";
import { FakeNotificationTemplateRenderer } from "@/modules/notifications/infrastructure/fake-notification-template.renderer";

function makeDelivery(
  overrides: Partial<ClaimedNotificationDelivery> = {}
): ClaimedNotificationDelivery {
  const now = new Date("2030-01-01T10:00:00.000Z");
  return {
    id: "11111111-1111-4111-8111-111111111111",
    notificationIntentId: "22222222-2222-4222-8222-222222222222",
    sourceEventId: "33333333-3333-4333-8333-333333333333",
    sourceEventType: "appointment.created",
    tenantId: "44444444-4444-4444-8444-444444444444",
    locationId: null,
    recipientUserId: "55555555-5555-4555-8555-555555555555",
    recipientKind: "USER",
    recipientReference: null,
    category: "APPOINTMENT",
    policyKey: "appointment.created.transactional",
    templateKey: "appointment.created",
    templateVersion: 1,
    locale: "es-CO",
    timezone: "America/Bogota",
    payload: { appointmentId: "appt-123", status: "PENDING" },
    mandatory: true,
    channel: "EMAIL",
    status: "PROCESSING",
    destinationHash: null,
    destinationMasked: null,
    provider: null,
    providerMessageId: null,
    attempts: 1,
    maxAttempts: 8,
    nextAttemptAt: now,
    lockedAt: now,
    lockedBy: "worker-test",
    lockExpiresAt: new Date(now.getTime() + 30_000),
    sentAt: null,
    deliveredAt: null,
    failedAt: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRepository(
  overrides: Partial<NotificationDeliveryRepository> = {}
): NotificationDeliveryRepository {
  return {
    claimBatch: vi.fn().mockResolvedValue({
      deliveries: [],
      recoveredExpiredLeases: 0,
      deadLetteredExpiredLeases: 0,
    }),
    renewLease: vi.fn().mockResolvedValue(true),
    markSent: vi.fn().mockResolvedValue("SENT"),
    markFailed: vi.fn().mockResolvedValue("RETRY_SCHEDULED"),
    suppress: vi.fn().mockResolvedValue("SUPPRESSED"),
    defer: vi.fn().mockResolvedValue("DEFERRED"),
    markDelivered: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function readyPreparer(
  destination = "recipient@example.test"
): NotificationDeliveryPreparer {
  return {
    execute: vi.fn().mockResolvedValue({
      status: "READY",
      destination: {
        destination,
        destinationHash: "a".repeat(64),
        destinationMasked: "r***@example.test",
        source: "USER",
      },
    }),
  };
}

function makeWorker(input: {
  repository?: NotificationDeliveryRepository;
  preparer?: NotificationDeliveryPreparer;
  renderer?: NotificationTemplateRenderer;
  providers?: NotificationChannelProvider[];
  logger?: NotificationDeliveryWorkerLogger;
  sendTimeoutMs?: number;
  pollIntervalMs?: number;
  clock?: () => Date;
}) {
  return new NotificationDeliveryWorker(
    input.repository ?? makeRepository(),
    input.preparer ?? readyPreparer(),
    input.renderer ?? new FakeNotificationTemplateRenderer(),
    input.providers ?? [
      new FakeNotificationProvider({
        name: "FAKE_EMAIL",
        channels: ["EMAIL"],
      }),
    ],
    {
      workerId: "worker-test",
      channels: ["EMAIL"],
      leaseDurationMs: 30_000,
      sendTimeoutMs: input.sendTimeoutMs ?? 100,
      pollIntervalMs: input.pollIntervalMs ?? 10,
      baseBackoffMs: 1_000,
      maxBackoffMs: 60_000,
      random: () => 0.5,
      clock: input.clock ?? (() => new Date("2030-01-01T10:00:00.000Z")),
      logger: input.logger,
    }
  );
}

describe("Stage 4.3C-A Notification External Delivery Worker", () => {
  it("1. successful EMAIL delivery renders, sends and settles SENT", async () => {
    const repository = makeRepository();
    const provider = new FakeNotificationProvider({
      name: "FAKE_EMAIL",
      channels: ["EMAIL"],
    });
    const worker = makeWorker({ repository, providers: [provider] });

    const result = await worker.processClaimed(makeDelivery());

    expect(result.result).toBe("SENT");
    expect(repository.renewLease).toHaveBeenCalledTimes(1);
    expect(repository.markSent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: makeDelivery().id,
        workerId: "worker-test",
        provider: "FAKE_EMAIL",
        destinationHash: "a".repeat(64),
        destinationMasked: "r***@example.test",
      })
    );
    expect(provider.sentMessages).toHaveLength(1);
    expect(provider.sentMessages[0].rendered.text).toContain(
      "appointment.created"
    );
  });

  it("2. preference/policy suppression never invokes provider", async () => {
    const repository = makeRepository();
    const provider = new FakeNotificationProvider({
      name: "FAKE_EMAIL",
      channels: ["EMAIL"],
    });
    const preparer: NotificationDeliveryPreparer = {
      execute: vi.fn().mockResolvedValue({
        status: "SUPPRESSED",
        reason: "PREFERENCE_DISABLED",
      }),
    };
    const worker = makeWorker({ repository, preparer, providers: [provider] });

    const result = await worker.processClaimed(makeDelivery());

    expect(result.result).toBe("SUPPRESSED");
    expect(repository.suppress).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "PREFERENCE_DISABLED" })
    );
    expect(repository.renewLease).not.toHaveBeenCalled();
    expect(provider.sentMessages).toHaveLength(0);
  });

  it("3. quiet hours defer without invoking provider", async () => {
    const repository = makeRepository();
    const nextAttemptAt = new Date("2030-01-01T13:00:00.000Z");
    const preparer: NotificationDeliveryPreparer = {
      execute: vi.fn().mockResolvedValue({
        status: "DEFERRED",
        reason: "QUIET_HOURS",
        nextAttemptAt,
      }),
    };
    const worker = makeWorker({ repository, preparer });

    const result = await worker.processClaimed(makeDelivery());

    expect(result.result).toBe("DEFERRED");
    expect(repository.defer).toHaveBeenCalledWith(
      expect.objectContaining({ nextAttemptAt, reason: "QUIET_HOURS" })
    );
    expect(repository.renewLease).not.toHaveBeenCalled();
  });

  it("4. transient provider failure schedules deterministic retry", async () => {
    const repository = makeRepository();
    const provider = new FakeNotificationProvider({
      name: "FAKE_EMAIL",
      channels: ["EMAIL"],
      result: {
        ok: false,
        retryable: true,
        error: "ECONNREFUSED provider network",
        provider: "FAKE_EMAIL",
      },
    });
    const worker = makeWorker({ repository, providers: [provider] });

    const result = await worker.processClaimed(makeDelivery({ attempts: 2 }));

    expect(result.result).toBe("RETRY_SCHEDULED");
    expect(result.errorCategory).toBe("NETWORK");
    expect(repository.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        retryable: true,
        nextAttemptAt: new Date("2030-01-01T10:00:02.000Z"),
      })
    );
  });

  it("5. non-retryable provider failure dead-letters", async () => {
    const repository = makeRepository({
      markFailed: vi.fn().mockResolvedValue("DEAD_LETTER"),
    });
    const provider = new FakeNotificationProvider({
      name: "FAKE_EMAIL",
      channels: ["EMAIL"],
      result: {
        ok: false,
        retryable: false,
        error: "INVALID_DESTINATION",
        provider: "FAKE_EMAIL",
      },
    });
    const worker = makeWorker({ repository, providers: [provider] });

    const result = await worker.processClaimed(makeDelivery());

    expect(result.result).toBe("DEAD_LETTER");
    expect(repository.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({ retryable: false })
    );
  });

  it("6. non-cooperative provider is bounded by hard timeout", async () => {
    const repository = makeRepository();
    const provider: NotificationChannelProvider = {
      name: "HANGING",
      channels: ["EMAIL"],
      supports: (channel) => channel === "EMAIL",
      send: () => new Promise<NotificationProviderResult>(() => {}),
    };
    const worker = makeWorker({
      repository,
      providers: [provider],
      sendTimeoutMs: 25,
    });

    const startedAt = Date.now();
    const result = await worker.processClaimed(makeDelivery());
    const elapsed = Date.now() - startedAt;

    expect(elapsed).toBeLessThan(500);
    expect(result.result).toBe("RETRY_SCHEDULED");
    expect(result.errorCategory).toBe("TIMEOUT");
    expect(repository.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        retryable: true,
        error: "NOTIFICATION_PROVIDER_TIMEOUT",
      })
    );
  });

  it("7. late rejection after timeout does not become unhandled rejection", async () => {
    const repository = makeRepository();
    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", listener);

    try {
      const provider: NotificationChannelProvider = {
        name: "LATE_REJECT",
        channels: ["EMAIL"],
        supports: (channel) => channel === "EMAIL",
        send: () =>
          new Promise<NotificationProviderResult>((_, reject) => {
            setTimeout(() => reject(new Error("late provider rejection")), 60);
          }),
      };
      const worker = makeWorker({
        repository,
        providers: [provider],
        sendTimeoutMs: 10,
      });

      await worker.processClaimed(makeDelivery());
      await new Promise((resolve) => setTimeout(resolve, 90));

      expect(unhandled).toEqual([]);
    } finally {
      process.removeListener("unhandledRejection", listener);
    }
  });

  it("8. parent AbortSignal settles claimed delivery as retryable ABORTED", async () => {
    const repository = makeRepository();
    const provider: NotificationChannelProvider = {
      name: "ABORT_WAIT",
      channels: ["EMAIL"],
      supports: (channel) => channel === "EMAIL",
      send: () => new Promise<NotificationProviderResult>(() => {}),
    };
    const worker = makeWorker({
      repository,
      providers: [provider],
      sendTimeoutMs: 1_000,
    });
    const controller = new AbortController();

    const pending = worker.processClaimed(makeDelivery(), controller.signal);
    setTimeout(() => controller.abort(), 10);
    const result = await pending;

    expect(result.result).toBe("RETRY_SCHEDULED");
    expect(result.errorCategory).toBe("ABORTED");
  });

  it("9. stale worker loses lease before provider I/O", async () => {
    const repository = makeRepository({
      renewLease: vi.fn().mockResolvedValue(false),
    });
    const provider = new FakeNotificationProvider({
      name: "FAKE_EMAIL",
      channels: ["EMAIL"],
    });
    const worker = makeWorker({ repository, providers: [provider] });

    const result = await worker.processClaimed(makeDelivery());

    expect(result.result).toBe("LEASE_LOST");
    expect(repository.markSent).not.toHaveBeenCalled();
    expect(repository.markFailed).not.toHaveBeenCalled();
    expect(provider.sentMessages).toHaveLength(0);
  });

  it("10. ambiguous providers for the same channel fail fast", () => {
    const one = new FakeNotificationProvider({
      name: "EMAIL_ONE",
      channels: ["EMAIL"],
    });
    const two = new FakeNotificationProvider({
      name: "EMAIL_TWO",
      channels: ["EMAIL"],
    });

    expect(() =>
      makeWorker({ providers: [one, two] })
    ).toThrow("NOTIFICATION_PROVIDER_AMBIGUOUS:EMAIL");
  });

  it("11. deterministic renderer failure is non-retryable", async () => {
    const repository = makeRepository({
      markFailed: vi.fn().mockResolvedValue("DEAD_LETTER"),
    });
    const renderer: NotificationTemplateRenderer = {
      render: vi.fn().mockRejectedValue(new Error("INVALID_TEMPLATE_VERSION")),
    };
    const worker = makeWorker({ repository, renderer });

    const result = await worker.processClaimed(makeDelivery());

    expect(result.result).toBe("DEAD_LETTER");
    expect(result.errorCategory).toBe("TEMPLATE_ERROR");
    expect(repository.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({ retryable: false })
    );
  });

  it("12. logs and persisted errors redact destination and bearer secret", async () => {
    const repository = makeRepository();
    const records: Array<{ message: string; fields?: Record<string, unknown> }> = [];
    const logger: NotificationDeliveryWorkerLogger = {
      info: (message, fields) => records.push({ message, fields }),
      warn: (message, fields) => records.push({ message, fields }),
      error: (message, fields) => records.push({ message, fields }),
    };
    const destination = "private.person@example.test";
    const provider = new FakeNotificationProvider({
      name: "FAKE_EMAIL",
      channels: ["EMAIL"],
      result: {
        ok: false,
        retryable: true,
        error: `delivery to ${destination} failed Authorization: Bearer super-secret-token`,
        provider: "FAKE_EMAIL",
      },
    });
    const worker = makeWorker({
      repository,
      preparer: readyPreparer(destination),
      providers: [provider],
      logger,
    });

    await worker.processClaimed(makeDelivery());

    const serializedLogs = JSON.stringify(records);
    expect(serializedLogs).not.toContain(destination);
    expect(serializedLogs).not.toContain("super-secret-token");
    expect(serializedLogs).not.toContain("appointmentId");

    const markFailed = vi.mocked(repository.markFailed);
    const persisted = markFailed.mock.calls[0][0].error;
    expect(persisted).not.toContain(destination);
    expect(persisted).not.toContain("super-secret-token");
  });

  it("13. worker loop stops promptly on AbortSignal while idle", async () => {
    const repository = makeRepository();
    const worker = makeWorker({
      repository,
      pollIntervalMs: 5_000,
    });
    const controller = new AbortController();

    const startedAt = Date.now();
    const running = worker.run(controller.signal);
    setTimeout(() => controller.abort(), 15);
    await running;

    expect(Date.now() - startedAt).toBeLessThan(500);
    expect(repository.claimBatch).toHaveBeenCalled();
  });

  it("14. runBatch aggregates settlements for operational telemetry", async () => {
    const sent = makeDelivery({ id: "delivery-sent" });
    const repository = makeRepository({
      claimBatch: vi.fn().mockResolvedValue({
        deliveries: [sent],
        recoveredExpiredLeases: 2,
        deadLetteredExpiredLeases: 1,
      }),
    });
    const worker = makeWorker({ repository });

    const result = await worker.runBatch();

    expect(result).toEqual(
      expect.objectContaining({
        claimed: 1,
        sent: 1,
        recoveredExpiredLeases: 2,
        deadLetteredExpiredLeases: 1,
      })
    );
  });

  it("15. provider receives stable delivery id as idempotency key", async () => {
    const provider = new FakeNotificationProvider({
      name: "FAKE_EMAIL",
      channels: ["EMAIL"],
    });
    const delivery = makeDelivery({ id: "stable-delivery-id" });
    const worker = makeWorker({ providers: [provider] });

    await worker.processClaimed(delivery);

    expect(provider.sentMessages[0]).toEqual(
      expect.objectContaining({
        deliveryId: "stable-delivery-id",
        idempotencyKey: "stable-delivery-id",
      })
    );
  });
});
