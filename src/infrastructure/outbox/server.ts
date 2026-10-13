import { hostname } from "node:os";
import { env } from "@/shared/config/env";
import {
  closeRedisConnections,
} from "@/infrastructure/redis/redis-connection-factory";
import { DrizzleOutboxRepository } from "./drizzle-outbox.repository";
import { JsonOutboxLogger } from "./outbox-logger";
import { OutboxPublisher } from "./outbox-publisher";
import { OutboxWorker } from "./outbox-worker";
import { sanitizeAndBoundError } from "./outbox-sanitizer";
import { createDefaultOutboxTransportBundle } from "./default-outbox.transport";

export function parseOutboxPublishFrom(value: string | undefined): Date {
  if (!value || !value.trim()) {
    throw new Error(
      "OUTBOX_PUBLISH_FROM_REQUIRED: set an explicit ISO-8601 cutover timestamp before starting the outbox publisher"
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("OUTBOX_PUBLISH_FROM_INVALID");
  }

  return parsed;
}

export interface OutboxPublisherRuntime {
  worker: OutboxWorker;
  abortController: AbortController;
  runPromise: Promise<void>;
  shutdown(): Promise<void>;
}

export async function bootstrapOutboxPublisher(): Promise<OutboxPublisherRuntime> {
  const logger = new JsonOutboxLogger();
  const publishFrom = parseOutboxPublishFrom(env.OUTBOX_PUBLISH_FROM);
  const repository = new DrizzleOutboxRepository();
  const transports = createDefaultOutboxTransportBundle();

  const publisher = new OutboxPublisher(repository, transports.transport, {
    leaseDurationMs: env.OUTBOX_LEASE_DURATION_MS,
    publishTimeoutMs: env.OUTBOX_PUBLISH_TIMEOUT_MS,
    logger,
  });

  const workerId = `${hostname()}:${process.pid}`;
  const worker = new OutboxWorker(repository, publisher, {
    workerId,
    publishFrom,
    batchSize: env.OUTBOX_BATCH_SIZE,
    concurrency: env.OUTBOX_CONCURRENCY,
    leaseDurationMs: env.OUTBOX_LEASE_DURATION_MS,
    pollIntervalMs: env.OUTBOX_POLL_INTERVAL_MS,
    logger,
  });

  const abortController = new AbortController();
  const runPromise = worker.run(abortController.signal);
  let shutdownPromise: Promise<void> | null = null;

  const shutdown = async () => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      logger.info("outbox_runtime_shutting_down", { workerId });
      abortController.abort();

      try {
        await runPromise;
      } finally {
        await transports.close();
        await closeRedisConnections();
      }

      logger.info("outbox_runtime_stopped", { workerId });
    })();

    return shutdownPromise;
  };

  logger.info("outbox_runtime_started", {
    workerId,
    publishFrom: publishFrom.toISOString(),
    realtimeQueue: env.REDIS_REALTIME_QUEUE_NAME,
    notificationQueue: env.REDIS_NOTIFICATION_QUEUE_NAME,
  });

  return {
    worker,
    abortController,
    runPromise,
    shutdown,
  };
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  bootstrapOutboxPublisher()
    .then(({ shutdown, runPromise }) => {
      const onSignal = async (signal: string) => {
        console.info(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "INFO",
            component: "outbox-worker",
            message: "outbox_runtime_signal_received",
            signal,
          })
        );
        await shutdown();
        process.exit(0);
      };

      process.on("SIGINT", () => {
        void onSignal("SIGINT");
      });
      process.on("SIGTERM", () => {
        void onSignal("SIGTERM");
      });

      void runPromise.catch(async (error) => {
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "ERROR",
            component: "outbox-worker",
            message: "outbox_runtime_fatal",
            error: sanitizeAndBoundError(error, 1000),
          })
        );
        await shutdown();
        process.exit(1);
      });
    })
    .catch((error) => {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "ERROR",
          component: "outbox-worker",
          message: "outbox_runtime_bootstrap_failed",
          error: sanitizeAndBoundError(error, 1000),
        })
      );
      process.exit(1);
    });
}
