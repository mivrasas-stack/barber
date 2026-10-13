import type { OutboxRepository } from "./outbox-repository.interface";
import type { OutboxPublisher } from "./outbox-publisher";
import type { OutboxBatchResult } from "./types";
import type { OutboxLogger } from "./outbox-logger";
import { SilentOutboxLogger } from "./outbox-logger";
import { sanitizeAndBoundError } from "./outbox-sanitizer";

export interface OutboxWorkerOptions {
  workerId: string;
  publishFrom: Date;
  batchSize?: number;
  concurrency?: number;
  leaseDurationMs?: number;
  pollIntervalMs?: number;
  random?: () => number;
  clock?: () => Date;
  logger?: OutboxLogger;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);

    function done() {
      signal?.removeEventListener("abort", onAbort);
      clearTimeout(timer);
      resolve();
    }

    function onAbort() {
      done();
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export class OutboxWorker {
  readonly workerId: string;
  readonly publishFrom: Date;
  readonly batchSize: number;
  readonly concurrency: number;
  readonly leaseDurationMs: number;
  readonly pollIntervalMs: number;
  private readonly random: () => number;
  private readonly clock: () => Date;
  private readonly logger: OutboxLogger;

  constructor(
    private readonly repository: OutboxRepository,
    private readonly publisher: OutboxPublisher,
    options: OutboxWorkerOptions
  ) {
    if (!options.workerId || !options.workerId.trim()) {
      throw new Error("OUTBOX_WORKER_ID_REQUIRED");
    }
    if (!(options.publishFrom instanceof Date) || Number.isNaN(options.publishFrom.getTime())) {
      throw new Error("OUTBOX_PUBLISH_FROM_REQUIRED");
    }

    this.workerId = options.workerId;
    this.publishFrom = options.publishFrom;
    this.batchSize = options.batchSize ?? 25;
    this.concurrency = Math.max(1, options.concurrency ?? 5);
    this.leaseDurationMs = options.leaseDurationMs ?? 30_000;
    this.pollIntervalMs = options.pollIntervalMs ?? 500;
    this.random = options.random ?? Math.random;
    this.clock = options.clock ?? (() => new Date());
    this.logger = options.logger ?? new SilentOutboxLogger();
  }

  async runOnce(signal?: AbortSignal): Promise<OutboxBatchResult> {
    const startedAt = Date.now();
    const now = this.clock();

    const claimed = await this.repository.claimBatch({
      workerId: this.workerId,
      batchSize: this.batchSize,
      leaseDurationMs: this.leaseDurationMs,
      publishFrom: this.publishFrom,
      now,
    });

    let oldestClaimedAgeMs: number | null = null;
    if (claimed.events.length > 0) {
      const oldestOccurredAt = claimed.events.reduce((oldest, ev) => {
        const time =
          ev.occurredAt instanceof Date
            ? ev.occurredAt.getTime()
            : new Date(ev.occurredAt).getTime();
        return time < oldest ? time : oldest;
      }, now.getTime());
      oldestClaimedAgeMs = Math.max(0, now.getTime() - oldestOccurredAt);
    }

    const summary: OutboxBatchResult = {
      workerId: this.workerId,
      claimed: claimed.events.length,
      published: 0,
      retryScheduled: 0,
      deadLettered: 0,
      leaseLost: 0,
      recoveredExpiredLeases: claimed.recoveredExpiredLeases,
      deadLetteredExpiredLeases: claimed.deadLetteredExpiredLeases,
      durationMs: 0,
      oldestClaimedAgeMs,
      errorCategories: {},
    };

    for (let offset = 0; offset < claimed.events.length; offset += this.concurrency) {
      if (signal?.aborted) break;

      const group = claimed.events.slice(offset, offset + this.concurrency);
      const results = await Promise.all(
        group.map((event) =>
          this.publisher.publishClaimed(event, this.workerId, signal)
        )
      );

      for (const res of results) {
        if (res.result === "PUBLISHED") summary.published += 1;
        if (res.result === "RETRY_SCHEDULED") summary.retryScheduled += 1;
        if (res.result === "DEAD_LETTER") summary.deadLettered += 1;
        if (res.result === "LEASE_LOST") summary.leaseLost += 1;

        if (res.errorCategory) {
          summary.errorCategories[res.errorCategory] =
            (summary.errorCategories[res.errorCategory] ?? 0) + 1;
        }
      }
    }

    summary.durationMs = Date.now() - startedAt;

    this.logger.info("outbox_batch_completed", {
      ...summary,
    });

    return summary;
  }

  async run(signal: AbortSignal): Promise<void> {
    this.logger.info("outbox_worker_started", {
      workerId: this.workerId,
      publishFrom: this.publishFrom.toISOString(),
      batchSize: this.batchSize,
      concurrency: this.concurrency,
      leaseDurationMs: this.leaseDurationMs,
    });

    while (!signal.aborted) {
      try {
        const result = await this.runOnce(signal);
        if (signal.aborted) break;

        if (result.claimed < this.batchSize) {
          const jitter = 0.8 + this.random() * 0.4;
          await sleep(Math.round(this.pollIntervalMs * jitter), signal);
        }
      } catch (error) {
        this.logger.error("outbox_worker_cycle_failed", {
          workerId: this.workerId,
          error: sanitizeAndBoundError(error),
        });

        if (!signal.aborted) {
          await sleep(this.pollIntervalMs, signal);
        }
      }
    }

    this.logger.info("outbox_worker_stopped", {
      workerId: this.workerId,
    });
  }
}
