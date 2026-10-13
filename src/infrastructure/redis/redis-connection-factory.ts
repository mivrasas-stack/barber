import Redis, { type RedisOptions } from "ioredis";
import { env } from "@/shared/config/env";
import { sanitizeAndBoundError } from "../outbox/outbox-sanitizer";
import { JsonRedisLogger, type RedisLogger, SilentRedisLogger } from "./redis-logger";

export interface RedisHealthStatus {
  status: "healthy" | "unhealthy";
  latencyMs: number;
  error?: string;
}

// Global singletons across development hot-reloads
declare global {
  var __barber_redis_producer__: Redis | undefined;
  var __barber_redis_worker__: Redis | undefined;
  var __barber_redis_health__: Redis | undefined;
  var __barber_redis_subscriber__: Redis | undefined;
}

function parseBaseOptions(): RedisOptions {
  if (env.REDIS_URL && env.REDIS_URL.trim().length > 0) {
    try {
      const url = new URL(env.REDIS_URL);
      return {
        host: url.hostname || "localhost",
        port: url.port ? parseInt(url.port, 10) : 6379,
        username: url.username || undefined,
        password: url.password || undefined,
        tls: url.protocol === "rediss:" ? {} : undefined,
      };
    } catch {
      // Fallback if URL is malformed
    }
  }

  return {
    host: env.REDIS_HOST || "localhost",
    port: env.REDIS_PORT || 6379,
    password: env.REDIS_PASSWORD || undefined,
  };
}

function attachClientTelemetry(client: Redis, mode: string, logger: RedisLogger) {
  client.on("connect", () => {
    logger.info("redis_connected", { mode });
  });

  client.on("ready", () => {
    logger.info("redis_ready", { mode });
  });

  client.on("error", (err) => {
    logger.warn("redis_error", {
      mode,
      error: sanitizeAndBoundError(err),
    });
  });

  client.on("close", () => {
    logger.info("redis_closed", { mode });
  });

  client.on("reconnecting", (delay: number) => {
    logger.info("redis_reconnecting", { mode, delayMs: delay });
  });
}

/**
 * Returns a Redis client configured for Producer / Request-Path operations (Rate Limiting, fast checks).
 * Characteristics:
 * - fail quickly during outage (enableOfflineQueue: false)
 * - bounded connect and command timeouts (2000ms)
 * - low maxRetriesPerRequest (1)
 * - no infinite request hangs
 */
export function getRedisProducerClient(
  customOptions?: RedisOptions,
  logger: RedisLogger = new JsonRedisLogger()
): Redis {
  if (customOptions) {
    if (customOptions.keyPrefix) {
      throw new Error("ioredis keyPrefix must not be used with BullMQ or shared Redis factory");
    }
    const client = new Redis({
      ...parseBaseOptions(),
      enableOfflineQueue: false,
      connectTimeout: 2000,
      commandTimeout: 2000,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times <= 2 ? 100 : null),
      lazyConnect: false,
      ...customOptions,
    });
    attachClientTelemetry(client, "producer_custom", logger);
    return client;
  }

  if (global.__barber_redis_producer__) {
    return global.__barber_redis_producer__;
  }

  const client = new Redis({
    ...parseBaseOptions(),
    enableOfflineQueue: false,
    connectTimeout: 2000,
    commandTimeout: 2000,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times <= 2 ? 100 : null),
    lazyConnect: false,
  });

  attachClientTelemetry(client, "producer", logger);
  global.__barber_redis_producer__ = client;
  return client;
}

/**
 * Returns a Redis client configured for Background Worker operations (BullMQ Queue / Workers).
 * Characteristics:
 * - maxRetriesPerRequest must be null (mandatory BullMQ requirement)
 * - persistent exponential reconnect backoff with jitter and 30s cap
 * - enableOfflineQueue: true (allows queuing during brief blips)
 * - no keyPrefix
 */
export function getRedisWorkerClient(
  customOptions?: RedisOptions,
  logger: RedisLogger = new JsonRedisLogger()
): Redis {
  if (customOptions) {
    if (customOptions.keyPrefix) {
      throw new Error("ioredis keyPrefix must not be used with BullMQ or shared Redis factory");
    }
    const client = new Redis({
      ...parseBaseOptions(),
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      connectTimeout: 10000,
      retryStrategy: (times) => Math.min(times * 500 + Math.random() * 200, 30000),
      lazyConnect: false,
      ...customOptions,
    });
    attachClientTelemetry(client, "worker_custom", logger);
    return client;
  }

  if (global.__barber_redis_worker__) {
    return global.__barber_redis_worker__;
  }

  const client = new Redis({
    ...parseBaseOptions(),
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    retryStrategy: (times) => Math.min(times * 500 + Math.random() * 200, 30000),
    lazyConnect: false,
  });

  attachClientTelemetry(client, "worker", logger);
  global.__barber_redis_worker__ = client;
  return client;
}

/**
 * Returns a Redis client for Health / Admin probes.
 */
export function getRedisHealthClient(
  customOptions?: RedisOptions,
  logger: RedisLogger = new SilentRedisLogger()
): Redis {
  if (customOptions) {
    const client = new Redis({
      ...parseBaseOptions(),
      enableOfflineQueue: false,
      connectTimeout: 2000,
      commandTimeout: 2000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: false,
      ...customOptions,
    });
    attachClientTelemetry(client, "health_custom", logger);
    return client;
  }

  if (global.__barber_redis_health__) {
    return global.__barber_redis_health__;
  }

  const client = new Redis({
    ...parseBaseOptions(),
    enableOfflineQueue: false,
    connectTimeout: 2000,
    commandTimeout: 2000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    lazyConnect: false,
  });

  attachClientTelemetry(client, "health", logger);
  global.__barber_redis_health__ = client;
  return client;
}

/**
 * Returns a Redis client configured for Subscriptions / PubSub fanout.
 * Characteristics:
 * - maxRetriesPerRequest: null (needed for persistent long-lived pub/sub)
 * - enableOfflineQueue: true
 * - persistent reconnect backoff
 */
export function getRedisSubscriberClient(
  customOptions?: RedisOptions,
  logger: RedisLogger = new JsonRedisLogger()
): Redis {
  if (customOptions) {
    if (customOptions.keyPrefix) {
      throw new Error("ioredis keyPrefix must not be used with PubSub or shared Redis factory");
    }
    const client = new Redis({
      ...parseBaseOptions(),
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      connectTimeout: 10000,
      retryStrategy: (times) => Math.min(times * 500 + Math.random() * 200, 30000),
      lazyConnect: false,
      ...customOptions,
    });
    attachClientTelemetry(client, "subscriber_custom", logger);
    return client;
  }

  if (global.__barber_redis_subscriber__) {
    return global.__barber_redis_subscriber__;
  }

  const client = new Redis({
    ...parseBaseOptions(),
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    retryStrategy: (times) => Math.min(times * 500 + Math.random() * 200, 30000),
    lazyConnect: false,
  });

  attachClientTelemetry(client, "subscriber", logger);
  global.__barber_redis_subscriber__ = client;
  return client;
}

/**
 * Health check helper executing a bounded PING probe.
 */
export async function checkRedisHealth(
  client?: Redis,
  timeoutMs = 2000
): Promise<RedisHealthStatus> {
  const targetClient = client ?? getRedisHealthClient();
  const start = Date.now();

  try {
    // If client is currently establishing initial connection, wait for ready state
    if (
      targetClient.status === "connecting" ||
      targetClient.status === "connect" ||
      targetClient.status === "wait"
    ) {
      await new Promise<void>((resolve, reject) => {
        if (targetClient.status === "ready") return resolve();
        const onReady = () => {
          cleanup();
          resolve();
        };
        const onError = (e: unknown) => {
          cleanup();
          reject(e);
        };
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error("Timeout waiting for Redis connection ready"));
        }, timeoutMs);

        function cleanup() {
          targetClient.removeListener("ready", onReady);
          targetClient.removeListener("error", onError);
          clearTimeout(timer);
        }

        targetClient.once("ready", onReady);
        targetClient.once("error", onError);
      });
    }

    const remainingTimeout = Math.max(100, timeoutMs - (Date.now() - start));
    const pingPromise = targetClient.ping();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Redis health check timed out")), remainingTimeout);
    });

    const response = await Promise.race([pingPromise, timeoutPromise]);
    const latencyMs = Date.now() - start;

    if (response === "PONG") {
      return { status: "healthy", latencyMs };
    }

    return {
      status: "unhealthy",
      latencyMs,
      error: `Unexpected ping response: ${String(response)}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    return {
      status: "unhealthy",
      latencyMs,
      error: sanitizeAndBoundError(err),
    };
  }
}

/**
 * Cleanly disconnects and clears all active singleton clients.
 */
export async function closeRedisConnections(): Promise<void> {
  const clients = [
    global.__barber_redis_producer__,
    global.__barber_redis_worker__,
    global.__barber_redis_health__,
    global.__barber_redis_subscriber__,
  ].filter((c): c is Redis => Boolean(c));

  await Promise.all(
    clients.map(async (client) => {
      try {
        const quitPromise = client.quit();
        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            client.disconnect();
            resolve();
          }, 1000);
        });
        await Promise.race([quitPromise, timeoutPromise]);
      } catch {
        client.disconnect();
      }
    })
  );

  global.__barber_redis_producer__ = undefined;
  global.__barber_redis_worker__ = undefined;
  global.__barber_redis_health__ = undefined;
  global.__barber_redis_subscriber__ = undefined;
}
