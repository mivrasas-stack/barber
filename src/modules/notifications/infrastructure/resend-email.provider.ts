import type {
  NotificationChannelProvider,
  NotificationProviderMessage,
  NotificationProviderResult,
} from "../domain/notification-channel-provider.interface";
import { sanitizeAndBoundError } from "@/infrastructure/outbox/outbox-sanitizer";

export interface ResendEmailProviderOptions {
  apiKey: string;
  from: string;
  endpoint?: string;
  fetchFn?: typeof fetch;
}

export class ResendEmailProvider implements NotificationChannelProvider {
  readonly name = "RESEND";
  readonly channels = ["EMAIL"] as const;

  private readonly apiKey: string;
  private readonly from: string;
  private readonly endpoint: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: ResendEmailProviderOptions) {
    this.apiKey = options.apiKey.trim();
    this.from = options.from.trim();
    this.endpoint = options.endpoint ?? "https://api.resend.com/emails";
    this.fetchFn = options.fetchFn ?? fetch;

    if (!this.apiKey) throw new Error("RESEND_API_KEY_REQUIRED");
    if (!this.from) throw new Error("RESEND_FROM_REQUIRED");
  }

  supports(channel: NotificationProviderMessage["channel"]): boolean {
    return channel === "EMAIL";
  }

  async send(
    message: NotificationProviderMessage,
    signal?: AbortSignal
  ): Promise<NotificationProviderResult> {
    if (message.channel !== "EMAIL") {
      return {
        ok: false,
        retryable: false,
        error: "RESEND_CHANNEL_NOT_SUPPORTED",
        provider: this.name,
      };
    }

    const body = {
      from: this.from,
      to: [message.destination],
      subject: message.rendered.subject ?? message.templateKey,
      text: message.rendered.text,
      html: message.rendered.html,
    };

    try {
      const response = await this.fetchFn(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey.slice(0, 256),
        },
        body: JSON.stringify(body),
        signal,
      });

      let payload: Record<string, unknown> = {};
      try {
        payload = (await response.json()) as Record<string, unknown>;
      } catch {
        payload = {};
      }

      if (response.ok) {
        const id = typeof payload.id === "string" ? payload.id : "";
        if (!id) {
          return {
            ok: false,
            retryable: true,
            error: "RESEND_RESPONSE_MISSING_ID",
            provider: this.name,
          };
        }
        return {
          ok: true,
          provider: this.name,
          providerMessageId: id,
        };
      }

      const errorName =
        typeof payload.name === "string" ? payload.name.slice(0, 100) : "";
      const retryable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500 ||
        (response.status === 409 &&
          errorName === "concurrent_idempotent_requests");

      return {
        ok: false,
        retryable,
        error: `RESEND_HTTP_${response.status}${
          errorName ? `:${errorName}` : ""
        }`,
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
        error: aborted ? "RESEND_REQUEST_ABORTED" : "RESEND_NETWORK_ERROR",
        provider: this.name,
      };
    }
  }
}
