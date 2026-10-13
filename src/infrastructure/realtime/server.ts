import http from "http";
import { RealtimeGateway } from "./gateway/realtime-gateway";
import { DatabaseRealtimeAuthenticator } from "./auth/realtime-authenticator";
import { DatabaseTopicAuthorizer } from "./authorization/topic-authorizer";
import { RedisPresenceTracker } from "./presence/redis-presence";
import { RedisFanoutSubscriber } from "./fanout/redis-fanout";
import { OutboxRealtimeBridge } from "./bridge/outbox-realtime-bridge";
import { checkRedisHealth, closeRedisConnections } from "@/infrastructure/redis/redis-connection-factory";
import { JsonRealtimeLogger } from "./telemetry/realtime-logger";
import { RealtimeMetrics } from "./telemetry/realtime-metrics";
import { RedisTokenBucketRateLimiter } from "@/infrastructure/security/redis-token-bucket.rate-limiter";
import { env } from "@/shared/config/env";

import { SilentRedisLogger } from "@/infrastructure/redis/redis-logger";

export async function bootstrapRealtimeServer(customPort?: number) {
  const port = customPort ?? env.REALTIME_PORT;
  const logger = new JsonRealtimeLogger();
  const metrics = new RealtimeMetrics();
  const rateLimiter = new RedisTokenBucketRateLimiter({ logger: new SilentRedisLogger() });

  const authenticator = new DatabaseRealtimeAuthenticator({ rateLimiter });
  const topicAuthorizer = new DatabaseTopicAuthorizer();
  const presenceTracker = new RedisPresenceTracker({ logger });

  const server = http.createServer(async (req, res) => {
    const url = req.url || "/";

    if (req.method === "GET" && url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "healthy",
          uptime: process.uptime(),
          metrics: metrics.getSnapshot(),
        })
      );
      return;
    }

    if (req.method === "GET" && url === "/ready") {
      const redisStatus = await checkRedisHealth();
      if (redisStatus.status === "healthy") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ready", redis: "healthy" }));
      } else {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "unready", redis: redisStatus }));
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  });

  const gateway = new RealtimeGateway({
    server,
    authenticator,
    topicAuthorizer,
    logger,
    metrics,
    onPresenceConnect: (s) => presenceTracker.recordConnect(s),
    onPresenceHeartbeat: (s) => presenceTracker.recordHeartbeat(s),
    onPresenceDisconnect: (s) => presenceTracker.recordDisconnect(s),
  });

  // Attach Redis Fanout Subscriber to gateway
  const subscriber = new RedisFanoutSubscriber({ logger, metrics });
  subscriber.bridgeToGateway(gateway);
  await subscriber.subscribe();

  // Attach BullMQ Outbox Bridge
  const bridge = new OutboxRealtimeBridge({ logger, metrics, autoStart: true });

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      logger.info("realtime_gateway_started", { port, env: env.NODE_ENV });
      resolve();
    });
  });

  const shutdown = async () => {
    logger.info("realtime_gateway_shutting_down");
    await bridge.close();
    await subscriber.close();
    await gateway.close(5000);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeRedisConnections();
    logger.info("realtime_gateway_stopped");
  };

  return {
    server,
    gateway,
    subscriber,
    bridge,
    presenceTracker,
    metrics,
    shutdown,
  };
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  bootstrapRealtimeServer().then(({ shutdown }) => {
    const onSignal = async (sig: string) => {
      console.log(`Received ${sig}, initiating graceful shutdown...`);
      await shutdown();
      process.exit(0);
    };

    process.on("SIGINT", () => onSignal("SIGINT"));
    process.on("SIGTERM", () => onSignal("SIGTERM"));
  }).catch((err) => {
    console.error("Fatal error starting Realtime Gateway:", err);
    process.exit(1);
  });
}
