import { createHash } from "crypto";
import type { OutboxEnvelope } from "@/infrastructure/outbox/types";
import type { NotificationChannel } from "../domain/notification";
import type {
  NotificationPreferenceSnapshot,
  NotificationRepository,
} from "../domain/notification-repository.interface";
import type { NotificationRecipientResolver } from "../domain/notification-recipient-resolver.interface";
import type { NotificationPolicyChannel } from "../domain/notification-policy";
import { getNotificationPolicy } from "./notification-policy-registry";

export type ProcessNotificationEventStatus =
  | "PROCESSED"
  | "SKIPPED_UNSUPPORTED"
  | "SKIPPED_NO_RECIPIENT";

export interface ProcessNotificationEventResult {
  status: ProcessNotificationEventStatus;
  eventId: string;
  intentsCreated: number;
  duplicatesSkipped: number;
  deliveriesCreated: number;
  inboxItemsCreated: number;
}

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

export class ProcessNotificationEventUseCase {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolver
  ) {}

  async execute(
    envelope: OutboxEnvelope
  ): Promise<ProcessNotificationEventResult> {
    const policy = getNotificationPolicy(envelope.eventType);

    if (!policy) {
      return {
        status: "SKIPPED_UNSUPPORTED",
        eventId: envelope.eventId,
        intentsCreated: 0,
        duplicatesSkipped: 0,
        deliveriesCreated: 0,
        inboxItemsCreated: 0,
      };
    }

    const recipients = await this.recipientResolver.resolve(
      envelope,
      policy.recipientStrategy
    );

    if (recipients.length === 0) {
      return {
        status: "SKIPPED_NO_RECIPIENT",
        eventId: envelope.eventId,
        intentsCreated: 0,
        duplicatesSkipped: 0,
        deliveriesCreated: 0,
        inboxItemsCreated: 0,
      };
    }

    const payload = policy.mapPayload(envelope);
    let intentsCreated = 0;
    let duplicatesSkipped = 0;
    let deliveriesCreated = 0;
    let inboxItemsCreated = 0;

    for (const recipient of recipients) {
      const preference = recipient.userId
        ? (await this.repository.findPreference(
            recipient.userId,
            envelope.tenantId,
            policy.category
          )) ?? DEFAULT_PREFERENCE
        : DEFAULT_PREFERENCE;

      const deliveries = policy.channels.map((channelPolicy) =>
        this.decideChannel(channelPolicy, recipient, preference)
      );

      const dedupeKey = this.createDedupeKey(
        envelope.eventId,
        recipient.reference,
        policy.key,
        policy.templateVersion
      );

      const result = await this.repository.createIntentWithDeliveries({
        sourceEventId: envelope.eventId,
        sourceEventType: envelope.eventType,
        tenantId: envelope.tenantId,
        locationId: envelope.locationId,
        recipientUserId: recipient.userId,
        recipientKind: recipient.kind,
        recipientReference: recipient.reference,
        category: policy.category,
        policyKey: policy.key,
        templateKey: policy.templateKey,
        templateVersion: policy.templateVersion,
        locale: preference.locale ?? recipient.locale,
        timezone: preference.timezone ?? recipient.timezone,
        payload,
        dedupeKey,
        mandatory: policy.channels.some((channel) => channel.mandatory),
        deliveries,
      });

      if (result.created) {
        intentsCreated += 1;
        deliveriesCreated += result.deliveryCount;
        if (result.inboxCreated) inboxItemsCreated += 1;
      } else {
        duplicatesSkipped += 1;
      }
    }

    return {
      status: "PROCESSED",
      eventId: envelope.eventId,
      intentsCreated,
      duplicatesSkipped,
      deliveriesCreated,
      inboxItemsCreated,
    };
  }

  private decideChannel(
    policy: NotificationPolicyChannel,
    recipient: {
      userId: string | null;
      hasEmail: boolean;
      hasPhone: boolean;
    },
    preference: NotificationPreferenceSnapshot
  ): {
    channel: NotificationChannel;
    status: "PENDING" | "DELIVERED" | "SUPPRESSED";
    suppressionReason?: string;
  } {
    if (!this.isAvailable(policy.channel, recipient)) {
      return {
        channel: policy.channel,
        status: "SUPPRESSED",
        suppressionReason: "DESTINATION_UNAVAILABLE",
      };
    }

    const enabled = policy.mandatory || this.isEnabled(policy.channel, preference);

    if (!enabled) {
      return {
        channel: policy.channel,
        status: "SUPPRESSED",
        suppressionReason: "PREFERENCE_DISABLED",
      };
    }

    return {
      channel: policy.channel,
      status: policy.channel === "IN_APP" ? "DELIVERED" : "PENDING",
    };
  }

  private isAvailable(
    channel: NotificationChannel,
    recipient: { userId: string | null; hasEmail: boolean; hasPhone: boolean }
  ): boolean {
    if (channel === "IN_APP") return Boolean(recipient.userId);
    if (channel === "EMAIL") return recipient.hasEmail;
    if (channel === "SMS" || channel === "WHATSAPP") return recipient.hasPhone;
    return false;
  }

  private isEnabled(
    channel: NotificationChannel,
    preference: NotificationPreferenceSnapshot
  ): boolean {
    switch (channel) {
      case "IN_APP":
        return preference.inAppEnabled;
      case "EMAIL":
        return preference.emailEnabled;
      case "SMS":
        return preference.smsEnabled;
      case "WHATSAPP":
        return preference.whatsappEnabled;
    }
  }

  private createDedupeKey(
    eventId: string,
    recipientReference: string,
    policyKey: string,
    templateVersion: number
  ): string {
    return createHash("sha256")
      .update(
        [eventId, recipientReference, policyKey, String(templateVersion)].join("|")
      )
      .digest("hex");
  }
}
