import type {
  OutboxTransport,
  OutboxTransportResult,
} from "./outbox-transport.interface";
import type { OutboxEnvelope } from "./types";
import { sanitizeAndBoundError } from "./outbox-sanitizer";

export interface FanoutOutboxTarget {
  name: string;
  transport: OutboxTransport;
}

/**
 * Publishes the same durable outbox envelope to multiple independent transports.
 *
 * This is intentionally at-least-once. If one target succeeds and another
 * transiently fails, PostgreSQL may retry the source event and successful
 * targets must therefore remain idempotent on eventId.
 */
export class FanoutOutboxTransport implements OutboxTransport {
  readonly targets: readonly FanoutOutboxTarget[];

  constructor(targets: readonly FanoutOutboxTarget[]) {
    if (targets.length === 0) {
      throw new Error("OUTBOX_FANOUT_TARGET_REQUIRED");
    }

    const names = new Set<string>();
    this.targets = targets.map((target) => {
      const name = target.name.trim();
      if (!name) {
        throw new Error("OUTBOX_FANOUT_TARGET_NAME_REQUIRED");
      }
      if (names.has(name)) {
        throw new Error(`OUTBOX_FANOUT_DUPLICATE_TARGET:${name}`);
      }
      names.add(name);

      return {
        name,
        transport: target.transport,
      };
    });
  }

  async publish(
    envelope: OutboxEnvelope,
    signal?: AbortSignal
  ): Promise<OutboxTransportResult> {
    const results = await Promise.all(
      this.targets.map(async (target) => {
        try {
          const result = await target.transport.publish(envelope, signal);
          return { target: target.name, result };
        } catch (error) {
          return {
            target: target.name,
            result: {
              ok: false as const,
              retryable: true,
              error: sanitizeAndBoundError(error),
            },
          };
        }
      })
    );

    const failures = results.filter(
      (entry): entry is {
        target: string;
        result: { ok: false; retryable: boolean; error: string };
      } => !entry.result.ok
    );

    if (failures.length === 0) {
      return { ok: true };
    }

    // A permanent failure must remain permanent. Otherwise the PostgreSQL
    // outbox would retry the entire fanout until exhaustion even though a
    // target has explicitly classified the envelope/configuration as invalid.
    const retryable = failures.every((entry) => entry.result.retryable);

    const error = sanitizeAndBoundError(
      failures
        .map(
          (entry) =>
            `${entry.target}:${sanitizeAndBoundError(entry.result.error, 1000)}`
        )
        .join(" | ")
    );

    return {
      ok: false,
      retryable,
      error,
    };
  }
}
