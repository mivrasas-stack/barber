import { Worker, type Job } from "bullmq";
import type Redis from "ioredis";
import { getRedisWorkerClient, getRedisProducerClient } from "@/infrastructure/redis/redis-connection-factory";
import { RedisFanoutBroadcaster } from "../fanout/redis-fanout";
import { mapOutboxEventToRealtime } from "./event-registry";
import type { OutboxEnvelope } from "@/infrastructure/outbox/types";
import { JsonRealtimeLogger, type RealtimeLogger } from "../telemetry/realtime-logger";
import { RealtimeMetrics } from "../telemetry/realtime-metrics";
import { env } from "@/shared/config/env";

export interface BridgeProcessResult {
  status: "PUBLISHED" | "SKIPPED_DUPLICATE" | "SKIPPED_UNSUPPORTED" | "ERROR";
  eventId: string;
  topicsCount?: number;
  error?: string;
}

export interface OutboxRealtimeBridgeOptions {
  queueName?: string;
  prefix?: string;
  workerConnection?: Redis;
  dedupConnection?: Redis;
  broadcaster?: RedisFanoutBroadcaster;
  logger?: RealtimeLogger;
  metrics?: RealtimeMetrics;
  concurrency?: number;
  autoStart?: boolean;
}

export class OutboxRealtimeBridge {
  readonly queueName: string;
  readonly prefix: string;
  private readonly broadcaster: RedisFanoutBroadcaster;
  private readonly dedupClient: Redis;
  private readonly logger: RealtimeLogger;
  private readonly metrics?: RealtimeMetrics;
  private worker: Worker | null = null;
  private localSeenEventIds: Set<string> = new Set(); // In-memory fast dedup fallback

  constructor(options: OutboxRealtimeBridgeOptions = {}) {
    this.queueName = options.queueName ?? env.REDIS_REALTIME_QUEUE_NAME;
    this.prefix = options.prefix ?? env.REDIS_QUEUE_PREFIX;
    this.broadcaster = options.broadcaster ?? new RedisFanoutBroadcaster({ logger: options.logger });
    this.dedupClient = options.dedupConnection ?? getRedisProducerClient();
    this.logger = options.logger ?? new JsonRealtimeLogger();
    this.metrics = options.metrics;

    if (options.autoStart) {
      this.startWorker(options.workerConnection, options.concurrency ?? 5);
    }
  }

  startWorker(connection?: Redis, concurrency = 5): Worker {
    if (this.worker) return this.worker;

    const redisConn = connection ?? getRedisWorkerClient();

    this.worker = new Worker(
      this.queueName,
      async (job: Job) => {
        const envelope = job.data as OutboxEnvelope;
        return this.processEnvelope(envelope);
      },
      {
        connection: redisConn,
        prefix: this.prefix,
        concurrency,
      }
    );

    this.worker.on("failed", (job, err) => {
      this.logger.warn("realtime_bridge_job_failed", {
        jobId: job?.id,
        error: err.message,
      });
    });

    return this.worker;
  }

  /**
   * Processes a single OutboxEnvelope idempotently.
   */
  async processEnvelope(envelope: OutboxEnvelope): Promise<BridgeProcessResult> {
    if (!envelope || !envelope.eventId || !envelope.eventType) {
      return {
        status: "ERROR",
        eventId: envelope?.eventId || "unknown",
        error: "Missing required envelope fields",
      };
    }

    const eventId = envelope.eventId;

    // 1. Deduplication Check
    const isDuplicate = await this.checkAndMarkSeen(eventId);
    if (isDuplicate) {
      this.logger.info("realtime_bridge_duplicate_skipped", { eventId });
      return { status: "SKIPPED_DUPLICATE", eventId };
    }

    // 2. Event Whitelist & Payload Sanitization
    const mapped = mapOutboxEventToRealtime(envelope);
    if (!mapped) {
      this.logger.info("realtime_bridge_unsupported_skipped", {
        eventId,
        eventType: envelope.eventType,
      });
      return { status: "SKIPPED_UNSUPPORTED", eventId };
    }

    // 3. Publish to Redis Pub/Sub for all target topics
    let publishedCount = 0;
    for (const topic of mapped.topics) {
      const res = await this.broadcaster.publish({
        topic,
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        payload: mapped.sanitizedPayload,
        occurredAt: envelope.occurredAt,
        tenantId: envelope.tenantId,
      });

      if (res.ok) {
        publishedCount++;
      }
    }

    this.logger.info("realtime_bridge_published", {
      eventId,
      eventType: envelope.eventType,
      topicsCount: publishedCount,
    });

    return {
      status: "PUBLISHED",
      eventId,
      topicsCount: publishedCount,
    };
  }

  private async checkAndMarkSeen(eventId: string): Promise<boolean> {
    // Check in-memory first
    if (this.localSeenEventIds.has(eventId)) {
      return true;
    }

    try {
      const key = `bp:realtime:dedup:${eventId}`;
      // Set key with NX (only if not exists) and 24h TTL
      const res = await this.dedupClient.set(key, "1", "EX", 86400, "NX");
      if (res !== "OK") {
        this.localSeenEventIds.add(eventId);
        return true; // Already exists -> duplicate
      }
      this.localSeenEventIds.add(eventId);
      return false; // Successfully acquired -> new event
    } catch {
      // Degrade gracefully using in-memory set if Redis is offline
      if (this.localSeenEventIds.has(eventId)) {
        return true;
      }
      this.localSeenEventIds.add(eventId);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }
}
