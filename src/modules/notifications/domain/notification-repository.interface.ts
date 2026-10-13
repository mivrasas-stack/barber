import type {
  NotificationChannel,
  NotificationDeliveryStatus,
} from "./notification";

export interface NotificationPreferenceSnapshot {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string | null;
  locale: string | null;
}

export interface NotificationDeliveryDecision {
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  suppressionReason?: string | null;
}

export interface CreateNotificationIntentInput {
  sourceEventId: string;
  sourceEventType: string;
  tenantId: string;
  locationId: string | null;
  recipientUserId: string | null;
  recipientKind: string;
  recipientReference: string;
  category: string;
  policyKey: string;
  templateKey: string;
  templateVersion: number;
  locale: string;
  timezone: string;
  payload: Record<string, unknown>;
  dedupeKey: string;
  mandatory: boolean;
  deliveries: NotificationDeliveryDecision[];
}

export interface CreateNotificationIntentResult {
  intentId: string;
  created: boolean;
  deliveryCount: number;
  inboxCreated: boolean;
}

export interface NotificationRepository {
  findPreference(
    userId: string,
    tenantId: string,
    category: string
  ): Promise<NotificationPreferenceSnapshot | null>;

  createIntentWithDeliveries(
    input: CreateNotificationIntentInput
  ): Promise<CreateNotificationIntentResult>;
}
