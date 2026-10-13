import type { NotificationChannel } from "./notification";
import type { RenderedNotificationTemplate } from "./notification-template-renderer.interface";

export type ExternalNotificationChannel = Exclude<
  NotificationChannel,
  "IN_APP"
>;

export interface NotificationProviderMessage {
  deliveryId: string;
  idempotencyKey: string;
  channel: ExternalNotificationChannel;
  destination: string;
  templateKey: string;
  templateVersion: number;
  locale: string;
  timezone: string;
  data: Readonly<Record<string, unknown>>;
  rendered: RenderedNotificationTemplate;
}

export type NotificationProviderResult =
  | {
      ok: true;
      provider: string;
      providerMessageId: string;
    }
  | {
      ok: false;
      retryable: boolean;
      error: string;
      provider: string;
    };

export interface NotificationChannelProvider {
  readonly name: string;
  readonly channels: readonly ExternalNotificationChannel[];

  supports(channel: ExternalNotificationChannel): boolean;

  send(
    message: NotificationProviderMessage,
    signal?: AbortSignal
  ): Promise<NotificationProviderResult>;
}
