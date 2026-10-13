import type { Pool } from "pg";
import { pool } from "@/infrastructure/database/client";
import type {
  NotificationInboxItemView,
  NotificationInboxListInput,
  NotificationInboxRepository,
  NotificationPreferenceView,
  UpsertNotificationPreferenceInput,
} from "../domain/notification-inbox-repository.interface";

interface InboxRow {
  id: string;
  notification_intent_id: string;
  tenant_id: string;
  category: string;
  template_key: string;
  template_version: number;
  payload: Record<string, unknown>;
  mandatory: boolean;
  read_at: Date | null;
  archived_at: Date | null;
  created_at: Date;
}

interface PreferenceRow {
  id: string;
  user_id: string;
  tenant_id: string | null;
  category: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string | null;
  locale: string | null;
  updated_at: Date;
}

export class DrizzleNotificationInboxRepository
  implements NotificationInboxRepository
{
  constructor(private readonly pgPool: Pool = pool) {}

  async listInbox(
    input: NotificationInboxListInput
  ): Promise<NotificationInboxItemView[]> {
    const limit = Math.min(Math.max(input.limit ?? 30, 1), 100);
    const params: unknown[] = [input.userId];
    const conditions = ["inbox.user_id = $1"];

    if (input.tenantId) {
      params.push(input.tenantId);
      conditions.push(`inbox.tenant_id = $${params.length}`);
    }
    if (!input.includeArchived) {
      conditions.push("inbox.archived_at IS NULL");
    }
    if (input.before) {
      params.push(input.before);
      conditions.push(`inbox.created_at < $${params.length}::timestamptz`);
    }

    params.push(limit);
    const result = await this.pgPool.query<InboxRow>(
      `SELECT
         inbox.id,
         inbox.notification_intent_id,
         inbox.tenant_id,
         intent.category,
         intent.template_key,
         intent.template_version,
         intent.payload,
         intent.mandatory,
         inbox.read_at,
         inbox.archived_at,
         inbox.created_at
       FROM notification_inbox_items AS inbox
       INNER JOIN notification_intents AS intent
         ON intent.id = inbox.notification_intent_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY inbox.created_at DESC, inbox.id DESC
       LIMIT $${params.length}::int`,
      params
    );

    return result.rows.map(toInboxView);
  }

  async countUnread(userId: string, tenantId?: string): Promise<number> {
    const params: unknown[] = [userId];
    const tenantClause = tenantId
      ? (() => {
          params.push(tenantId);
          return `AND tenant_id = $${params.length}`;
        })()
      : "";

    const result = await this.pgPool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM notification_inbox_items
       WHERE user_id = $1
         ${tenantClause}
         AND read_at IS NULL
         AND archived_at IS NULL`,
      params
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async markRead(
    id: string,
    userId: string,
    now: Date = new Date()
  ): Promise<boolean> {
    const result = await this.pgPool.query(
      `UPDATE notification_inbox_items
       SET read_at = COALESCE(read_at, $3::timestamptz)
       WHERE id = $1
         AND user_id = $2
         AND archived_at IS NULL`,
      [id, userId, now]
    );
    return (result.rowCount ?? 0) === 1;
  }

  async archive(
    id: string,
    userId: string,
    now: Date = new Date()
  ): Promise<boolean> {
    const result = await this.pgPool.query(
      `UPDATE notification_inbox_items
       SET archived_at = COALESCE(archived_at, $3::timestamptz)
       WHERE id = $1
         AND user_id = $2`,
      [id, userId, now]
    );
    return (result.rowCount ?? 0) === 1;
  }

  async listPreferences(
    userId: string,
    tenantId?: string | null
  ): Promise<NotificationPreferenceView[]> {
    const params: unknown[] = [userId];
    let scope = "";

    if (tenantId === null) {
      scope = "AND tenant_id IS NULL";
    } else if (tenantId) {
      params.push(tenantId);
      scope = `AND (tenant_id IS NULL OR tenant_id = $${params.length})`;
    }

    const result = await this.pgPool.query<PreferenceRow>(
      `SELECT *
       FROM notification_preferences
       WHERE user_id = $1
         ${scope}
       ORDER BY category ASC, tenant_id NULLS FIRST`,
      params
    );

    return result.rows.map(toPreferenceView);
  }

  async upsertPreference(
    input: UpsertNotificationPreferenceInput
  ): Promise<NotificationPreferenceView> {
    const category = input.category.trim().toUpperCase().slice(0, 64);
    if (!category) throw new Error("NOTIFICATION_PREFERENCE_CATEGORY_REQUIRED");

    const client = await this.pgPool.connect();
    try {
      await client.query("BEGIN");

      const lookupParams: unknown[] = [input.userId, category];
      const tenantPredicate =
        input.tenantId === null
          ? "tenant_id IS NULL"
          : (() => {
              lookupParams.push(input.tenantId);
              return `tenant_id = $${lookupParams.length}`;
            })();

      const existing = await client.query<{ id: string }>(
        `SELECT id
         FROM notification_preferences
         WHERE user_id = $1
           AND category = $2
           AND ${tenantPredicate}
         FOR UPDATE`,
        lookupParams
      );

      let result;
      if (existing.rows[0]) {
        result = await client.query<PreferenceRow>(
          `UPDATE notification_preferences
           SET in_app_enabled = $2,
               email_enabled = $3,
               sms_enabled = $4,
               whatsapp_enabled = $5,
               quiet_hours_enabled = $6,
               quiet_hours_start = $7::time,
               quiet_hours_end = $8::time,
               timezone = $9,
               locale = $10,
               updated_at = now()
           WHERE id = $1
           RETURNING *`,
          [
            existing.rows[0].id,
            input.inAppEnabled,
            input.emailEnabled,
            input.smsEnabled,
            input.whatsappEnabled,
            input.quietHoursEnabled,
            input.quietHoursStart,
            input.quietHoursEnd,
            input.timezone,
            input.locale,
          ]
        );
      } else {
        result = await client.query<PreferenceRow>(
          `INSERT INTO notification_preferences (
             user_id, tenant_id, category,
             in_app_enabled, email_enabled, sms_enabled, whatsapp_enabled,
             quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
             timezone, locale
           )
           VALUES (
             $1, $2, $3,
             $4, $5, $6, $7,
             $8, $9::time, $10::time,
             $11, $12
           )
           RETURNING *`,
          [
            input.userId,
            input.tenantId,
            category,
            input.inAppEnabled,
            input.emailEnabled,
            input.smsEnabled,
            input.whatsappEnabled,
            input.quietHoursEnabled,
            input.quietHoursStart,
            input.quietHoursEnd,
            input.timezone,
            input.locale,
          ]
        );
      }

      await client.query("COMMIT");
      return toPreferenceView(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

function toInboxView(row: InboxRow): NotificationInboxItemView {
  return {
    id: row.id,
    notificationIntentId: row.notification_intent_id,
    tenantId: row.tenant_id,
    category: row.category,
    templateKey: row.template_key,
    templateVersion: row.template_version,
    payload: row.payload,
    mandatory: row.mandatory,
    readAt: row.read_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

function toPreferenceView(row: PreferenceRow): NotificationPreferenceView {
  return {
    id: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    category: row.category,
    inAppEnabled: row.in_app_enabled,
    emailEnabled: row.email_enabled,
    smsEnabled: row.sms_enabled,
    whatsappEnabled: row.whatsapp_enabled,
    quietHoursEnabled: row.quiet_hours_enabled,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    timezone: row.timezone,
    locale: row.locale,
    updatedAt: row.updated_at,
  };
}
