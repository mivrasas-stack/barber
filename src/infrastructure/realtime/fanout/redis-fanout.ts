import type Redis from "ioredis";
import { getRedisProducerClient, getRedisSubscriberClient } from "@/infrastructure/redis/redis-connection-factory";
import { JsonRealtimeLogger, type RealtimeLogger } from "../telemetry/realtime-logger";
import { RealtimeMetrics } from "../telemetry/realtime-metrics";
import { env } from "@/shared/config/env";
import type { RealtimeGateway } from "../gateway/realtime-gateway";
import type { ServerEventMessage } from "../protocol/types";

export interface RealtimeFanoutEnvelope {
  topic: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  occurredAt: string;
  publisherId?: string;
  tenantId?: string;
}

export interface RedisFanoutBroadcasterOptions {
  client?: Redis;
  channel?: string;
  logger?: RealtimeLogger;
  metrics?: RealtimeMetrics;
}

export class RedisFanoutBroadcaster {
  private readonly client: Redis;
  private readonly channel: string;
  private readonly logger: RealtimeLogger;
  private readonly metrics?: RealtimeMetrics;

  constructor(options: RedisFanoutBroadcasterOptions = {}) {
    this.client = options.client ?? getRedisProducerClient();
    this.channel = options.channel ?? env.REALTIME_FANOUT_CHANNEL;
    this.logger = options.logger ?? new JsonRealtimeLogger();
    this.metrics = options.metrics;
  }

  async publish(envelope: RealtimeFanoutEnvelope): Promise<{
    ok: boolean;
    subscribersCount?: number;
    error?: string;
  }> {
    if (!envelope || !envelope.topic || !envelope.eventId) {
      return { ok: false, error: "Invalid fanout envelope: missing topic or eventId" };
    }

    try {
      const serialized = JSON.stringify(envelope);
      const count = await this.client.publish(this.channel, serialized);
      this.logger.info("realtime_fanout_published", {
        topic: envelope.topic,
        eventId: envelope.eventId,
        subscribersCount: count,
      });
      return { ok: true, subscribersCount: count };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn("realtime_fanout_publish_failed", {
        topic: envelope.topic,
        eventId: envelope.eventId,
        error: errMsg,
      });
      if (this.metrics) {
        this.metrics.degradedEvent();
      }
      return { ok: false, error: errMsg };
    }
  }
}

export interface RedisFanoutSubscriberOptions {
  client?: Redis;
  channel?: string;
  logger?: RealtimeLogger;
  metrics?: RealtimeMetrics;
  onEnvelope?: (envelope: RealtimeFanoutEnvelope) => void;
}

export class RedisFanoutSubscriber {
  private readonly client: Redis;
  private readonly channel: string;
  private readonly logger: RealtimeLogger;
  private readonly metrics?: RealtimeMetrics;
  private onEnvelope?: (envelope: RealtimeFanoutEnvelope) => void;
  private isSubscribed = false;

  constructor(options: RedisFanoutSubscriberOptions = {}) {
    this.client = options.client ?? getRedisSubscriberClient();
    this.channel = options.channel ?? env.REALTIME_FANOUT_CHANNEL;
    this.logger = options.logger ?? new JsonRealtimeLogger();
    this.metrics = options.metrics;
    this.onEnvelope = options.onEnvelope;

    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    this.client.on("message", (channel, message) => {
      if (channel !== this.channel) return;

      try {
        const envelope: RealtimeFanoutEnvelope = JSON.parse(message);
        if (this.onEnvelope) {
          this.onEnvelope(envelope);
        }
      } catch (err: unknown) {
        this.logger.warn("realtime_fanout_decode_failed", {
          channel,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  async subscribe(onEnvelope?: (envelope: RealtimeFanoutEnvelope) => void): Promise<void> {
    if (onEnvelope) {
      this.onEnvelope = onEnvelope;
    }

    if (this.isSubscribed) return;

    try {
      await this.client.subscribe(this.channel);
      this.isSubscribed = true;
      this.logger.info("realtime_fanout_subscribed", { channel: this.channel });
    } catch (err: unknown) {
      this.logger.warn("realtime_fanout_subscribe_failed", {
        channel: this.channel,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Bridges this Redis subscriber directly to a RealtimeGateway instance.
   */
  bridgeToGateway(gateway: RealtimeGateway): void {
    this.onEnvelope = (envelope) => {
      const serverEvent: ServerEventMessage = {
        type: "event",
        topic: envelope.topic,
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        payload: envelope.payload,
        occurredAt: envelope.occurredAt,
      };

      gateway.deliverLocal(envelope.topic, serverEvent);
    };
  }

  async close(): Promise<void> {
    if (this.isSubscribed) {
      try {
        await this.client.unsubscribe(this.channel);
      } catch {
        // Ignore unsubscribe error on shutdown
      }
      this.isSubscribed = false;
    }
  }
}
