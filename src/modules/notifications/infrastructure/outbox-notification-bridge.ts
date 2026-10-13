import { UnrecoverableError, Worker, type Job } from "bullmq";
import type Redis from "ioredis";
import type { OutboxEnvelope } from "@/infrastructure/outbox/types";
import { sanitizeAndBoundError } from "@/infrastructure/outbox/outbox-sanitizer";
import { getRedisWorkerClient } from "@/infrastructure/redis/redis-connection-factory";
import { env } from "@/shared/config/env";
import {
  ProcessNotificationEventUseCase,
  type ProcessNotificationEventResult,
} from "../application/process-notification-event.usecase";
import { DrizzleNotificationRepository } from "./drizzle-notification.repository";
import { DrizzleNotificationRecipientResolver } from "./drizzle-notification-recipient.resolver";
import {
  JsonNotificationLogger,
  type NotificationLogger,
} from "./notification-logger";

export interface NotificationEventProcessor {
  execute(envelope: OutboxEnvelope): Promise<ProcessNotificationEventResult>;
}

export interface OutboxNotificationBridgeOptions {
  queueName?: string;
  prefix?: string;
  workerConnection?: Redis;
  processor?: NotificationEventProcessor;
  logger?: NotificationLogger;
  concurrency?: number;
  autoStart?: boolean;
}

export class OutboxNotificationBridge {
  readonly queueName: string;
  readonly prefix: string;
  private readonly processor: NotificationEventProcessor;
  private readonly logger: NotificationLogger;
  private worker: Worker | null = null;

  constructor(options: OutboxNotificationBridgeOptions = {}) {
    this.queueName = options.queueName ?? env.REDIS_NOTIFICATION_QUEUE_NAME;
    this.prefix = options.prefix ?? env.REDIS_QUEUE_PREFIX;
    this.logger = options.logger ?? new JsonNotificationLogger();
    this.processor =
      options.processor ??
      new ProcessNotificationEventUseCase(
        new DrizzleNotificationRepository(),
        new DrizzleNotificationRecipientResolver()
      );

    if (options.autoStart) {
      this.startWorker(options.workerConnection, options.concurrency ?? 5);
    }
  }

  startWorker(connection?: Redis, concurrency = 5): Worker {
    if (this.worker) {
      return this.worker;
    }

    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 100) {
      throw new Error("NOTIFICATION_WORKER_CONCURRENCY_INVALID");
    }

    const redisConnection = connection ?? getRedisWorkerClient();

    this.worker = new Worker(
      this.queueName,
      async (job: Job) => {
        const envelope = job.data as OutboxEnvelope;
        return this.processEnvelope(envelope);
      },
      {
        connection: redisConnection,
        prefix: this.prefix,
        concurrency,
      }
    );

    this.worker.on("completed", (job, result) => {
      const processed = result as ProcessNotificationEventResult | undefined;
      this.logger.info("notification_event_job_completed", {
        jobId: job.id,
        eventId: processed?.eventId,
        status: processed?.status,
        attemptsMade: job.attemptsMade,
      });
    });

    this.worker.on("failed", (job, error) => {
      this.logger.warn("notification_event_job_failed", {
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: sanitizeAndBoundError(error, 1000),
      });
    });

    this.worker.on("error", (error) => {
      this.logger.error("notification_worker_error", {
        error: sanitizeAndBoundError(error, 1000),
      });
    });

    return this.worker;
  }

  async processEnvelope(
    envelope: OutboxEnvelope
  ): Promise<ProcessNotificationEventResult> {
    if (
      !envelope ||
      !envelope.eventId ||
      !envelope.eventType ||
      !envelope.tenantId ||
      !envelope.aggregateId
    ) {
      throw new UnrecoverableError("NOTIFICATION_ENVELOPE_INVALID");
    }

    try {
      return await this.processor.execute(envelope);
    } catch (error) {
      // Throw a sanitized error so BullMQ can retry transient failures without
      // persisting credentials or arbitrary raw exception text in job metadata.
      throw new Error(sanitizeAndBoundError(error, 1000));
    }
  }

  getWorker(): Worker | null {
    return this.worker;
  }

  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }
}
