import type { Pool } from "pg";
import { pool } from "@/infrastructure/database/client";
import { sanitizeAndBoundError } from "@/infrastructure/outbox/outbox-sanitizer";
import type {
  ClaimedNotificationDelivery,
  ClaimNotificationDeliveriesInput,
  ClaimNotificationDeliveriesResult,
  MarkNotificationFailedInput,
  MarkNotificationSentInput,
  SuppressNotificationDeliveryInput,
  DeferNotificationDeliveryInput,
  NotificationDeliveryRepository,
  NotificationDeliverySettleResult,
} from "../domain/notification-delivery-repository.interface";
import type { ExternalNotificationChannel } from "../domain/notification-channel-provider.interface";

const DEFAULT_EXTERNAL_CHANNELS: ExternalNotificationChannel[] = [
  "EMAIL",
  "SMS",
  "WHATSAPP",
];

interface RawClaimedDelivery {
  id: string;
  notification_intent_id: string;
  source_event_id: string;
  source_event_type: string;
  tenant_id: string;
  location_id: string | null;
  recipient_user_id: string | null;
  recipient_kind: string;
  recipient_reference: string | null;
  category: string;
  policy_key: string;
  template_key: string;
  template_version: number;
  locale: string;
  timezone: string;
  payload: Record<string, unknown>;
  mandatory: boolean;
  channel: ExternalNotificationChannel;
  status: "PROCESSING";
  destination_hash: string | null;
  destination_masked: string | null;
  provider: string | null;
  provider_message_id: string | null;
  attempts: number;
  max_attempts: number;
  next_attempt_at: Date;
  locked_at: Date;
  locked_by: string;
  lock_expires_at: Date;
  sent_at: Date | null;
  delivered_at: Date | null;
  failed_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

function toClaimedDelivery(
  row: RawClaimedDelivery
): ClaimedNotificationDelivery {
  return {
    id: row.id,
    notificationIntentId: row.notification_intent_id,
    sourceEventId: row.source_event_id,
    sourceEventType: row.source_event_type,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    recipientUserId: row.recipient_user_id,
    recipientKind: row.recipient_kind,
    recipientReference: row.recipient_reference,
    category: row.category,
    policyKey: row.policy_key,
    templateKey: row.template_key,
    templateVersion: row.template_version,
    locale: row.locale,
    timezone: row.timezone,
    payload: row.payload,
    mandatory: row.mandatory,
    channel: row.channel,
    status: row.status,
    destinationHash: row.destination_hash,
    destinationMasked: row.destination_masked,
    provider: row.provider,
    providerMessageId: row.provider_message_id,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextAttemptAt: row.next_attempt_at,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    lockExpiresAt: row.lock_expires_at,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at,
    failedAt: row.failed_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeChannels(
  channels: ClaimNotificationDeliveriesInput["channels"]
): ExternalNotificationChannel[] {
  const selected = channels ?? DEFAULT_EXTERNAL_CHANNELS;
  if (selected.length === 0) {
    throw new Error("NOTIFICATION_DELIVERY_CHANNELS_REQUIRED");
  }

  const unique = [...new Set(selected)];
  for (const channel of unique) {
    if (!DEFAULT_EXTERNAL_CHANNELS.includes(channel)) {
      throw new Error("NOTIFICATION_DELIVERY_CHANNEL_INVALID");
    }
  }

  return unique;
}

export class DrizzleNotificationDeliveryRepository
  implements NotificationDeliveryRepository
{
  constructor(private readonly pgPool: Pool = pool) {}

  async claimBatch(
    input: ClaimNotificationDeliveriesInput
  ): Promise<ClaimNotificationDeliveriesResult> {
    if (!input.workerId || !input.workerId.trim()) {
      throw new Error("NOTIFICATION_DELIVERY_WORKER_ID_REQUIRED");
    }
    if (
      !Number.isInteger(input.batchSize) ||
      input.batchSize < 1 ||
      input.batchSize > 500
    ) {
      throw new Error("NOTIFICATION_DELIVERY_BATCH_SIZE_INVALID");
    }
    if (
      !Number.isFinite(input.leaseDurationMs) ||
      input.leaseDurationMs < 100
    ) {
      throw new Error("NOTIFICATION_DELIVERY_LEASE_DURATION_INVALID");
    }

    const channels = normalizeChannels(input.channels);
    const now = input.now ?? new Date();
    const lockExpiresAt = new Date(
      now.getTime() + input.leaseDurationMs
    );
    const client = await this.pgPool.connect();

    try {
      await client.query("BEGIN");

      const exhausted = await client.query(
        `WITH expired_exhausted AS (
           SELECT id
           FROM notification_deliveries
           WHERE status = 'PROCESSING'
             AND lock_expires_at <= $1::timestamptz
             AND attempts >= max_attempts
             AND channel = ANY($2::text[])
           ORDER BY lock_expires_at ASC, id ASC
           LIMIT $3::int
           FOR UPDATE SKIP LOCKED
         )
         UPDATE notification_deliveries AS delivery
         SET status = 'DEAD_LETTER',
             failed_at = $1::timestamptz,
             last_error = COALESCE(
               delivery.last_error,
               'Worker lease expired after final delivery attempt'
             ),
             locked_at = NULL,
             locked_by = NULL,
             lock_expires_at = NULL,
             updated_at = $1::timestamptz
         FROM expired_exhausted
         WHERE delivery.id = expired_exhausted.id`,
        [now, channels, input.batchSize]
      );

      const recovered = await client.query(
        `WITH expired_recoverable AS (
           SELECT id
           FROM notification_deliveries
           WHERE status = 'PROCESSING'
             AND lock_expires_at <= $1::timestamptz
             AND attempts < max_attempts
             AND channel = ANY($2::text[])
           ORDER BY lock_expires_at ASC, id ASC
           LIMIT $3::int
           FOR UPDATE SKIP LOCKED
         )
         UPDATE notification_deliveries AS delivery
         SET status = 'FAILED',
             next_attempt_at = $1::timestamptz,
             last_error = COALESCE(
               delivery.last_error,
               'Worker lease expired before settlement'
             ),
             locked_at = NULL,
             locked_by = NULL,
             lock_expires_at = NULL,
             updated_at = $1::timestamptz
         FROM expired_recoverable
         WHERE delivery.id = expired_recoverable.id`,
        [now, channels, input.batchSize]
      );

      const claimed = await client.query<RawClaimedDelivery>(
        `WITH claimable AS (
           SELECT id
           FROM notification_deliveries
           WHERE status IN ('PENDING', 'FAILED')
             AND attempts < max_attempts
             AND next_attempt_at <= $1::timestamptz
             AND channel = ANY($2::text[])
           ORDER BY next_attempt_at ASC, created_at ASC, id ASC
           LIMIT $3::int
           FOR UPDATE SKIP LOCKED
         ),
         claimed AS (
           UPDATE notification_deliveries AS delivery
           SET status = 'PROCESSING',
               attempts = delivery.attempts + 1,
               locked_at = $1::timestamptz,
               locked_by = $4::varchar,
               lock_expires_at = $5::timestamptz,
               updated_at = $1::timestamptz
           FROM claimable
           WHERE delivery.id = claimable.id
           RETURNING delivery.*
         )
         SELECT
           claimed.id,
           claimed.notification_intent_id,
           intent.source_event_id,
           intent.source_event_type,
           intent.tenant_id,
           intent.location_id,
           intent.recipient_user_id,
           intent.recipient_kind,
           intent.recipient_reference,
           intent.category,
           intent.policy_key,
           intent.template_key,
           intent.template_version,
           intent.locale,
           intent.timezone,
           intent.payload,
           intent.mandatory,
           claimed.channel,
           claimed.status,
           claimed.destination_hash,
           claimed.destination_masked,
           claimed.provider,
           claimed.provider_message_id,
           claimed.attempts,
           claimed.max_attempts,
           claimed.next_attempt_at,
           claimed.locked_at,
           claimed.locked_by,
           claimed.lock_expires_at,
           claimed.sent_at,
           claimed.delivered_at,
           claimed.failed_at,
           claimed.last_error,
           claimed.created_at,
           claimed.updated_at
         FROM claimed
         INNER JOIN notification_intents AS intent
           ON intent.id = claimed.notification_intent_id
         ORDER BY claimed.created_at ASC, claimed.id ASC`,
        [
          now,
          channels,
          input.batchSize,
          input.workerId.trim(),
          lockExpiresAt,
        ]
      );

      await client.query("COMMIT");

      return {
        deliveries: claimed.rows.map(toClaimedDelivery),
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
    if (!Number.isFinite(leaseDurationMs) || leaseDurationMs < 100) {
      throw new Error("NOTIFICATION_DELIVERY_LEASE_DURATION_INVALID");
    }

    const lockExpiresAt = new Date(now.getTime() + leaseDurationMs);
    const result = await this.pgPool.query(
      `UPDATE notification_deliveries
       SET locked_at = $3::timestamptz,
           lock_expires_at = $4::timestamptz,
           updated_at = $3::timestamptz
       WHERE id = $1
         AND status = 'PROCESSING'
         AND locked_by = $2`,
      [id, workerId, now, lockExpiresAt]
    );

    return (result.rowCount ?? 0) === 1;
  }

  async markSent(
    input: MarkNotificationSentInput
  ): Promise<NotificationDeliverySettleResult> {
    const sentAt = input.sentAt ?? new Date();
    const provider = input.provider.trim().slice(0, 64);
    if (!provider) {
      throw new Error("NOTIFICATION_PROVIDER_REQUIRED");
    }

    const providerMessageId =
      input.providerMessageId?.trim().slice(0, 255) || null;
    const destinationHash =
      input.destinationHash?.trim().slice(0, 64) || null;
    const destinationMasked =
      input.destinationMasked?.trim().slice(0, 255) || null;

    const result = await this.pgPool.query(
      `UPDATE notification_deliveries
       SET status = 'SENT',
           provider = $3,
           provider_message_id = $4,
           destination_hash = COALESCE($5, destination_hash),
           destination_masked = COALESCE($6, destination_masked),
           sent_at = $7::timestamptz,
           failed_at = NULL,
           last_error = NULL,
           locked_at = NULL,
           locked_by = NULL,
           lock_expires_at = NULL,
           updated_at = $7::timestamptz
       WHERE id = $1
         AND status = 'PROCESSING'
         AND locked_by = $2`,
      [
        input.id,
        input.workerId,
        provider,
        providerMessageId,
        destinationHash,
        destinationMasked,
        sentAt,
      ]
    );

    return (result.rowCount ?? 0) === 1 ? "SENT" : "LEASE_LOST";
  }

  async markFailed(
    input: MarkNotificationFailedInput
  ): Promise<NotificationDeliverySettleResult> {
    const now = input.now ?? new Date();
    const error = sanitizeAndBoundError(
      input.error || "Unknown notification provider failure"
    );

    const result = await this.pgPool.query<{ status: string }>(
      `UPDATE notification_deliveries
       SET status = CASE
             WHEN $4::boolean = false OR attempts >= max_attempts
               THEN 'DEAD_LETTER'
             ELSE 'FAILED'
           END,
           next_attempt_at = CASE
             WHEN $4::boolean = false OR attempts >= max_attempts
               THEN next_attempt_at
             ELSE $5::timestamptz
           END,
           failed_at = CASE
             WHEN $4::boolean = false OR attempts >= max_attempts
               THEN $6::timestamptz
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
      [
        input.id,
        input.workerId,
        error,
        input.retryable,
        input.nextAttemptAt,
        now,
      ]
    );

    if (!result.rows[0]) return "LEASE_LOST";
    return result.rows[0].status === "DEAD_LETTER"
      ? "DEAD_LETTER"
      : "RETRY_SCHEDULED";
  }

  async suppress(
    input: SuppressNotificationDeliveryInput
  ): Promise<NotificationDeliverySettleResult> {
    const now = input.now ?? new Date();
    const reason = sanitizeAndBoundError(
      input.reason || "NOTIFICATION_DELIVERY_SUPPRESSED"
    );
    const destinationHash =
      input.destinationHash?.trim().slice(0, 64) || null;
    const destinationMasked =
      input.destinationMasked?.trim().slice(0, 255) || null;

    const result = await this.pgPool.query(
      `UPDATE notification_deliveries
       SET status = 'SUPPRESSED',
           destination_hash = COALESCE($3, destination_hash),
           destination_masked = COALESCE($4, destination_masked),
           last_error = $5,
           failed_at = NULL,
           locked_at = NULL,
           locked_by = NULL,
           lock_expires_at = NULL,
           updated_at = $6::timestamptz
       WHERE id = $1
         AND status = 'PROCESSING'
         AND locked_by = $2`,
      [
        input.id,
        input.workerId,
        destinationHash,
        destinationMasked,
        reason,
        now,
      ]
    );

    return (result.rowCount ?? 0) === 1
      ? "SUPPRESSED"
      : "LEASE_LOST";
  }

  async defer(
    input: DeferNotificationDeliveryInput
  ): Promise<NotificationDeliverySettleResult> {
    const now = input.now ?? new Date();
    if (
      !(input.nextAttemptAt instanceof Date) ||
      Number.isNaN(input.nextAttemptAt.getTime()) ||
      input.nextAttemptAt <= now
    ) {
      throw new Error("NOTIFICATION_DEFER_UNTIL_INVALID");
    }

    const reason = sanitizeAndBoundError(
      input.reason || "NOTIFICATION_DELIVERY_DEFERRED"
    );

    const result = await this.pgPool.query(
      `UPDATE notification_deliveries
       SET status = 'PENDING',
           attempts = GREATEST(attempts - 1, 0),
           next_attempt_at = $3::timestamptz,
           last_error = $4,
           failed_at = NULL,
           locked_at = NULL,
           locked_by = NULL,
           lock_expires_at = NULL,
           updated_at = $5::timestamptz
       WHERE id = $1
         AND status = 'PROCESSING'
         AND locked_by = $2`,
      [
        input.id,
        input.workerId,
        input.nextAttemptAt,
        reason,
        now,
      ]
    );

    return (result.rowCount ?? 0) === 1
      ? "DEFERRED"
      : "LEASE_LOST";
  }

  async markDelivered(
    id: string,
    providerMessageId: string | null,
    deliveredAt: Date = new Date()
  ): Promise<boolean> {
    const result = await this.pgPool.query(
      `UPDATE notification_deliveries
       SET status = 'DELIVERED',
           delivered_at = $3::timestamptz,
           updated_at = $3::timestamptz
       WHERE id = $1
         AND status = 'SENT'
         AND (
           $2::text IS NULL
           OR provider_message_id = $2
         )`,
      [id, providerMessageId, deliveredAt]
    );

    return (result.rowCount ?? 0) === 1;
  }
}
