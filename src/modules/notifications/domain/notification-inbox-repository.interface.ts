export interface NotificationInboxListInput {
  userId: string;
  tenantId?: string;
  limit?: number;
  before?: Date;
  includeArchived?: boolean;
}

export interface NotificationInboxItemView {
  id: string;
  notificationIntentId: string;
  tenantId: string;
  category: string;
  templateKey: string;
  templateVersion: number;
  payload: Record<string, unknown>;
  mandatory: boolean;
  readAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
}

export interface NotificationPreferenceView {
  id: string;
  userId: string;
  tenantId: string | null;
  category: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string | null;
  locale: string | null;
  updatedAt: Date;
}

export interface UpsertNotificationPreferenceInput {
  userId: string;
  tenantId: string | null;
  category: string;
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

export interface NotificationInboxRepository {
  listInbox(input: NotificationInboxListInput): Promise<NotificationInboxItemView[]>;
  countUnread(userId: string, tenantId?: string): Promise<number>;
  markRead(id: string, userId: string, now?: Date): Promise<boolean>;
  archive(id: string, userId: string, now?: Date): Promise<boolean>;
  listPreferences(
    userId: string,
    tenantId?: string | null
  ): Promise<NotificationPreferenceView[]>;
  upsertPreference(
    input: UpsertNotificationPreferenceInput
  ): Promise<NotificationPreferenceView>;
}
