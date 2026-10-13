import type { Pool } from "pg";
import { pool } from "@/infrastructure/database/client";
import type { OutboxEventRow } from "@/infrastructure/database/schema/outbox";
import type { OutboxRepository } from "./outbox-repository.interface";
import type {
  ClaimBatchInput,
  ClaimBatchResult,
  MarkFailedInput,
  SettleResult,
} from "./types";
import { sanitizeAndBoundError } from "./outbox-sanitizer";

interface RawOutboxRow {
  id: string;
  event_id: string;
  event_type: string;
  event_version: number;
  tenant_id: string;
  location_id: string | null;
  aggregate_id: string;
  occurred_at: Date;
  payload: unknown;
  status: string;
  attempts: number;
  max_attempts: number;
  next_attempt_at: Date;
  locked_at: Date | null;
  locked_by: string | null;
  lock_expires_at: Date | null;
  published_at: Date | null;
  failed_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

function toOutboxRow(row: RawOutboxRow): OutboxEventRow {
  return {
    id: row.id,
    eventId: row.event_id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    aggregateId: row.aggregate_id,
    occurredAt: row.occurred_at,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextAttemptAt: row.next_attempt_at,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    lockExpiresAt: row.lock_expires_at,
    publishedAt: row.published_at,
    failedAt: row.failed_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DrizzleOutboxRepository implements OutboxRepository {
  constructor(private readonly pgPool: Pool = pool) {}

  async claimBatch(input: ClaimBatchInput): Promise<ClaimBatchResult> {
    if (!input.workerId || !input.workerId.trim()) {
      throw new Error("OUTBOX_WORKER_ID_REQUIRED");
    }
    if (!Number.isInteger(input.batchSize) || input.batchSize <= 0 || input.batchSize > 500) {
      throw new Error("OUTBOX_BATCH_SIZE_INVALID");
    }
    if (!Number.isFinite(input.leaseDurationMs) || input.leaseDurationMs < 100) {
      throw new Error("OUTBOX_LEASE_DURATION_INVALID");
    }
    if (!(input.publishFrom instanceof Date) || Number.isNaN(input.publishFrom.getTime())) {
      throw new Error("OUTBOX_PUBLISH_FROM_REQUIRED");
    }

    const now = input.now ?? new Date();
    const lockExpiresAt = new Date(now.getTime() + input.leaseDurationMs);
    const client = await this.pgPool.connect();

    try {
      await client.query("BEGIN");

      // 1. Transition expired leases that already reached max_attempts to DEAD_LETTER
      const exhausted = await client.query(
        `WITH expired_exhausted AS (
           SELECT id
           FROM outbox_events
           WHERE status = 'PROCESSING'
             AND lock_expires_at <= $1::timestamptz
             AND attempts >= max_attempts
             AND occurred_at >= $2::timestamptz
           LIMIT $3::int
           FOR UPDATE SKIP LOCKED
         )
         UPDATE outbox_events AS event
         SET status = 'DEAD_LETTER',
             failed_at = $1::timestamptz,
             last_error = COALESCE(event.last_error, 'Worker lease expired after final delivery attempt'),
             locked_at = NULL,
             locked_by = NULL,
             lock_expires_at = NULL,
             updated_at = $1::timestamptz
         FROM expired_exhausted
         WHERE event.id = expired_exhausted.id`,
        [now, input.publishFrom, input.batchSize]
      );

      // 2. Recover expired leases that still have retry attempts remaining
      const recovered = await client.query(
        `WITH expired_recoverable AS (
           SELECT id
           FROM outbox_events
           WHERE status = 'PROCESSING'
             AND lock_expires_at <= $1::timestamptz
             AND attempts < max_attempts
             AND occurred_at >= $2::timestamptz
           LIMIT $3::int
           FOR UPDATE SKIP LOCKED
         )
         UPDATE outbox_events AS event
         SET status = 'FAILED',
             next_attempt_at = $1::timestamptz,
             last_error = COALESCE(event.last_error, 'Worker lease expired before settlement'),
             locked_at = NULL,
             locked_by = NULL,
             lock_expires_at = NULL,
             updated_at = $1::timestamptz
         FROM expired_recoverable
         WHERE event.id = expired_recoverable.id`,
        [now, input.publishFrom, input.batchSize]
      );

      // 3. Atomically claim due events (PENDING or retryable FAILED) using FOR UPDATE SKIP LOCKED
      const claimed = await client.query<RawOutboxRow>(
        `WITH claimable AS (
           SELECT id
           FROM outbox_events
           WHERE status IN ('PENDING', 'FAILED')
             AND attempts < max_attempts
             AND next_attempt_at <= $1::timestamptz
             AND occurred_at >= $2::timestamptz
           ORDER BY occurred_at ASC, id ASC
           LIMIT $3::int
           FOR UPDATE SKIP LOCKED
         )
         UPDATE outbox_events AS event
         SET status = 'PROCESSING',
             attempts = event.attempts + 1,
             locked_at = $1::timestamptz,
             locked_by = $4::varchar,
             lock_expires_at = $5::timestamptz,
             updated_at = $1::timestamptz
         FROM claimable
         WHERE event.id = claimable.id
         RETURNING event.*`,
        [now, input.publishFrom, input.batchSize, input.workerId, lockExpiresAt]
      );

      await client.query("COMMIT");

      return {
        events: claimed.rows.map(toOutboxRow),
        recoveredExpiredLeases: recovered.rowCount ?? 0,
        deadLetteredExpiredLeases: exhausted.rowCount ?? 0,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async renewLease(
    id: string,
    workerId: string,
    leaseDurationMs: number,
    now: Date = new Date()
  ): Promise<boolean> {
    const nextExpiry = new Date(now.getTime() + leaseDurationMs);
    const result = await this.pgPool.query(
      `UPDATE outbox_events
       SET locked_at = $3::timestamptz,
           lock_expires_at = $4::timestamptz,
           updated_at = $3::timestamptz
       WHERE id = $1
         AND status = 'PROCESSING'
         AND locked_by = $2`,
      [id, workerId, now, nextExpiry]
    );
    return (result.rowCount ?? 0) === 1;
  }

  async markPublished(
    id: string,
    workerId: string,
    publishedAt: Date = new Date()
  ): Promise<SettleResult> {
    const result = await this.pgPool.query(
      `UPDATE outbox_events
       SET status = 'PUBLISHED',
           published_at = $3::timestamptz,
           failed_at = NULL,
           last_error = NULL,
           locked_at = NULL,
           locked_by = NULL,
           lock_expires_at = NULL,
           updated_at = $3::timestamptz
       WHERE id = $1
         AND status = 'PROCESSING'
         AND locked_by = $2`,
      [id, workerId, publishedAt]
    );

    return (result.rowCount ?? 0) === 1 ? "PUBLISHED" : "LEASE_LOST";
  }

  async markFailed(input: MarkFailedInput): Promise<SettleResult> {
    const now = input.now ?? new Date();
    const error = sanitizeAndBoundError(input.error || "Unknown outbox transport failure");

    const result = await this.pgPool.query<{ status: string }>(
      `UPDATE outbox_events
       SET status = CASE
             WHEN $4::boolean = false OR attempts >= max_attempts THEN 'DEAD_LETTER'
             ELSE 'FAILED'
           END,
           next_attempt_at = CASE
             WHEN $4::boolean = false OR attempts >= max_attempts THEN next_attempt_at
             ELSE $5::timestamptz
           END,
           failed_at = CASE
             WHEN $4::boolean = false OR attempts >= max_attempts THEN $6::timestamptz
             ELSE NULL
           END,
           last_error = $3,
           locked_at = NULL,
           locked_by = NULL,
           lock_expires_at = NULL,
           updated_at = $6::timestamptz
       WHERE id = $1
         AND status = 'PROCESSING'
         AND locked_by = $2
       RETURNING status`,
      [input.id, input.workerId, error, input.retryable, input.nextAttemptAt, now]
    );

    if (!result.rows[0]) return "LEASE_LOST";
    return result.rows[0].status === "DEAD_LETTER" ? "DEAD_LETTER" : "RETRY_SCHEDULED";
  }
}
