import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { PrepareNotificationDeliveryUseCase } from "@/modules/notifications/application/prepare-notification-delivery.usecase";
import { evaluateQuietHours } from "@/modules/notifications/application/quiet-hours";
import type {
  ClaimedNotificationDelivery,
} from "@/modules/notifications/domain/notification-delivery-repository.interface";
import type {
  NotificationDestinationResolver,
  ResolvedNotificationDestination,
} from "@/modules/notifications/domain/notification-destination-resolver.interface";
import type {
  CreateNotificationIntentInput,
  CreateNotificationIntentResult,
  NotificationPreferenceSnapshot,
  NotificationRepository,
} from "@/modules/notifications/domain/notification-repository.interface";
import type {
  NotificationSuppressionInput,
  NotificationSuppressionRepository,
} from "@/modules/notifications/domain/notification-suppression-repository.interface";
import { DrizzleNotificationSuppressionRepository } from "@/modules/notifications/infrastructure/drizzle-notification-suppression.repository";
import { FakeNotificationTemplateRenderer } from "@/modules/notifications/infrastructure/fake-notification-template.renderer";

class FakeNotificationRepository implements NotificationRepository {
  constructor(
    private readonly preference: NotificationPreferenceSnapshot | null
  ) {}

  async findPreference(): Promise<NotificationPreferenceSnapshot | null> {
    return this.preference;
  }

  async createIntentWithDeliveries(
    _input: CreateNotificationIntentInput
  ): Promise<CreateNotificationIntentResult> {
    throw new Error("NOT_USED_IN_PREPARATION_TEST");
  }
}

class FakeDestinationResolver implements NotificationDestinationResolver {
  calls = 0;

  constructor(
    private readonly value: ResolvedNotificationDestination | null
  ) {}

  async resolve(): Promise<ResolvedNotificationDestination | null> {
    this.calls += 1;
    return this.value;
  }
}

class FakeSuppressionRepository
  implements NotificationSuppressionRepository
{
  constructor(private readonly suppressed = false) {}

  async isSuppressed(): Promise<boolean> {
    return this.suppressed;
  }

  async suppress(_input: NotificationSuppressionInput): Promise<void> {}

  async remove(): Promise<boolean> {
    return true;
  }
}

const DEFAULT_PREFERENCE: NotificationPreferenceSnapshot = {
  inAppEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  quietHoursEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  timezone: null,
  locale: null,
};

function delivery(
  options: Partial<ClaimedNotificationDelivery> = {}
): ClaimedNotificationDelivery {
  const now = new Date("2030-01-01T10:00:00.000Z");
  return {
    id: randomUUID(),
    notificationIntentId: randomUUID(),
    sourceEventId: randomUUID(),
    sourceEventType: "appointment.created",
    tenantId: randomUUID(),
    locationId: randomUUID(),
    recipientUserId: randomUUID(),
    recipientKind: "USER",
    recipientReference: `appointment:${randomUUID()}`,
    category: "APPOINTMENT",
    policyKey: "appointment.created.transactional",
    templateKey: "appointment.created",
    templateVersion: 1,
    locale: "es-CO",
    timezone: "America/Bogota",
    payload: {
      appointmentId: randomUUID(),
    },
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
    lockedBy: "worker-preparation",
    lockExpiresAt: new Date(now.getTime() + 30_000),
    sentAt: null,
    deliveredAt: null,
    failedAt: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
    ...options,
  };
}

function resolvedDestination(): ResolvedNotificationDestination {
  return {
    destination: "customer@example.test",
    destinationHash: "a".repeat(64),
    destinationMasked: "c***@example.test",
    source: "USER",
  };
}

describe("Stage 4.3C2-B Notification Delivery Preparation", () => {
  const suppressionCleanup: Array<{
    channel: "EMAIL" | "SMS" | "WHATSAPP";
    hash: string;
  }> = [];

  afterEach(async () => {
    const repository = new DrizzleNotificationSuppressionRepository();
    for (const entry of suppressionCleanup) {
      await repository.remove(entry.channel, entry.hash);
    }
    suppressionCleanup.length = 0;
  });

  it("1. overnight quiet hours in America/Bogota defer until the next local end time", () => {
    const result = evaluateQuietHours({
      enabled: true,
      start: "22:00",
      end: "07:00",
      timezone: "America/Bogota",
      now: new Date("2026-10-09T04:30:00.000Z"),
    });

    expect(result.deferred).toBe(true);
    if (result.deferred) {
      expect(result.nextAllowedAt.toISOString()).toBe(
        "2026-10-09T12:00:00.000Z"
      );
    }
  });

  it("2. quiet hours remain timezone-correct across the New York DST fallback", () => {
    const result = evaluateQuietHours({
      enabled: true,
      start: "22:00",
      end: "08:00",
      timezone: "America/New_York",
      now: new Date("2026-11-01T06:30:00.000Z"),
    });

    expect(result.deferred).toBe(true);
    if (result.deferred) {
      expect(result.nextAllowedAt.toISOString()).toBe(
        "2026-11-01T13:00:00.000Z"
      );
    }
  });

  it("3. bypass and invalid quiet-hour configuration never permanently block transactional delivery", () => {
    expect(
      evaluateQuietHours({
        enabled: true,
        start: "22:00",
        end: "07:00",
        timezone: "America/Bogota",
        now: new Date("2026-10-09T04:30:00.000Z"),
        bypass: true,
      })
    ).toEqual({ deferred: false });

    expect(
      evaluateQuietHours({
        enabled: true,
        start: "invalid",
        end: "07:00",
        timezone: "Invalid/Timezone",
        now: new Date("2026-10-09T04:30:00.000Z"),
      })
    ).toEqual({ deferred: false });
  });

  it("4. optional SMS is suppressed when the latest preference disables it without resolving raw PII", async () => {
    const destination = new FakeDestinationResolver(
      resolvedDestination()
    );
    const useCase = new PrepareNotificationDeliveryUseCase(
      new FakeNotificationRepository(DEFAULT_PREFERENCE),
      destination,
      new FakeSuppressionRepository(false)
    );

    const result = await useCase.execute(
      delivery({
        channel: "SMS",
      })
    );

    expect(result).toEqual({
      status: "SUPPRESSED",
      reason: "PREFERENCE_DISABLED",
    });
    expect(destination.calls).toBe(0);
  });

  it("5. mandatory email ignores channel opt-out but defers during configured quiet hours", async () => {
    const preference: NotificationPreferenceSnapshot = {
      ...DEFAULT_PREFERENCE,
      emailEnabled: false,
      quietHoursEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      timezone: "America/Bogota",
    };
    const destination = new FakeDestinationResolver(
      resolvedDestination()
    );
    const useCase = new PrepareNotificationDeliveryUseCase(
      new FakeNotificationRepository(preference),
      destination,
      new FakeSuppressionRepository(false)
    );

    const result = await useCase.execute(
      delivery(),
      new Date("2026-10-09T04:30:00.000Z")
    );

    expect(result.status).toBe("DEFERRED");
    if (result.status === "DEFERRED") {
      expect(result.nextAttemptAt.toISOString()).toBe(
        "2026-10-09T12:00:00.000Z"
      );
    }
    expect(destination.calls).toBe(0);
  });

  it("6. cancellation policy bypasses quiet hours but still respects durable destination suppression", async () => {
    const preference: NotificationPreferenceSnapshot = {
      ...DEFAULT_PREFERENCE,
      quietHoursEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      timezone: "America/Bogota",
    };
    const destination = new FakeDestinationResolver(
      resolvedDestination()
    );
    const useCase = new PrepareNotificationDeliveryUseCase(
      new FakeNotificationRepository(preference),
      destination,
      new FakeSuppressionRepository(true)
    );

    const result = await useCase.execute(
      delivery({
        sourceEventType: "appointment.cancelled",
        policyKey: "appointment.cancelled.transactional",
        templateKey: "appointment.cancelled",
      }),
      new Date("2026-10-09T04:30:00.000Z")
    );

    expect(result.status).toBe("SUPPRESSED");
    if (result.status === "SUPPRESSED") {
      expect(result.reason).toBe("DESTINATION_SUPPRESSED");
      expect(result.destination?.destinationMasked).toBe(
        "c***@example.test"
      );
    }
    expect(destination.calls).toBe(1);
  });

  it("7. unavailable destinations are terminally suppressed before a provider can run", async () => {
    const useCase = new PrepareNotificationDeliveryUseCase(
      new FakeNotificationRepository(DEFAULT_PREFERENCE),
      new FakeDestinationResolver(null),
      new FakeSuppressionRepository(false)
    );

    const result = await useCase.execute(delivery());

    expect(result).toEqual({
      status: "SUPPRESSED",
      reason: "DESTINATION_UNAVAILABLE",
    });
  });

  it("8. suppression repository honors expiry and supports explicit removal", async () => {
    const repository = new DrizzleNotificationSuppressionRepository();
    const destinationHash = randomUUID().replace(/-/g, "").padEnd(64, "a");
    suppressionCleanup.push({
      channel: "EMAIL",
      hash: destinationHash,
    });

    await repository.suppress({
      channel: "EMAIL",
      destinationHash,
      reason: "HARD_BOUNCE",
      source: "provider-callback",
      now: new Date("2030-01-01T10:00:00.000Z"),
    });

    expect(
      await repository.isSuppressed(
        "EMAIL",
        destinationHash,
        new Date("2030-01-01T10:01:00.000Z")
      )
    ).toBe(true);

    expect(await repository.remove("EMAIL", destinationHash)).toBe(true);
    expect(
      await repository.isSuppressed(
        "EMAIL",
        destinationHash,
        new Date("2030-01-01T10:01:00.000Z")
      )
    ).toBe(false);

    suppressionCleanup.length = 0;
  });

  it("9. expired suppression records no longer block delivery", async () => {
    const repository = new DrizzleNotificationSuppressionRepository();
    const destinationHash = randomUUID().replace(/-/g, "").padEnd(64, "b");
    suppressionCleanup.push({
      channel: "SMS",
      hash: destinationHash,
    });

    await repository.suppress({
      channel: "SMS",
      destinationHash,
      reason: "TEMPORARY_INVALID_NUMBER",
      source: "provider-callback",
      expiresAt: new Date("2030-01-01T11:00:00.000Z"),
      now: new Date("2030-01-01T10:00:00.000Z"),
    });

    expect(
      await repository.isSuppressed(
        "SMS",
        destinationHash,
        new Date("2030-01-01T10:30:00.000Z")
      )
    ).toBe(true);
    expect(
      await repository.isSuppressed(
        "SMS",
        destinationHash,
        new Date("2030-01-01T11:00:00.001Z")
      )
    ).toBe(false);
  });

  it("10. fake template renderer is deterministic and HTML-escapes template data", async () => {
    const renderer = new FakeNotificationTemplateRenderer();
    const rendered = await renderer.render({
      channel: "EMAIL",
      templateKey: "appointment.created",
      templateVersion: 1,
      locale: "es-CO",
      data: {
        customer: "<script>alert('x')</script>",
        appointmentId: "apt-123",
      },
    });

    expect(rendered.subject).toBe(
      "[es-CO] appointment.created"
    );
    expect(rendered.text).toContain(
      "appointment.created@v1:es-CO"
    );
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
  });
});
