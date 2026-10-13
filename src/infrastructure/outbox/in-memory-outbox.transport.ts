import type { OutboxTransport, OutboxTransportResult } from "./outbox-transport.interface";
import type { OutboxEnvelope } from "./types";

export type InMemoryTransportHandler = (
  envelope: OutboxEnvelope,
  signal?: AbortSignal
) => Promise<OutboxTransportResult> | OutboxTransportResult;

export class InMemoryOutboxTransport implements OutboxTransport {
  readonly delivered: OutboxEnvelope[] = [];

  constructor(private readonly handler?: InMemoryTransportHandler) {}

  async publish(
    envelope: OutboxEnvelope,
    signal?: AbortSignal
  ): Promise<OutboxTransportResult> {
    if (signal?.aborted) {
      return { ok: false, retryable: true, error: "OUTBOX_PUBLISH_ABORTED" };
    }

    const result = this.handler ? await this.handler(envelope, signal) : { ok: true as const };
    if (result.ok) {
      this.delivered.push(envelope);
    }
    return result;
  }

  clear(): void {
    this.delivered.length = 0;
  }
}
