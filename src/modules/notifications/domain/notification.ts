export const NOTIFICATION_CHANNELS = ["IN_APP", "EMAIL", "SMS", "WHATSAPP"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_DELIVERY_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "DELIVERED",
  "FAILED",
  "SUPPRESSED",
  "DEAD_LETTER",
] as const;
export type NotificationDeliveryStatus =
  (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

export const NOTIFICATION_INTENT_STATUSES = [
  "CREATED",
  "PARTIAL",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const;
export type NotificationIntentStatus =
  (typeof NOTIFICATION_INTENT_STATUSES)[number];

export const NOTIFICATION_RECIPIENT_KINDS = ["USER", "CONTACT", "ROLE"] as const;
export type NotificationRecipientKind =
  (typeof NOTIFICATION_RECIPIENT_KINDS)[number];

export type NotificationCategory = string;

export interface NotificationIntent {
  id: string;
  sourceEventId: string;
  sourceEventType: string;
  tenantId: string;
  locationId: string | null;
  recipientUserId: string | null;
  recipientKind: NotificationRecipientKind;
  recipientReference: string | null;
  category: NotificationCategory;
  policyKey: string;
  templateKey: string;
  templateVersion: number;
  locale: string;
  timezone: string;
  payload: Record<string, unknown>;
  dedupeKey: string;
  mandatory: boolean;
  status: NotificationIntentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDelivery {
  id: string;
  notificationIntentId: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  destinationHash: string | null;
  destinationMasked: string | null;
  provider: string | null;
  providerMessageId: string | null;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  lockExpiresAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  tenantId: string | null;
  category: NotificationCategory;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string | null;
  locale: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSuppression {
  id: string;
  channel: NotificationChannel;
  destinationHash: string;
  reason: string;
  source: string;
  createdAt: Date;
  expiresAt: Date | null;
}
