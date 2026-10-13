import { randomUUID } from "node:crypto";
import type {
  ExternalNotificationChannel,
  NotificationChannelProvider,
  NotificationProviderMessage,
  NotificationProviderResult,
} from "../domain/notification-channel-provider.interface";
import { sanitizeAndBoundError } from "@/infrastructure/outbox/outbox-sanitizer";

export interface FakeNotificationProviderOptions {
  name?: string;
  channels?: readonly ExternalNotificationChannel[];
  result?:
    | NotificationProviderResult
    | ((message: NotificationProviderMessage) => NotificationProviderResult);
  delayMs?: number;
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  if (signal?.aborted) {
    return Promise.reject(new Error("NOTIFICATION_PROVIDER_ABORTED"));
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, ms);

    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("NOTIFICATION_PROVIDER_ABORTED"));
    };

    function done() {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Deterministic provider test double.
 *
 * It never performs network I/O and keeps sent messages in memory so channel
 * workers can be certified before a production vendor is selected.
 */
export class FakeNotificationProvider implements NotificationChannelProvider {
  readonly name: string;
  readonly channels: readonly ExternalNotificationChannel[];
  readonly sentMessages: NotificationProviderMessage[] = [];
  private readonly configuredResult?: FakeNotificationProviderOptions["result"];
  private readonly delayMs: number;

  constructor(options: FakeNotificationProviderOptions = {}) {
    this.name = options.name ?? "FAKE";
    this.channels = options.channels ?? ["EMAIL", "SMS", "WHATSAPP"];
    this.configuredResult = options.result;
    this.delayMs = options.delayMs ?? 0;
  }

  supports(channel: ExternalNotificationChannel): boolean {
    return this.channels.includes(channel);
  }

  async send(
    message: NotificationProviderMessage,
    signal?: AbortSignal
  ): Promise<NotificationProviderResult> {
    if (!this.supports(message.channel)) {
      return {
        ok: false,
        retryable: false,
        error: "NOTIFICATION_CHANNEL_NOT_SUPPORTED",
        provider: this.name,
      };
    }

    try {
      await abortableDelay(this.delayMs, signal);
    } catch (error) {
      return {
        ok: false,
        retryable: true,
        error: sanitizeAndBoundError(error, 1000),
        provider: this.name,
      };
    }

    if (signal?.aborted) {
      return {
        ok: false,
        retryable: true,
        error: "NOTIFICATION_PROVIDER_ABORTED",
        provider: this.name,
      };
    }

    this.sentMessages.push({
      ...message,
      data: Object.freeze({ ...message.data }),
    });

    if (this.configuredResult) {
      return typeof this.configuredResult === "function"
        ? this.configuredResult(message)
        : this.configuredResult;
    }

    return {
      ok: true,
      provider: this.name,
      providerMessageId: `fake_${message.deliveryId || randomUUID()}`,
    };
  }

  reset(): void {
    this.sentMessages.length = 0;
  }
}
