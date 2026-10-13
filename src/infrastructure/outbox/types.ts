import type { OutboxEventRow } from "@/infrastructure/database/schema/outbox";

export interface OutboxEnvelope<TPayload = unknown> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  tenantId: string;
  locationId: string | null;
  aggregateId: string;
  occurredAt: string;
  payload: TPayload;
  deliveryAttempt: number;
}

export interface ClaimBatchInput {
  workerId: string;
  batchSize: number;
  leaseDurationMs: number;
  publishFrom: Date;
  now?: Date;
}

export interface ClaimBatchResult {
  events: OutboxEventRow[];
  recoveredExpiredLeases: number;
  deadLetteredExpiredLeases: number;
}

export interface MarkFailedInput {
  id: string;
  workerId: string;
  error: string;
  retryable: boolean;
  nextAttemptAt: Date;
  now?: Date;
}

export type SettleResult =
  | "PUBLISHED"
  | "RETRY_SCHEDULED"
  | "DEAD_LETTER"
  | "LEASE_LOST";

export interface OutboxProcessResult {
  eventId: string;
  result: SettleResult;
  errorCategory?: string;
  error?: string;
}

export interface OutboxBatchResult {
  workerId: string;
  claimed: number;
  published: number;
  retryScheduled: number;
  deadLettered: number;
  leaseLost: number;
  recoveredExpiredLeases: number;
  deadLetteredExpiredLeases: number;
  durationMs: number;
  oldestClaimedAgeMs: number | null;
  errorCategories: Record<string, number>;
}
