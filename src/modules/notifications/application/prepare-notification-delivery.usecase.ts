import type {
  NotificationDestinationResolver,
  ResolvedNotificationDestination,
} from "../domain/notification-destination-resolver.interface";
import type {
  ClaimedNotificationDelivery,
} from "../domain/notification-delivery-repository.interface";
import type {
  NotificationPreferenceSnapshot,
  NotificationRepository,
} from "../domain/notification-repository.interface";
import type {
  NotificationSuppressionRepository,
} from "../domain/notification-suppression-repository.interface";
import { getNotificationPolicy } from "./notification-policy-registry";
import { evaluateQuietHours } from "./quiet-hours";

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

export type PrepareNotificationDeliveryResult =
  | {
      status: "READY";
      destination: ResolvedNotificationDestination;
    }
  | {
      status: "DEFERRED";
      reason: "QUIET_HOURS";
      nextAttemptAt: Date;
    }
  | {
      status: "SUPPRESSED";
      reason:
        | "POLICY_UNAVAILABLE"
        | "POLICY_CHANNEL_UNAVAILABLE"
        | "PREFERENCE_DISABLED"
        | "DESTINATION_UNAVAILABLE"
        | "DESTINATION_SUPPRESSED";
      destination?: ResolvedNotificationDestination;
    };

export class PrepareNotificationDeliveryUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly destinationResolver: NotificationDestinationResolver,
    private readonly suppressionRepository: NotificationSuppressionRepository
  ) {}

  async execute(
    delivery: ClaimedNotificationDelivery,
    now: Date = new Date()
  ): Promise<PrepareNotificationDeliveryResult> {
    const policy = getNotificationPolicy(delivery.sourceEventType);
    if (!policy) {
      return {
        status: "SUPPRESSED",
        reason: "POLICY_UNAVAILABLE",
      };
    }

    const channelPolicy = policy.channels.find(
      (candidate) => candidate.channel === delivery.channel
    );
    if (!channelPolicy) {
      return {
        status: "SUPPRESSED",
        reason: "POLICY_CHANNEL_UNAVAILABLE",
      };
    }

    const preference = delivery.recipientUserId
      ? (await this.notificationRepository.findPreference(
          delivery.recipientUserId,
          delivery.tenantId,
          delivery.category
        )) ?? DEFAULT_PREFERENCE
      : DEFAULT_PREFERENCE;

    if (
      !channelPolicy.mandatory &&
      !this.channelEnabled(delivery.channel, preference)
    ) {
      return {
        status: "SUPPRESSED",
        reason: "PREFERENCE_DISABLED",
      };
    }

    const quietHours = evaluateQuietHours({
      enabled: preference.quietHoursEnabled,
      start: preference.quietHoursStart,
      end: preference.quietHoursEnd,
      timezone: preference.timezone ?? delivery.timezone,
      now,
      bypass: policy.quietHoursBypass,
    });

    if (quietHours.deferred) {
      return {
        status: "DEFERRED",
        reason: "QUIET_HOURS",
        nextAttemptAt: quietHours.nextAllowedAt,
      };
    }

    const destination = await this.destinationResolver.resolve(delivery);
    if (!destination) {
      return {
        status: "SUPPRESSED",
        reason: "DESTINATION_UNAVAILABLE",
      };
    }

    if (
      await this.suppressionRepository.isSuppressed(
        delivery.channel,
        destination.destinationHash,
        now
      )
    ) {
      return {
        status: "SUPPRESSED",
        reason: "DESTINATION_SUPPRESSED",
        destination,
      };
    }

    return {
      status: "READY",
      destination,
    };
  }

  private channelEnabled(
    channel: ClaimedNotificationDelivery["channel"],
    preference: NotificationPreferenceSnapshot
  ): boolean {
    switch (channel) {
      case "EMAIL":
        return preference.emailEnabled;
      case "SMS":
        return preference.smsEnabled;
      case "WHATSAPP":
        return preference.whatsappEnabled;
    }
  }
}
