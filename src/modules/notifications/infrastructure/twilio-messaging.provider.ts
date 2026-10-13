import type {
  ExternalNotificationChannel,
  NotificationChannelProvider,
  NotificationProviderMessage,
  NotificationProviderResult,
} from "../domain/notification-channel-provider.interface";
import { sanitizeAndBoundError } from "@/infrastructure/outbox/outbox-sanitizer";

export interface TwilioMessagingProviderOptions {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  smsFrom?: string;
  whatsappFrom?: string;
  endpointBase?: string;
  fetchFn?: typeof fetch;
}

export class TwilioMessagingProvider implements NotificationChannelProvider {
  readonly name = "TWILIO";
  readonly channels: readonly ExternalNotificationChannel[];

  private readonly accountSid: string;
  private readonly apiKeySid: string;
  private readonly apiKeySecret: string;
  private readonly smsFrom?: string;
  private readonly whatsappFrom?: string;
  private readonly endpointBase: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: TwilioMessagingProviderOptions) {
    this.accountSid = options.accountSid.trim();
    this.apiKeySid = options.apiKeySid.trim();
    this.apiKeySecret = options.apiKeySecret.trim();
    this.smsFrom = options.smsFrom?.trim() || undefined;
    this.whatsappFrom = options.whatsappFrom?.trim() || undefined;
    this.endpointBase =
      options.endpointBase ?? "https://api.twilio.com/2010-04-01";
    this.fetchFn = options.fetchFn ?? fetch;

    if (!this.accountSid) throw new Error("TWILIO_ACCOUNT_SID_REQUIRED");
    if (!this.apiKeySid) throw new Error("TWILIO_API_KEY_SID_REQUIRED");
    if (!this.apiKeySecret) throw new Error("TWILIO_API_KEY_SECRET_REQUIRED");

    const channels: ExternalNotificationChannel[] = [];
    if (this.smsFrom) channels.push("SMS");
    if (this.whatsappFrom) channels.push("WHATSAPP");
    if (channels.length === 0) {
      throw new Error("TWILIO_SENDER_REQUIRED");
    }
    this.channels = channels;
  }

  supports(channel: ExternalNotificationChannel): boolean {
    return this.channels.includes(channel);
  }

  async send(
    message: NotificationProviderMessage,
    signal?: AbortSignal
  ): Promise<NotificationProviderResult> {
    if (message.channel !== "SMS" && message.channel !== "WHATSAPP") {
      return {
        ok: false,
        retryable: false,
        error: "TWILIO_CHANNEL_NOT_SUPPORTED",
        provider: this.name,
      };
    }

    if (!this.supports(message.channel)) {
      return {
        ok: false,
        retryable: false,
        error: "TWILIO_SENDER_NOT_CONFIGURED",
        provider: this.name,
      };
    }

    const from =
      message.channel === "WHATSAPP"
        ? normalizeWhatsAppAddress(this.whatsappFrom!)
        : this.smsFrom!;
    const to =
      message.channel === "WHATSAPP"
        ? normalizeWhatsAppAddress(message.destination)
        : message.destination;

    const form = new URLSearchParams();
    form.set("From", from);
    form.set("To", to);
    form.set("Body", message.rendered.text);

    const auth = Buffer.from(
      `${this.apiKeySid}:${this.apiKeySecret}`,
      "utf8"
    ).toString("base64");

    try {
      const response = await this.fetchFn(
        `${this.endpointBase}/Accounts/${encodeURIComponent(
          this.accountSid
        )}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: form.toString(),
          signal,
        }
      );

      let payload: Record<string, unknown> = {};
      try {
        payload = (await response.json()) as Record<string, unknown>;
      } catch {
        payload = {};
      }

      if (response.ok) {
        const sid = typeof payload.sid === "string" ? payload.sid : "";
        if (!sid) {
          return {
            ok: false,
            retryable: false,
            error: "TWILIO_RESPONSE_MISSING_SID",
            provider: this.name,
          };
        }
        return {
          ok: true,
          provider: this.name,
          providerMessageId: sid,
        };
      }

      const code =
        typeof payload.code === "number" || typeof payload.code === "string"
          ? String(payload.code).slice(0, 32)
          : "";
      const retryable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;

      return {
        ok: false,
        retryable,
        error: `TWILIO_HTTP_${response.status}${code ? `:${code}` : ""}`,
        provider: this.name,
      };
    } catch (error) {
      const messageText = sanitizeAndBoundError(error, 500);
      const aborted =
        signal?.aborted ||
        messageText.toLowerCase().includes("abort") ||
        messageText.toLowerCase().includes("timeout");
      return {
        ok: false,
        retryable: true,
        error: aborted ? "TWILIO_REQUEST_ABORTED" : "TWILIO_NETWORK_ERROR",
        provider: this.name,
      };
    }
  }
}

function normalizeWhatsAppAddress(value: string): string {
  const trimmed = value.trim();
  return trimmed.toLowerCase().startsWith("whatsapp:")
    ? trimmed
    : `whatsapp:${trimmed}`;
}
