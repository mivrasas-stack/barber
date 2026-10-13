import type { OutboxEventRow } from "@/infrastructure/database/schema/outbox";
import type { OutboxRepository } from "./outbox-repository.interface";
import type { OutboxTransport, OutboxTransportResult } from "./outbox-transport.interface";
import type { OutboxEnvelope, OutboxProcessResult } from "./types";
import type { OutboxLogger } from "./outbox-logger";
import { SilentOutboxLogger } from "./outbox-logger";
import { sanitizeAndBoundError } from "./outbox-sanitizer";

export interface OutboxPublisherOptions {
  leaseDurationMs: number;
  publishTimeoutMs?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  random?: () => number;
  clock?: () => Date;
  logger?: OutboxLogger;
}

export class OutboxPublisher {
  readonly leaseDurationMs: number;
  readonly publishTimeoutMs: number;
  readonly baseBackoffMs: number;
  readonly maxBackoffMs: number;
  private readonly random: () => number;
  private readonly clock: () => Date;
  private readonly logger: OutboxLogger;

  constructor(
    private readonly repository: OutboxRepository,
    private readonly transport: OutboxTransport,
    options: OutboxPublisherOptions
  ) {
    this.leaseDurationMs = options.leaseDurationMs;
    this.publishTimeoutMs = options.publishTimeoutMs ?? 10_000;
    this.baseBackoffMs = options.baseBackoffMs ?? 1000;
    this.maxBackoffMs = options.maxBackoffMs ?? 60_000;
    this.random = options.random ?? Math.random;
    this.clock = options.clock ?? (() => new Date());
    this.logger = options.logger ?? new SilentOutboxLogger();
  }

  private toEnvelope(row: OutboxEventRow): OutboxEnvelope {
    const occurredAtStr =
      row.occurredAt instanceof Date
        ? row.occurredAt.toISOString()
        : new Date(row.occurredAt).toISOString();

    return {
      eventId: row.eventId,
      eventType: row.eventType,
      eventVersion: row.eventVersion,
      tenantId: row.tenantId,
      locationId: row.locationId,
      aggregateId: row.aggregateId,
      occurredAt: occurredAtStr,
      payload: row.payload,
      deliveryAttempt: row.attempts,
    };
  }

  calculateNextAttemptAt(attempt: number, now: Date): Date {
    const exponent = Math.max(0, attempt - 1);
    const capped = Math.min(this.maxBackoffMs, this.baseBackoffMs * 2 ** exponent);
    const jitterFactor = 0.8 + this.random() * 0.4;
    return new Date(now.getTime() + Math.round(capped * jitterFactor));
  }

  private classifyError(error: string): string {
    const lower = error.toLowerCase();
    if (lower.includes("timeout")) return "TIMEOUT";
    if (lower.includes("abort")) return "ABORTED";
    if (lower.includes("econnrefused") || lower.includes("network") || lower.includes("enotfound")) {
      return "NETWORK";
    }
    return "TRANSPORT_ERROR";
  }

  async publishClaimed(
    row: OutboxEventRow,
    workerId: string,
    signal?: AbortSignal
  ): Promise<OutboxProcessResult> {
    const now = this.clock();

    // 1. Verify and renew the lease immediately before performing external network call
    const ownsLease = await this.repository.renewLease(
      row.id,
      workerId,
      this.leaseDurationMs,
      now
    );

    if (!ownsLease) {
      this.logger.warn("outbox_lease_lost_before_publish", {
        workerId,
        eventId: row.eventId,
        eventType: row.eventType,
      });
      return { eventId: row.eventId, result: "LEASE_LOST" };
    }

    // 2. Perform external publication with isolated timeout and abort protection
    let transportResult: OutboxTransportResult;
    let timer: NodeJS.Timeout | undefined;
    let onParentAbort: (() => void) | undefined;
    let parentAbortReject: ((err: Error) => void) | undefined;
    const startedAt = Date.now();
    const abortController = new AbortController();

    if (signal) {
      if (signal.aborted) {
        abortController.abort(new Error("OUTBOX_PUBLISH_ABORTED"));
      } else {
        onParentAbort = () => {
          const abortErr = new Error("OUTBOX_PUBLISH_ABORTED");
          abortController.abort(abortErr);
          if (parentAbortReject) {
            parentAbortReject(abortErr);
          }
        };
        signal.addEventListener("abort", onParentAbort, { once: true });
      }
    }

    try {
      if (abortController.signal.aborted) {
        throw (
          abortController.signal.reason instanceof Error
            ? abortController.signal.reason
            : new Error("OUTBOX_PUBLISH_ABORTED")
        );
      }

      // Safe transport invocation: wraps synchronous or asynchronous invocation in a Promise
      let rawTransportPromise: Promise<OutboxTransportResult>;
      try {
        rawTransportPromise = Promise.resolve(
          this.transport.publish(this.toEnvelope(row), abortController.signal)
        );
      } catch (syncError) {
        rawTransportPromise = Promise.reject(syncError);
      }

      // Crucial: attach no-op rejection handler to rawTransportPromise to prevent
      // unhandled promise rejections if a non-cooperative transport promise rejects
      // AFTER the publisher has already timed out or aborted.
      rawTransportPromise.catch(() => {});

      // Build racers:
      const racers: Promise<OutboxTransportResult>[] = [rawTransportPromise];

      // 1) Hard timeout racer: publisher enforces timeout independently of transport cooperation
      if (this.publishTimeoutMs > 0) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            const timeoutErr = new Error("OUTBOX_PUBLISH_TIMEOUT");
            abortController.abort(timeoutErr);
            reject(timeoutErr);
          }, this.publishTimeoutMs);
        });
        racers.push(timeoutPromise);
      }

      // 2) Parent abort racer
      if (signal && !signal.aborted) {
        const parentAbortPromise = new Promise<never>((_, reject) => {
          parentAbortReject = reject;
        });
        racers.push(parentAbortPromise);
      }

      transportResult = await Promise.race(racers);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isTimeout =
        message.includes("OUTBOX_PUBLISH_TIMEOUT") ||
        (abortController.signal.reason instanceof Error &&
          abortController.signal.reason.message.includes("OUTBOX_PUBLISH_TIMEOUT"));
      const isAborted =
        message.includes("OUTBOX_PUBLISH_ABORTED") ||
        (abortController.signal.reason instanceof Error &&
          abortController.signal.reason.message.includes("OUTBOX_PUBLISH_ABORTED"));

      transportResult = {
        ok: false as const,
        retryable: true,
        error: isTimeout
          ? "OUTBOX_PUBLISH_TIMEOUT"
          : isAborted
          ? "OUTBOX_PUBLISH_ABORTED"
          : message,
      };
    } finally {
      if (timer) clearTimeout(timer);
      if (signal && onParentAbort) {
        signal.removeEventListener("abort", onParentAbort);
      }
    }

    const durationMs = Date.now() - startedAt;

    // 3. Handle successful transport delivery
    if (transportResult.ok) {
      const publishNow = this.clock();
      const result = await this.repository.markPublished(row.id, workerId, publishNow);

      this.logger.info("outbox_publish_succeeded", {
        workerId,
        eventId: row.eventId,
        eventType: row.eventType,
        tenantId: row.tenantId,
        attempt: row.attempts,
        durationMs,
        settleResult: result,
      });

      return { eventId: row.eventId, result };
    }

    // 4. Handle transport failure: calculate backoff and transition state
    const failureNow = this.clock();
    const sanitizedError = sanitizeAndBoundError(transportResult.error);
    const errorCategory = this.classifyError(transportResult.error);
    const nextAttempt = this.calculateNextAttemptAt(row.attempts, failureNow);

    const result = await this.repository.markFailed({
      id: row.id,
      workerId,
      error: sanitizedError,
      retryable: transportResult.retryable,
      nextAttemptAt: nextAttempt,
      now: failureNow,
    });

    this.logger.warn("outbox_publish_failed", {
      workerId,
      eventId: row.eventId,
      eventType: row.eventType,
      tenantId: row.tenantId,
      attempt: row.attempts,
      durationMs,
      retryable: transportResult.retryable,
      settleResult: result,
      errorCategory,
      error: sanitizedError,
    });

    return {
      eventId: row.eventId,
      result,
      errorCategory,
      error: sanitizedError,
    };
  }
}

