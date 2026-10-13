import { sanitizeAndBoundError } from "@/infrastructure/outbox/outbox-sanitizer";
import type {
  ExternalNotificationChannel,
  NotificationChannelProvider,
  NotificationProviderResult,
} from "../domain/notification-channel-provider.interface";
import type {
  ClaimedNotificationDelivery,
  NotificationDeliveryRepository,
  NotificationDeliverySettleResult,
} from "../domain/notification-delivery-repository.interface";
import type { NotificationTemplateRenderer } from "../domain/notification-template-renderer.interface";
import type { PrepareNotificationDeliveryResult } from "./prepare-notification-delivery.usecase";

export interface NotificationDeliveryPreparer {
  execute(
    delivery: ClaimedNotificationDelivery,
    now?: Date
  ): Promise<PrepareNotificationDeliveryResult>;
}

export interface NotificationDeliveryWorkerLogger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

const NOOP_LOGGER: NotificationDeliveryWorkerLogger = {
  info() {},
  warn() {},
  error() {},
};

export interface NotificationDeliveryWorkerOptions {
  workerId: string;
  batchSize?: number;
  leaseDurationMs?: number;
  sendTimeoutMs?: number;
  pollIntervalMs?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  channels?: ExternalNotificationChannel[];
  random?: () => number;
  clock?: () => Date;
  logger?: NotificationDeliveryWorkerLogger;
}

export type NotificationDeliveryErrorCategory =
  | "TIMEOUT"
  | "ABORTED"
  | "NETWORK"
  | "TEMPLATE_ERROR"
  | "PROVIDER_ERROR";

export interface NotificationDeliveryProcessResult {
  deliveryId: string;
  result: NotificationDeliverySettleResult | "LEASE_LOST";
  errorCategory?: NotificationDeliveryErrorCategory;
  error?: string;
}

export interface NotificationDeliveryBatchResult {
  claimed: number;
  sent: number;
  suppressed: number;
  deferred: number;
  retried: number;
  deadLettered: number;
  leaseLost: number;
  recoveredExpiredLeases: number;
  deadLetteredExpiredLeases: number;
  durationMs: number;
}

const ALL_EXTERNAL_CHANNELS: ExternalNotificationChannel[] = [
  "EMAIL",
  "SMS",
  "WHATSAPP",
];

export class NotificationDeliveryWorker {
  readonly workerId: string;
  readonly batchSize: number;
  readonly leaseDurationMs: number;
  readonly sendTimeoutMs: number;
  readonly pollIntervalMs: number;
  readonly baseBackoffMs: number;
  readonly maxBackoffMs: number;
  readonly channels: ExternalNotificationChannel[];

  private readonly providerByChannel = new Map<
    ExternalNotificationChannel,
    NotificationChannelProvider
  >();
  private readonly random: () => number;
  private readonly clock: () => Date;
  private readonly logger: NotificationDeliveryWorkerLogger;

  constructor(
    private readonly repository: NotificationDeliveryRepository,
    private readonly prepareDelivery: NotificationDeliveryPreparer,
    private readonly renderer: NotificationTemplateRenderer,
    providers: readonly NotificationChannelProvider[],
    options: NotificationDeliveryWorkerOptions
  ) {
    this.workerId = options.workerId.trim();
    this.batchSize = options.batchSize ?? 25;
    this.leaseDurationMs = options.leaseDurationMs ?? 30_000;
    this.sendTimeoutMs = options.sendTimeoutMs ?? 10_000;
    this.pollIntervalMs = options.pollIntervalMs ?? 1_000;
    this.baseBackoffMs = options.baseBackoffMs ?? 1_000;
    this.maxBackoffMs = options.maxBackoffMs ?? 60_000;
    this.channels = [...new Set(options.channels ?? ALL_EXTERNAL_CHANNELS)];
    this.random = options.random ?? Math.random;
    this.clock = options.clock ?? (() => new Date());
    this.logger = options.logger ?? NOOP_LOGGER;

    if (!this.workerId) {
      throw new Error("NOTIFICATION_DELIVERY_WORKER_ID_REQUIRED");
    }
    if (!Number.isInteger(this.batchSize) || this.batchSize < 1 || this.batchSize > 500) {
      throw new Error("NOTIFICATION_DELIVERY_BATCH_SIZE_INVALID");
    }
    if (!Number.isFinite(this.leaseDurationMs) || this.leaseDurationMs < 100) {
      throw new Error("NOTIFICATION_DELIVERY_LEASE_DURATION_INVALID");
    }
    if (!Number.isFinite(this.sendTimeoutMs) || this.sendTimeoutMs < 1) {
      throw new Error("NOTIFICATION_DELIVERY_SEND_TIMEOUT_INVALID");
    }
    if (!Number.isFinite(this.pollIntervalMs) || this.pollIntervalMs < 0) {
      throw new Error("NOTIFICATION_DELIVERY_POLL_INTERVAL_INVALID");
    }
    if (this.channels.length === 0) {
      throw new Error("NOTIFICATION_DELIVERY_CHANNELS_REQUIRED");
    }

    for (const channel of this.channels) {
      if (!ALL_EXTERNAL_CHANNELS.includes(channel)) {
        throw new Error("NOTIFICATION_DELIVERY_CHANNEL_INVALID");
      }
      const matches = providers.filter(
        (provider) => provider.channels.includes(channel) && provider.supports(channel)
      );
      if (matches.length === 0) {
        throw new Error(`NOTIFICATION_PROVIDER_MISSING:${channel}`);
      }
      if (matches.length > 1) {
        throw new Error(`NOTIFICATION_PROVIDER_AMBIGUOUS:${channel}`);
      }
      this.providerByChannel.set(channel, matches[0]);
    }
  }

  calculateNextAttemptAt(attempt: number, now: Date): Date {
    const exponent = Math.max(0, attempt - 1);
    const capped = Math.min(
      this.maxBackoffMs,
      this.baseBackoffMs * 2 ** exponent
    );
    const jitterFactor = 0.8 + this.random() * 0.4;
    return new Date(now.getTime() + Math.round(capped * jitterFactor));
  }

  async runBatch(signal?: AbortSignal): Promise<NotificationDeliveryBatchResult> {
    const startedAt = Date.now();
    const now = this.clock();
    const claim = await this.repository.claimBatch({
      workerId: this.workerId,
      batchSize: this.batchSize,
      leaseDurationMs: this.leaseDurationMs,
      channels: this.channels,
      now,
    });

    const results = await Promise.all(
      claim.deliveries.map((delivery) => this.processClaimed(delivery, signal))
    );

    const batch: NotificationDeliveryBatchResult = {
      claimed: claim.deliveries.length,
      sent: 0,
      suppressed: 0,
      deferred: 0,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
      recoveredExpiredLeases: claim.recoveredExpiredLeases,
      deadLetteredExpiredLeases: claim.deadLetteredExpiredLeases,
      durationMs: Date.now() - startedAt,
    };

    for (const entry of results) {
      switch (entry.result) {
        case "SENT":
          batch.sent += 1;
          break;
        case "SUPPRESSED":
          batch.suppressed += 1;
          break;
        case "DEFERRED":
          batch.deferred += 1;
          break;
        case "RETRY_SCHEDULED":
          batch.retried += 1;
          break;
        case "DEAD_LETTER":
          batch.deadLettered += 1;
          break;
        case "LEASE_LOST":
          batch.leaseLost += 1;
          break;
      }
    }

    this.logger.info("notification_delivery_batch_completed", {
      workerId: this.workerId,
      ...batch,
    });

    return batch;
  }

  async run(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      const result = await this.runBatch(signal);
      if (signal.aborted) break;
      if (result.claimed === 0) {
        await this.delay(this.pollIntervalMs, signal);
      }
    }
  }

  async processClaimed(
    delivery: ClaimedNotificationDelivery,
    signal?: AbortSignal
  ): Promise<NotificationDeliveryProcessResult> {
    const startedAt = Date.now();

    if (signal?.aborted) {
      return this.failDelivery(
        delivery,
        "NOTIFICATION_DELIVERY_ABORTED",
        true,
        "ABORTED",
        startedAt
      );
    }

    const prepared = await this.prepareDelivery.execute(delivery, this.clock());

    if (prepared.status === "SUPPRESSED") {
      const result = await this.repository.suppress({
        id: delivery.id,
        workerId: this.workerId,
        reason: prepared.reason,
        destinationHash: prepared.destination?.destinationHash,
        destinationMasked: prepared.destination?.destinationMasked,
        now: this.clock(),
      });
      this.logSettlement("notification_delivery_suppressed", delivery, result, startedAt, {
        reason: prepared.reason,
        destinationHash: prepared.destination?.destinationHash,
      });
      return { deliveryId: delivery.id, result };
    }

    if (prepared.status === "DEFERRED") {
      const result = await this.repository.defer({
        id: delivery.id,
        workerId: this.workerId,
        nextAttemptAt: prepared.nextAttemptAt,
        reason: prepared.reason,
        now: this.clock(),
      });
      this.logSettlement("notification_delivery_deferred", delivery, result, startedAt, {
        reason: prepared.reason,
        nextAttemptAt: prepared.nextAttemptAt.toISOString(),
      });
      return { deliveryId: delivery.id, result };
    }

    const ownsLease = await this.repository.renewLease(
      delivery.id,
      this.workerId,
      this.leaseDurationMs,
      this.clock()
    );
    if (!ownsLease) {
      this.logger.warn("notification_delivery_lease_lost_before_send", {
        workerId: this.workerId,
        deliveryId: delivery.id,
        tenantId: delivery.tenantId,
        channel: delivery.channel,
        attempt: delivery.attempts,
      });
      return { deliveryId: delivery.id, result: "LEASE_LOST" };
    }

    let rendered;
    try {
      rendered = await this.renderer.render({
        channel: delivery.channel,
        templateKey: delivery.templateKey,
        templateVersion: delivery.templateVersion,
        locale: delivery.locale,
        data: delivery.payload,
      });
    } catch (error) {
      const sanitized = sanitizeAndBoundError(error);
      const retryable = this.isTransientError(sanitized);
      return this.failDelivery(
        delivery,
        sanitized,
        retryable,
        retryable ? this.classifyError(sanitized) : "TEMPLATE_ERROR",
        startedAt
      );
    }

    const provider = this.providerByChannel.get(delivery.channel);
    if (!provider) {
      return this.failDelivery(
        delivery,
        "NOTIFICATION_PROVIDER_MISSING",
        false,
        "PROVIDER_ERROR",
        startedAt
      );
    }

    const providerResult = await this.sendWithHardTimeout(
      provider,
      {
        deliveryId: delivery.id,
        idempotencyKey: delivery.id,
        channel: delivery.channel,
        destination: prepared.destination.destination,
        templateKey: delivery.templateKey,
        templateVersion: delivery.templateVersion,
        locale: delivery.locale,
        timezone: delivery.timezone,
        data: delivery.payload,
        rendered,
      },
      signal
    );

    if (providerResult.ok) {
      const result = await this.repository.markSent({
        id: delivery.id,
        workerId: this.workerId,
        provider: providerResult.provider,
        providerMessageId: providerResult.providerMessageId,
        destinationHash: prepared.destination.destinationHash,
        destinationMasked: prepared.destination.destinationMasked,
        sentAt: this.clock(),
      });

      this.logSettlement("notification_delivery_sent", delivery, result, startedAt, {
        provider: providerResult.provider,
        destinationHash: prepared.destination.destinationHash,
      });
      return { deliveryId: delivery.id, result };
    }

    const sanitized = this.sanitizeProviderError(
      providerResult.error,
      prepared.destination.destination
    );
    return this.failDelivery(
      delivery,
      sanitized,
      providerResult.retryable,
      this.classifyError(sanitized),
      startedAt,
      providerResult.provider,
      prepared.destination.destinationHash
    );
  }

  private async sendWithHardTimeout(
    provider: NotificationChannelProvider,
    message: Parameters<NotificationChannelProvider["send"]>[0],
    parentSignal?: AbortSignal
  ): Promise<NotificationProviderResult> {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    let onParentAbort: (() => void) | undefined;
    let parentAbortReject: ((reason?: unknown) => void) | undefined;

    if (parentSignal) {
      if (parentSignal.aborted) {
        controller.abort(new Error("NOTIFICATION_PROVIDER_ABORTED"));
      } else {
        onParentAbort = () => {
          const error = new Error("NOTIFICATION_PROVIDER_ABORTED");
          controller.abort(error);
          parentAbortReject?.(error);
        };
        parentSignal.addEventListener("abort", onParentAbort, { once: true });
      }
    }

    try {
      if (controller.signal.aborted) {
        throw controller.signal.reason ?? new Error("NOTIFICATION_PROVIDER_ABORTED");
      }

      let rawPromise: Promise<NotificationProviderResult>;
      try {
        rawPromise = Promise.resolve(provider.send(message, controller.signal));
      } catch (error) {
        rawPromise = Promise.reject(error);
      }
      rawPromise.catch(() => {});

      const racers: Promise<NotificationProviderResult>[] = [rawPromise];

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error("NOTIFICATION_PROVIDER_TIMEOUT");
          controller.abort(error);
          reject(error);
        }, this.sendTimeoutMs);
      });
      racers.push(timeoutPromise);

      if (parentSignal && !parentSignal.aborted) {
        racers.push(
          new Promise<never>((_, reject) => {
            parentAbortReject = reject;
          })
        );
      }

      return await Promise.race(racers);
    } catch (error) {
      const sanitized = sanitizeAndBoundError(error, 1000);
      const category = this.classifyError(sanitized);
      return {
        ok: false,
        retryable: true,
        error:
          category === "TIMEOUT"
            ? "NOTIFICATION_PROVIDER_TIMEOUT"
            : category === "ABORTED"
              ? "NOTIFICATION_PROVIDER_ABORTED"
              : sanitized,
        provider: provider.name,
      };
    } finally {
      if (timer) clearTimeout(timer);
      if (parentSignal && onParentAbort) {
        parentSignal.removeEventListener("abort", onParentAbort);
      }
    }
  }

  private async failDelivery(
    delivery: ClaimedNotificationDelivery,
    error: string,
    retryable: boolean,
    errorCategory: NotificationDeliveryErrorCategory,
    startedAt: number,
    provider?: string,
    destinationHash?: string
  ): Promise<NotificationDeliveryProcessResult> {
    const now = this.clock();
    const sanitized = sanitizeAndBoundError(error);
    const result = await this.repository.markFailed({
      id: delivery.id,
      workerId: this.workerId,
      error: sanitized,
      retryable,
      nextAttemptAt: this.calculateNextAttemptAt(delivery.attempts, now),
      now,
    });

    this.logger.warn("notification_delivery_failed", {
      workerId: this.workerId,
      deliveryId: delivery.id,
      tenantId: delivery.tenantId,
      channel: delivery.channel,
      provider,
      attempt: delivery.attempts,
      durationMs: Date.now() - startedAt,
      retryable,
      result,
      errorCategory,
      error: sanitized,
      destinationHash,
    });

    return {
      deliveryId: delivery.id,
      result,
      errorCategory,
      error: sanitized,
    };
  }

  private classifyError(error: string): NotificationDeliveryErrorCategory {
    const lower = error.toLowerCase();
    if (lower.includes("timeout")) return "TIMEOUT";
    if (lower.includes("abort")) return "ABORTED";
    if (
      lower.includes("econnrefused") ||
      lower.includes("network") ||
      lower.includes("enotfound") ||
      lower.includes("eai_again")
    ) {
      return "NETWORK";
    }
    return "PROVIDER_ERROR";
  }

  private isTransientError(error: string): boolean {
    const category = this.classifyError(error);
    return category === "TIMEOUT" || category === "ABORTED" || category === "NETWORK";
  }

  private sanitizeProviderError(error: unknown, destination: string): string {
    const raw = error instanceof Error ? error.message : String(error);
    const withoutDestination = destination
      ? raw.split(destination).join("[REDACTED_DESTINATION]")
      : raw;
    return sanitizeAndBoundError(withoutDestination);
  }

  private logSettlement(
    message: string,
    delivery: ClaimedNotificationDelivery,
    result: NotificationDeliverySettleResult,
    startedAt: number,
    extra: Record<string, unknown> = {}
  ): void {
    this.logger.info(message, {
      workerId: this.workerId,
      deliveryId: delivery.id,
      tenantId: delivery.tenantId,
      channel: delivery.channel,
      attempt: delivery.attempts,
      durationMs: Date.now() - startedAt,
      result,
      ...extra,
    });
  }

  private async delay(ms: number, signal: AbortSignal): Promise<void> {
    if (ms <= 0 || signal.aborted) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(done, ms);
      const onAbort = () => {
        clearTimeout(timer);
        done();
      };
      function done() {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
}
