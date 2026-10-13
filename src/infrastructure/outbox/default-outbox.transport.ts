import { env } from "@/shared/config/env";
import { BullMQOutboxTransport } from "@/infrastructure/redis/bullmq-outbox.transport";
import { FanoutOutboxTransport } from "./fanout-outbox.transport";

export interface DefaultOutboxTransportBundle {
  transport: FanoutOutboxTransport;
  realtimeTransport: BullMQOutboxTransport;
  notificationTransport: BullMQOutboxTransport;
  close(): Promise<void>;
}

/**
 * Production composition for durable domain-event distribution.
 *
 * Realtime and Notifications receive independent BullMQ jobs so their workers
 * never compete for the same queue item.
 */
export function createDefaultOutboxTransportBundle(): DefaultOutboxTransportBundle {
  if (env.REDIS_REALTIME_QUEUE_NAME === env.REDIS_NOTIFICATION_QUEUE_NAME) {
    throw new Error("OUTBOX_TARGET_QUEUE_NAMES_MUST_DIFFER");
  }
  const realtimeTransport = new BullMQOutboxTransport({
    queueName: env.REDIS_REALTIME_QUEUE_NAME,
    prefix: env.REDIS_QUEUE_PREFIX,
    processing: {
      attempts: 1,
    },
  });

  const notificationTransport = new BullMQOutboxTransport({
    queueName: env.REDIS_NOTIFICATION_QUEUE_NAME,
    prefix: env.REDIS_QUEUE_PREFIX,
    processing: {
      attempts: 8,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  });

  const transport = new FanoutOutboxTransport([
    {
      name: "realtime",
      transport: realtimeTransport,
    },
    {
      name: "notifications",
      transport: notificationTransport,
    },
  ]);

  return {
    transport,
    realtimeTransport,
    notificationTransport,
    async close() {
      await Promise.all([
        realtimeTransport.close(),
        notificationTransport.close(),
      ]);
    },
  };
}

