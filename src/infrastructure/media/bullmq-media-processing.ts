import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import {
  Queue,
  UnrecoverableError,
  Worker,
  type Job,
  type QueueOptions,
} from "bullmq";
import type Redis from "ioredis";
import { env } from "@/shared/config/env";
import { sanitizeAndBoundError } from "@/infrastructure/outbox/outbox-sanitizer";
import { getRedisWorkerClient } from "@/infrastructure/redis/redis-connection-factory";
import type { MediaProcessingExecutionResult } from "./media-processing-executor";
import {
  JsonMediaLogger,
  type MediaLogger,
} from "./media-logger";

export const MEDIA_PROCESSING_JOB_NAME = "media.process";

export interface MediaProcessingJobData {
  assetId: string;
}

export interface MediaAssetProcessor {
  processAsset(
    assetId: string,
    workerId: string
  ): Promise<MediaProcessingExecutionResult>;
}

export interface BullMQMediaProcessingQueueOptions {
  queueName?: string;
  prefix?: string;
  connection?: Redis;
  queue?: Queue<MediaProcessingJobData>;
  retention?: {
    completedAgeSec?: number;
    completedCount?: number;
    failedAgeSec?: number;
    failedCount?: number;
  };
}

export interface EnqueueMediaProcessingResult {
  jobId: string;
}

export class BullMQMediaProcessingQueue {
  readonly queueName: string;
  readonly prefix: string;
  private readonly queue: Queue<MediaProcessingJobData>;
  private readonly ownsQueue: boolean;

  constructor(options: BullMQMediaProcessingQueueOptions = {}) {
    this.queueName = options.queueName ?? env.REDIS_MEDIA_QUEUE_NAME;
    this.prefix = options.prefix ?? env.REDIS_QUEUE_PREFIX;

    if (options.queue) {
      this.queue = options.queue;
      this.ownsQueue = false;
      return;
    }

    const connection = options.connection ?? getRedisWorkerClient();
    const queueOptions: QueueOptions = {
      connection,
      prefix: this.prefix,
      defaultJobOptions: {
        // PostgreSQL leases/retry schedule are authoritative. BullMQ is transport only.
        attempts: 1,
        removeOnComplete: {
          age: options.retention?.completedAgeSec ?? 86_400,
          count: options.retention?.completedCount ?? 5_000,
        },
        removeOnFail: {
          age: options.retention?.failedAgeSec ?? 604_800,
          count: options.retention?.failedCount ?? 5_000,
        },
      },
    };

    this.queue = new Queue<MediaProcessingJobData>(
      this.queueName,
      queueOptions
    );
    this.ownsQueue = true;
  }

  static formatJobId(assetId: string): string {
    const sanitized = assetId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `media_${sanitized}`;
  }

  async enqueue(assetId: string): Promise<EnqueueMediaProcessingResult> {
    if (!assetId || assetId.length > 128 || !UUID_RE.test(assetId)) {
      throw new Error("MEDIA_PROCESSING_ASSET_ID_INVALID");
    }

    const jobId = BullMQMediaProcessingQueue.formatJobId(assetId);

    await this.queue.add(
      MEDIA_PROCESSING_JOB_NAME,
      { assetId },
      { jobId, attempts: 1 }
    );

    return { jobId };
  }

  getQueue(): Queue<MediaProcessingJobData> {
    return this.queue;
  }

  async close(): Promise<void> {
    if (this.ownsQueue) {
      await this.queue.close();
    }
  }
}

export interface BullMQMediaProcessingWorkerOptions {
  processor: MediaAssetProcessor;
  queueName?: string;
  prefix?: string;
  workerConnection?: Redis;
  logger?: MediaLogger;
  concurrency?: number;
  workerId?: string;
  autoStart?: boolean;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function defaultWorkerId(): string {
  const host = hostname().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
  return `media-${host}-${process.pid}-${randomUUID().slice(0, 8)}`;
}

export class BullMQMediaProcessingWorker {
  readonly queueName: string;
  readonly prefix: string;
  readonly workerId: string;

  private readonly processor: MediaAssetProcessor;
  private readonly logger: MediaLogger;
  private readonly configuredConnection?: Redis;
  private readonly configuredConcurrency?: number;
  private worker: Worker<MediaProcessingJobData> | null = null;

  constructor(options: BullMQMediaProcessingWorkerOptions) {
    this.processor = options.processor;
    this.queueName = options.queueName ?? env.REDIS_MEDIA_QUEUE_NAME;
    this.prefix = options.prefix ?? env.REDIS_QUEUE_PREFIX;
    this.logger = options.logger ?? new JsonMediaLogger();
    this.configuredConnection = options.workerConnection;
    this.configuredConcurrency = options.concurrency;
    this.workerId = options.workerId ?? defaultWorkerId();

    if (this.workerId.length > 128) {
      throw new Error("MEDIA_PROCESSING_WORKER_ID_TOO_LONG");
    }

    if (options.autoStart) {
      this.startWorker(
        options.workerConnection,
        options.concurrency ?? env.MEDIA_PROCESSING_WORKER_CONCURRENCY
      );
    }
  }

  startWorker(
    connection?: Redis,
    concurrency = this.configuredConcurrency ??
      env.MEDIA_PROCESSING_WORKER_CONCURRENCY
  ): Worker<MediaProcessingJobData> {
    if (this.worker) {
      return this.worker;
    }

    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) {
      throw new Error("MEDIA_PROCESSING_WORKER_CONCURRENCY_INVALID");
    }

    const redisConnection =
      connection ?? this.configuredConnection ?? getRedisWorkerClient();

    this.worker = new Worker<MediaProcessingJobData>(
      this.queueName,
      async (job: Job<MediaProcessingJobData>) =>
        this.processJobData(job.data),
      {
        connection: redisConnection,
        prefix: this.prefix,
        concurrency,
      }
    );

    this.worker.on("completed", (job, result) => {
      const processed = result as MediaProcessingExecutionResult | undefined;
      this.logger.info("media_processing_job_completed", {
        jobId: job.id,
        assetId: processed?.assetId,
        status: processed?.status,
        reason: processed?.reason,
        claimed: processed?.claimed,
        attemptsMade: job.attemptsMade,
      });
    });

    this.worker.on("failed", (job, error) => {
      this.logger.warn("media_processing_job_failed", {
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: sanitizeAndBoundError(error, 1000),
      });
    });

    this.worker.on("error", (error) => {
      this.logger.error("media_processing_worker_error", {
        error: sanitizeAndBoundError(error, 1000),
      });
    });

    return this.worker;
  }

  async processJobData(
    data: MediaProcessingJobData
  ): Promise<MediaProcessingExecutionResult> {
    if (!data || !UUID_RE.test(data.assetId)) {
      throw new UnrecoverableError("MEDIA_PROCESSING_JOB_INVALID");
    }

    try {
      return await this.processor.processAsset(data.assetId, this.workerId);
    } catch (error) {
      throw new Error(sanitizeAndBoundError(error, 1000));
    }
  }

  getWorker(): Worker<MediaProcessingJobData> | null {
    return this.worker;
  }

  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }
}
