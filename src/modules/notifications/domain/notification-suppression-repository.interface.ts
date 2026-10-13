import type { ExternalNotificationChannel } from "./notification-channel-provider.interface";

export interface NotificationSuppressionInput {
  channel: ExternalNotificationChannel;
  destinationHash: string;
  reason: string;
  source: string;
  expiresAt?: Date | null;
  now?: Date;
}

export interface NotificationSuppressionRepository {
  isSuppressed(
    channel: ExternalNotificationChannel,
    destinationHash: string,
    now?: Date
  ): Promise<boolean>;

  suppress(input: NotificationSuppressionInput): Promise<void>;

  remove(
    channel: ExternalNotificationChannel,
    destinationHash: string
  ): Promise<boolean>;
}
