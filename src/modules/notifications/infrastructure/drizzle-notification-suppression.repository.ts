import type { Pool } from "pg";
import { pool } from "@/infrastructure/database/client";
import type {
  NotificationSuppressionInput,
  NotificationSuppressionRepository,
} from "../domain/notification-suppression-repository.interface";
import type { ExternalNotificationChannel } from "../domain/notification-channel-provider.interface";
import { sanitizeAndBoundError } from "@/infrastructure/outbox/outbox-sanitizer";

export class DrizzleNotificationSuppressionRepository
  implements NotificationSuppressionRepository
{
  constructor(private readonly pgPool: Pool = pool) {}

  async isSuppressed(
    channel: ExternalNotificationChannel,
    destinationHash: string,
    now: Date = new Date()
  ): Promise<boolean> {
    const result = await this.pgPool.query(
      `SELECT 1
       FROM notification_suppressions
       WHERE channel = $1
         AND destination_hash = $2
         AND (expires_at IS NULL OR expires_at > $3::timestamptz)
       LIMIT 1`,
      [channel, destinationHash, now]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async suppress(input: NotificationSuppressionInput): Promise<void> {
    const now = input.now ?? new Date();
    const reason = sanitizeAndBoundError(input.reason, 128);
    const source = sanitizeAndBoundError(input.source, 128);

    await this.pgPool.query(
      `INSERT INTO notification_suppressions (
         channel,
         destination_hash,
         reason,
         source,
         created_at,
         expires_at
       )
       VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz)
       ON CONFLICT (channel, destination_hash)
       DO UPDATE SET
         reason = EXCLUDED.reason,
         source = EXCLUDED.source,
         created_at = EXCLUDED.created_at,
         expires_at = EXCLUDED.expires_at`,
      [
        input.channel,
        input.destinationHash,
        reason,
        source,
        now,
        input.expiresAt ?? null,
      ]
    );
  }

  async remove(
    channel: ExternalNotificationChannel,
    destinationHash: string
  ): Promise<boolean> {
    const result = await this.pgPool.query(
      `DELETE FROM notification_suppressions
       WHERE channel = $1
         AND destination_hash = $2`,
      [channel, destinationHash]
    );

    return (result.rowCount ?? 0) > 0;
  }
}
