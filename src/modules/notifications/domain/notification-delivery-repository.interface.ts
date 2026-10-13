import type {
  NotificationChannel,
  NotificationDeliveryStatus,
} from "./notification";

export interface ClaimedNotificationDelivery {
  id: string;
  notificationIntentId: string;
  sourceEventId: string;
  sourceEventType: string;
  tenantId: string;
  locationId: string | null;
  recipientUserId: string | null;
  recipientKind: string;
  recipientReference: string | null;
  category: string;
  policyKey: string;
  templateKey: string;
  templateVersion: number;
  locale: string;
  timezone: string;
  payload: Record<string, unknown>;
  mandatory: boolean;
  channel: Exclude<NotificationChannel, "IN_APP">;
  status: "PROCESSING";
  destinationHash: string | null;
  destinationMasked: string | null;
  provider: string | null;
  providerMessageId: string | null;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lockedAt: Date;
  lockedBy: string;
  lockExpiresAt: Date;
  sentAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClaimNotificationDeliveriesInput {
  workerId: string;
  batchSize: number;
  leaseDurationMs: number;
  now?: Date;
  channels?: Array<Exclude<NotificationChannel, "IN_APP">>;
}

export interface ClaimNotificationDeliveriesResult {
  deliveries: ClaimedNotificationDelivery[];
  recoveredExpiredLeases: number;
  deadLetteredExpiredLeases: number;
}

export type NotificationDeliverySettleResult =
  | "SENT"
  | "SUPPRESSED"
  | "DEFERRED"
  | "RETRY_SCHEDULED"
  | "DEAD_LETTER"
  | "LEASE_LOST";

export interface MarkNotificationSentInput {
  id: string;
  workerId: string;
  provider: string;
  providerMessageId?: string | null;
  destinationHash?: string | null;
  destinationMasked?: string | null;
  sentAt?: Date;
}

export interface MarkNotificationFailedInput {
  id: string;
  workerId: string;
  error: string;
  retryable: boolean;
  nextAttemptAt: Date;
  now?: Date;
}

export interface SuppressNotificationDeliveryInput {
  id: string;
  workerId: string;
  reason: string;
  destinationHash?: string | null;
  destinationMasked?: string | null;
  now?: Date;
}

export interface DeferNotificationDeliveryInput {
  id: string;
  workerId: string;
  nextAttemptAt: Date;
  reason: string;
  now?: Date;
}

export interface NotificationDeliveryRepository {
  claimBatch(
    input: ClaimNotificationDeliveriesInput
  ): Promise<ClaimNotificationDeliveriesResult>;

  renewLease(
    id: string,
    workerId: string,
    leaseDurationMs: number,
    now?: Date
  ): Promise<boolean>;

  markSent(
    input: MarkNotificationSentInput
  ): Promise<NotificationDeliverySettleResult>;

  markFailed(
    input: MarkNotificationFailedInput
  ): Promise<NotificationDeliverySettleResult>;

  suppress(
    input: SuppressNotificationDeliveryInput
  ): Promise<NotificationDeliverySettleResult>;

  defer(
    input: DeferNotificationDeliveryInput
  ): Promise<NotificationDeliverySettleResult>;

  markDelivered(
    id: string,
    providerMessageId: string | null,
    deliveredAt?: Date
  ): Promise<boolean>;
}

export function isExternalNotificationChannel(
  channel: NotificationChannel
): channel is Exclude<NotificationChannel, "IN_APP"> {
  return channel === "EMAIL" || channel === "SMS" || channel === "WHATSAPP";
}

export function isTerminalNotificationDeliveryStatus(
  status: NotificationDeliveryStatus
): boolean {
  return (
    status === "DELIVERED" ||
    status === "SUPPRESSED" ||
    status === "DEAD_LETTER"
  );
}
