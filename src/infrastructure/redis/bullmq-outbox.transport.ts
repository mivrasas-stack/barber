import { Queue, type QueueOptions } from "bullmq";
import type Redis from "ioredis";
import { env } from "@/shared/config/env";
import type { OutboxEnvelope } from "../outbox/types";
import type {
  OutboxTransport,
  OutboxTransportResult,
} from "../outbox/outbox-transport.interface";
import { sanitizeAndBoundError } from "../outbox/outbox-sanitizer";
import { getRedisWorkerClient } from "./redis-connection-factory";

export interface BullMQOutboxTransportOptions {
  queueName?: string;
  prefix?: string;
  connection?: Redis;
  queue?: Queue;
  retention?: {
    completedAgeSec?: number;
    completedCount?: number;
    failedAgeSec?: number;
    failedCount?: number;
  };
  /**
   * Consumer-side retry settings attached to the BullMQ job.
   *
   * Defaults to attempts=1 so existing Stage 4.1 behavior remains unchanged.
   * Durable downstream consumers (for example Notifications) may opt into
   * bounded retries after the source outbox event has already been accepted
   * by Redis.
   */
  processing?: {
    attempts?: number;
    backoff?: {
      type: "fixed" | "exponential";
      delay: number;
    };
  };
}

export class BullMQOutboxTransport implements OutboxTransport {
  readonly queueName: string;
  readonly prefix: string;
  private readonly queue: Queue;
  private readonly ownsQueue: boolean;
  private readonly processingAttempts: number;
  private readonly processingBackoff?: {
    type: "fixed" | "exponential";
    delay: number;
  };

  constructor(options: BullMQOutboxTransportOptions = {}) {
    this.queueName = options.queueName || env.REDIS_OUTBOX_QUEUE_NAME;
    this.prefix = options.prefix || env.REDIS_QUEUE_PREFIX;

    const attempts = options.processing?.attempts ?? 1;
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > 100) {
      throw new Error("OUTBOX_QUEUE_PROCESSING_ATTEMPTS_INVALID");
    }

    const backoff = options.processing?.backoff;
    if (
      backoff &&
      (!Number.isFinite(backoff.delay) ||
        backoff.delay < 0 ||
        backoff.delay > 86_400_000)
    ) {
      throw new Error("OUTBOX_QUEUE_PROCESSING_BACKOFF_INVALID");
    }

    this.processingAttempts = attempts;
    this.processingBackoff = backoff;

    if (options.queue) {
      this.queue = options.queue;
      this.ownsQueue = false;
    } else {
      const connection = options.connection || getRedisWorkerClient();
      const queueOptions: QueueOptions = {
        connection,
        prefix: this.prefix,
        defaultJobOptions: {
          attempts: this.processingAttempts,
          ...(this.processingBackoff
            ? { backoff: this.processingBackoff }
            : {}),
          removeOnComplete: {
            age: options.retention?.completedAgeSec ?? 86400,
            count: options.retention?.completedCount ?? 5000,
          },
          removeOnFail: {
            age: options.retention?.failedAgeSec ?? 604800,
            count: options.retention?.failedCount ?? 5000,
          },
        },
      };
      this.queue = new Queue(this.queueName, queueOptions);
      this.ownsQueue = true;
    }
  }

  /**
   * Generates a stable, safe BullMQ jobId from the eventId without colons or numeric pitfalls.
   */
  static formatJobId(eventId: string): string {
    const sanitized = eventId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `evt_${sanitized}`;
  }

  async publish(
    envelope: OutboxEnvelope,
    signal?: AbortSignal
  ): Promise<OutboxTransportResult> {
    if (signal?.aborted) {
      return {
        ok: false,
        retryable: true,
        error: "OUTBOX_PUBLISH_ABORTED",
      };
    }

    if (!envelope || !envelope.eventId || !envelope.eventType) {
      return {
        ok: false,
        retryable: false,
        error: "Invalid outbox envelope: missing eventId or eventType",
      };
    }

    const jobId = BullMQOutboxTransport.formatJobId(envelope.eventId);

    try {
      if (signal?.aborted) {
        return {
          ok: false,
          retryable: true,
          error: "OUTBOX_PUBLISH_ABORTED",
        };
      }

      await this.queue.add(envelope.eventType, envelope, {
        jobId,
        attempts: this.processingAttempts,
        ...(this.processingBackoff
          ? { backoff: this.processingBackoff }
          : {}),
      });

      return { ok: true };
    } catch (err: unknown) {
      const sanitized = sanitizeAndBoundError(err);
      const lower = sanitized.toLowerCase();

      const isConnectionOrTimeout =
        lower.includes("econnrefused") ||
        lower.includes("network") ||
        lower.includes("timeout") ||
        lower.includes("closed") ||
        lower.includes("disconnect") ||
        lower.includes("max retries") ||
        lower.includes("connection is closed") ||
        lower.includes("loading") ||
        lower.includes("busy") ||
        lower.includes("read-only");

      if (isConnectionOrTimeout) {
        return {
          ok: false,
          retryable: true,
          error: sanitized,
        };
      }

      if (lower.includes("invalid") || lower.includes("malformed")) {
        return {
          ok: false,
          retryable: false,
          error: sanitized,
        };
      }

      return {
        ok: false,
        retryable: true,
        error: sanitized,
      };
    }
  }

  getQueue(): Queue {
    return this.queue;
  }

  async close(): Promise<void> {
    if (this.ownsQueue) {
      await this.queue.close();
    }
  }
}
