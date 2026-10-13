import type { OutboxEnvelope } from "./types";

export type OutboxTransportResult =
  | { ok: true }
  | { ok: false; retryable: boolean; error: string };

export interface OutboxTransport {
  publish(
    envelope: OutboxEnvelope,
    signal?: AbortSignal
  ): Promise<OutboxTransportResult>;
}
