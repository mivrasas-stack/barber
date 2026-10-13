import { closeRedisConnections } from "@/infrastructure/redis/redis-connection-factory";
import { env } from "@/shared/config/env";
import { sanitizeAndBoundError } from "@/infrastructure/outbox/outbox-sanitizer";
import { NotificationDeliveryWorker } from "@/modules/notifications/application/notification-delivery-worker";
import { PrepareNotificationDeliveryUseCase } from "@/modules/notifications/application/prepare-notification-delivery.usecase";
import {
  JsonNotificationLogger,
} from "@/modules/notifications/infrastructure/notification-logger";
import {
  OutboxNotificationBridge,
} from "@/modules/notifications/infrastructure/outbox-notification-bridge";
import { DrizzleNotificationDeliveryRepository } from "@/modules/notifications/infrastructure/drizzle-notification-delivery.repository";
import { DrizzleNotificationDestinationResolver } from "@/modules/notifications/infrastructure/drizzle-notification-destination.resolver";
import { DrizzleNotificationRepository } from "@/modules/notifications/infrastructure/drizzle-notification.repository";
import { DrizzleNotificationSuppressionRepository } from "@/modules/notifications/infrastructure/drizzle-notification-suppression.repository";
import { TransactionalNotificationTemplateRenderer } from "@/modules/notifications/infrastructure/transactional-notification-template.renderer";
import { createConfiguredNotificationProviders } from "@/modules/notifications/infrastructure/notification-provider.factory";
import type { ExternalNotificationChannel } from "@/modules/notifications/domain/notification-channel-provider.interface";

export interface NotificationWorkerRuntime {
  bridge: OutboxNotificationBridge;
  deliveryWorker: NotificationDeliveryWorker | null;
  shutdown(): Promise<void>;
}

export async function bootstrapNotificationWorker(): Promise<NotificationWorkerRuntime> {
  const logger = new JsonNotificationLogger();
  const bridge = new OutboxNotificationBridge({
    logger,
    concurrency: env.NOTIFICATION_WORKER_CONCURRENCY,
    autoStart: true,
  });

  const deliveryController = new AbortController();
  let deliveryWorker: NotificationDeliveryWorker | null = null;
  let deliveryTask: Promise<void> | null = null;

  try {
    if (env.NOTIFICATION_DELIVERY_ENABLED) {
      const providers = createConfiguredNotificationProviders({
        resendApiKey: env.RESEND_API_KEY,
        resendFromEmail: env.RESEND_FROM_EMAIL,
        twilioAccountSid: env.TWILIO_ACCOUNT_SID,
        twilioApiKeySid: env.TWILIO_API_KEY_SID,
        twilioApiKeySecret: env.TWILIO_API_KEY_SECRET,
        twilioSmsFrom: env.TWILIO_SMS_FROM,
        twilioWhatsappFrom: env.TWILIO_WHATSAPP_FROM,
      });

      if (providers.length === 0) {
        throw new Error("NOTIFICATION_DELIVERY_ENABLED_WITHOUT_PROVIDER");
      }

      const channels = [
        ...new Set(providers.flatMap((provider) => provider.channels)),
      ] as ExternalNotificationChannel[];

      const notificationRepository = new DrizzleNotificationRepository();
      const deliveryRepository = new DrizzleNotificationDeliveryRepository();
      const prepareDelivery = new PrepareNotificationDeliveryUseCase(
        notificationRepository,
        new DrizzleNotificationDestinationResolver(),
        new DrizzleNotificationSuppressionRepository()
      );

      deliveryWorker = new NotificationDeliveryWorker(
        deliveryRepository,
        prepareDelivery,
        new TransactionalNotificationTemplateRenderer(),
        providers,
        {
          workerId: `notifications-${process.pid}`,
          batchSize: env.NOTIFICATION_DELIVERY_BATCH_SIZE,
          leaseDurationMs: env.NOTIFICATION_DELIVERY_LEASE_DURATION_MS,
          pollIntervalMs: env.NOTIFICATION_DELIVERY_POLL_INTERVAL_MS,
          sendTimeoutMs: env.NOTIFICATION_DELIVERY_SEND_TIMEOUT_MS,
          channels,
          logger,
        }
      );

      deliveryTask = deliveryWorker.run(deliveryController.signal).catch((error) => {
        logger.error("notification_delivery_worker_failed", {
          error: sanitizeAndBoundError(error, 1000),
        });
        process.exitCode = 1;
      });

      logger.info("notification_delivery_worker_started", {
        channels,
        batchSize: env.NOTIFICATION_DELIVERY_BATCH_SIZE,
        leaseDurationMs: env.NOTIFICATION_DELIVERY_LEASE_DURATION_MS,
        sendTimeoutMs: env.NOTIFICATION_DELIVERY_SEND_TIMEOUT_MS,
      });
    } else {
      logger.info("notification_delivery_worker_disabled");
    }
  } catch (error) {
    await bridge.close();
    await closeRedisConnections();
    throw error;
  }

  let shutdownPromise: Promise<void> | null = null;

  const shutdown = async () => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      logger.info("notification_runtime_shutting_down", {
        queueName: bridge.queueName,
        deliveryEnabled: Boolean(deliveryWorker),
      });

      deliveryController.abort();

      try {
        if (deliveryTask) {
          await deliveryTask;
        }
        await bridge.close();
      } finally {
        await closeRedisConnections();
      }

      logger.info("notification_runtime_stopped", {
        queueName: bridge.queueName,
      });
    })();

    return shutdownPromise;
  };

  logger.info("notification_runtime_started", {
    queueName: bridge.queueName,
    concurrency: env.NOTIFICATION_WORKER_CONCURRENCY,
    deliveryEnabled: Boolean(deliveryWorker),
  });

  return {
    bridge,
    deliveryWorker,
    shutdown,
  };
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  bootstrapNotificationWorker()
    .then(({ shutdown }) => {
      const onSignal = async (signal: string) => {
        console.info(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "INFO",
            component: "notification-worker",
            message: "notification_runtime_signal_received",
            signal,
          })
        );
        await shutdown();
        process.exit(process.exitCode ?? 0);
      };

      process.on("SIGINT", () => {
        void onSignal("SIGINT");
      });
      process.on("SIGTERM", () => {
        void onSignal("SIGTERM");
      });
    })
    .catch((error) => {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "ERROR",
          component: "notification-worker",
          message: "notification_runtime_bootstrap_failed",
          error: sanitizeAndBoundError(error, 1000),
        })
      );
      process.exit(1);
    });
}
