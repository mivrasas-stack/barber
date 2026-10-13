import type { OutboxEnvelope } from "@/infrastructure/outbox/types";
import type {
  NotificationRecipient,
  NotificationRecipientStrategy,
} from "./notification-policy";

export interface NotificationRecipientResolver {
  resolve(
    envelope: OutboxEnvelope,
    strategy: NotificationRecipientStrategy
  ): Promise<NotificationRecipient[]>;
}
