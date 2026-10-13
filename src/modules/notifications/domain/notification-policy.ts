import type { OutboxEnvelope } from "@/infrastructure/outbox/types";
import type { NotificationChannel, NotificationCategory } from "./notification";

export type NotificationRecipientStrategy =
  | "APPOINTMENT_CUSTOMER"
  | "ORDER_CUSTOMER"
  | "PAYMENT_CUSTOMER_OR_TENANT_OWNERS"
  | "TENANT_OWNERS"
  | "PROFESSIONAL_USER"
  | "AFFILIATION_PARTIES";

export interface NotificationPolicyChannel {
  channel: NotificationChannel;
  mandatory: boolean;
}

export interface NotificationPolicy {
  key: string;
  eventType: string;
  category: NotificationCategory;
  templateKey: string;
  templateVersion: number;
  recipientStrategy: NotificationRecipientStrategy;
  channels: readonly NotificationPolicyChannel[];
  quietHoursBypass: boolean;
  mapPayload(envelope: OutboxEnvelope): Record<string, unknown>;
}

export interface NotificationRecipient {
  userId: string | null;
  kind: "USER" | "CONTACT";
  reference: string;
  hasEmail: boolean;
  hasPhone: boolean;
  locale: string;
  timezone: string;
}
