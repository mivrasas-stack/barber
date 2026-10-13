import type { NotificationChannel } from "./notification";

type ExternalNotificationChannel = Exclude<NotificationChannel, "IN_APP">;

export interface RenderNotificationTemplateInput {
  channel: ExternalNotificationChannel;
  templateKey: string;
  templateVersion: number;
  locale: string;
  data: Readonly<Record<string, unknown>>;
}

export interface RenderedNotificationTemplate {
  subject?: string;
  text: string;
  html?: string;
}

export interface NotificationTemplateRenderer {
  render(
    input: RenderNotificationTemplateInput
  ): Promise<RenderedNotificationTemplate>;
}
