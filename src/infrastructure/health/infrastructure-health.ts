import { pool } from "@/infrastructure/database/client";
import { checkRedisHealth, getRedisWorkerClient } from "../redis/redis-connection-factory";
import { sanitizeAndBoundError } from "../outbox/outbox-sanitizer";

export type ComponentHealthStatus = "healthy" | "unhealthy";
export type OverallHealthStatus = "healthy" | "degraded" | "unhealthy";

export interface ComponentHealth {
  status: ComponentHealthStatus;
  latencyMs: number;
  error?: string;
}

export interface InfrastructureHealthReport {
  overall: OverallHealthStatus;
  timestamp: string;
  postgres: ComponentHealth;
  redis: ComponentHealth;
  queueProducer: ComponentHealth;
}

export async function checkPostgresHealth(timeoutMs = 2000): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const queryPromise = pool.query("SELECT 1 AS alive");
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("PostgreSQL health check timed out")), timeoutMs);
    });

    await Promise.race([queryPromise, timeoutPromise]);
    return {
      status: "healthy",
      latencyMs: Date.now() - start,
    };
  } catch (err: unknown) {
    return {
      status: "unhealthy",
      latencyMs: Date.now() - start,
      error: sanitizeAndBoundError(err),
    };
  }
}

export async function checkQueueProducerHealth(timeoutMs = 2000): Promise<ComponentHealth> {
  const res = await checkRedisHealth(getRedisWorkerClient(), timeoutMs);
  return {
    status: res.status,
    latencyMs: res.latencyMs,
    error: res.error,
  };
}

export async function checkInfrastructureHealth(): Promise<InfrastructureHealthReport> {
  const [postgres, redis, queueProducer] = await Promise.all([
    checkPostgresHealth(),
    checkRedisHealth(),
    checkQueueProducerHealth(),
  ]);

  let overall: OverallHealthStatus = "healthy";

  if (postgres.status === "unhealthy") {
    // Database outage is fatal to transactional correctness
    overall = "unhealthy";
  } else if (redis.status === "unhealthy" || queueProducer.status === "unhealthy") {
    // Ephemeral delivery outage degrades operations without corrupting database state
    overall = "degraded";
  }

  return {
    overall,
    timestamp: new Date().toISOString(),
    postgres,
    redis,
    queueProducer,
  };
}
