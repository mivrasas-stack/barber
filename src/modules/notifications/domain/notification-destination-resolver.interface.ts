import type {
  ClaimedNotificationDelivery,
} from "./notification-delivery-repository.interface";

export interface ResolvedNotificationDestination {
  destination: string;
  destinationHash: string;
  destinationMasked: string;
  source: "USER" | "APPOINTMENT_SNAPSHOT" | "ORDER_SNAPSHOT";
}

export interface NotificationDestinationResolver {
  resolve(
    delivery: ClaimedNotificationDelivery
  ): Promise<ResolvedNotificationDestination | null>;
}
