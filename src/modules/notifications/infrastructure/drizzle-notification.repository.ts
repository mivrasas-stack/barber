import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  notificationDeliveries,
  notificationInboxItems,
  notificationIntents,
  notificationPreferences,
} from "@/infrastructure/database/schema/notifications";
import type {
  CreateNotificationIntentInput,
  CreateNotificationIntentResult,
  NotificationPreferenceSnapshot,
  NotificationRepository,
} from "../domain/notification-repository.interface";

const DEFAULT_PREFERENCE: NotificationPreferenceSnapshot = {
  inAppEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  quietHoursEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  timezone: null,
  locale: null,
};

export class DrizzleNotificationRepository implements NotificationRepository {
  async findPreference(
    userId: string,
    tenantId: string,
    category: string
  ): Promise<NotificationPreferenceSnapshot | null> {
    const [tenantSpecific] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.tenantId, tenantId),
          eq(notificationPreferences.category, category)
        )
      )
      .limit(1);

    if (tenantSpecific) {
      return this.toPreference(tenantSpecific);
    }

    const [globalPreference] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          isNull(notificationPreferences.tenantId),
          eq(notificationPreferences.category, category)
        )
      )
      .limit(1);

    return globalPreference ? this.toPreference(globalPreference) : null;
  }

  static defaultPreference(): NotificationPreferenceSnapshot {
    return { ...DEFAULT_PREFERENCE };
  }

  async createIntentWithDeliveries(
    input: CreateNotificationIntentInput
  ): Promise<CreateNotificationIntentResult> {
    return db.transaction(async (tx) => {
      const hasPending = input.deliveries.some((d) => d.status === "PENDING");
      const hasDelivered = input.deliveries.some(
        (d) => d.status === "DELIVERED"
      );
      const intentStatus = hasPending
        ? "CREATED"
        : hasDelivered
          ? "DELIVERED"
          : "CANCELLED";

      const [createdIntent] = await tx
        .insert(notificationIntents)
        .values({
          sourceEventId: input.sourceEventId,
          sourceEventType: input.sourceEventType,
          tenantId: input.tenantId,
          locationId: input.locationId,
          recipientUserId: input.recipientUserId,
          recipientKind: input.recipientKind,
          recipientReference: input.recipientReference,
          category: input.category,
          policyKey: input.policyKey,
          templateKey: input.templateKey,
          templateVersion: input.templateVersion,
          locale: input.locale,
          timezone: input.timezone,
          payload: input.payload,
          dedupeKey: input.dedupeKey,
          mandatory: input.mandatory,
          status: intentStatus,
        })
        .onConflictDoNothing({ target: notificationIntents.dedupeKey })
        .returning({ id: notificationIntents.id });

      if (!createdIntent) {
        const [existing] = await tx
          .select({ id: notificationIntents.id })
          .from(notificationIntents)
          .where(eq(notificationIntents.dedupeKey, input.dedupeKey))
          .limit(1);

        if (!existing) {
          throw new Error("NOTIFICATION_DEDUPE_CONFLICT_WITHOUT_EXISTING_INTENT");
        }

        return {
          intentId: existing.id,
          created: false,
          deliveryCount: 0,
          inboxCreated: false,
        };
      }

      const now = new Date();
      let deliveryCount = 0;
      let inboxCreated = false;

      for (const delivery of input.deliveries) {
        const [insertedDelivery] = await tx
          .insert(notificationDeliveries)
          .values({
            notificationIntentId: createdIntent.id,
            channel: delivery.channel,
            status: delivery.status,
            deliveredAt:
              delivery.channel === "IN_APP" &&
              delivery.status === "DELIVERED"
                ? now
                : null,
            lastError:
              delivery.status === "SUPPRESSED"
                ? delivery.suppressionReason ?? "CHANNEL_SUPPRESSED"
                : null,
          })
          .onConflictDoNothing()
          .returning({ id: notificationDeliveries.id });

        if (insertedDelivery) deliveryCount += 1;

        if (
          delivery.channel === "IN_APP" &&
          delivery.status === "DELIVERED" &&
          input.recipientUserId
        ) {
          const [inbox] = await tx
            .insert(notificationInboxItems)
            .values({
              notificationIntentId: createdIntent.id,
              userId: input.recipientUserId,
              tenantId: input.tenantId,
            })
            .onConflictDoNothing()
            .returning({ id: notificationInboxItems.id });

          inboxCreated = Boolean(inbox);
        }
      }

      return {
        intentId: createdIntent.id,
        created: true,
        deliveryCount,
        inboxCreated,
      };
    });
  }

  private toPreference(
    row: typeof notificationPreferences.$inferSelect
  ): NotificationPreferenceSnapshot {
    return {
      inAppEnabled: row.inAppEnabled,
      emailEnabled: row.emailEnabled,
      smsEnabled: row.smsEnabled,
      whatsappEnabled: row.whatsappEnabled,
      quietHoursEnabled: row.quietHoursEnabled,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      timezone: row.timezone,
      locale: row.locale,
    };
  }
}
