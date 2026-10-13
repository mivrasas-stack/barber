import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { appointments } from "@/infrastructure/database/schema/appointments";
import { orders } from "@/infrastructure/database/schema/commerce";
import { users } from "@/infrastructure/database/schema/users";
import type {
  NotificationDestinationResolver,
  ResolvedNotificationDestination,
} from "../domain/notification-destination-resolver.interface";
import type {
  ClaimedNotificationDelivery,
} from "../domain/notification-delivery-repository.interface";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const compact = trimmed.replace(/[\s().-]/g, "");
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
}

export function hashNotificationDestination(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function maskEmail(value: string): string {
  const [local, domain] = value.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function maskPhone(value: string): string {
  const last4 = value.slice(-4);
  return last4 ? `***${last4}` : "***";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string): boolean {
  return /^\+?[0-9]{7,20}$/.test(value);
}

export class DrizzleNotificationDestinationResolver
  implements NotificationDestinationResolver
{
  async resolve(
    delivery: ClaimedNotificationDelivery
  ): Promise<ResolvedNotificationDestination | null> {
    const raw = await this.resolveRawDestination(delivery);
    if (!raw) return null;

    if (delivery.channel === "EMAIL") {
      const normalized = normalizeEmail(raw.destination);
      if (!isValidEmail(normalized)) return null;

      return {
        destination: normalized,
        destinationHash: hashNotificationDestination(normalized),
        destinationMasked: maskEmail(normalized),
        source: raw.source,
      };
    }

    const normalized = normalizePhone(raw.destination);
    if (!isValidPhone(normalized)) return null;

    return {
      destination: normalized,
      destinationHash: hashNotificationDestination(normalized),
      destinationMasked: maskPhone(normalized),
      source: raw.source,
    };
  }

  private async resolveRawDestination(
    delivery: ClaimedNotificationDelivery
  ): Promise<{
    destination: string;
    source: ResolvedNotificationDestination["source"];
  } | null> {
    const reference = delivery.recipientReference ?? "";

    if (reference.startsWith("appointment:")) {
      const appointmentId = reference.slice("appointment:".length);
      return this.resolveAppointmentDestination(
        appointmentId,
        delivery.tenantId,
        delivery.recipientUserId,
        delivery.channel
      );
    }

    if (reference.startsWith("order:")) {
      const orderId = reference.slice("order:".length);
      return this.resolveOrderDestination(
        orderId,
        delivery.tenantId,
        delivery.recipientUserId,
        delivery.channel
      );
    }

    if (reference.startsWith("user:")) {
      const userId = reference.slice("user:".length);
      if (!delivery.recipientUserId || delivery.recipientUserId !== userId) {
        return null;
      }

      if (delivery.channel !== "EMAIL") {
        // The current authoritative users schema has no phone field.
        return null;
      }

      return this.resolveUserEmail(userId);
    }

    return null;
  }

  private async resolveAppointmentDestination(
    appointmentId: string,
    tenantId: string,
    recipientUserId: string | null,
    channel: ClaimedNotificationDelivery["channel"]
  ): Promise<{
    destination: string;
    source: ResolvedNotificationDestination["source"];
  } | null> {
    const [row] = await db
      .select({
        customerUserId: appointments.customerUserId,
        email: appointments.customerEmailSnapshot,
        phone: appointments.customerPhoneSnapshot,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!row) return null;

    if (
      recipientUserId &&
      row.customerUserId &&
      recipientUserId !== row.customerUserId
    ) {
      return null;
    }

    if (channel === "EMAIL") {
      if (row.email) {
        return {
          destination: row.email,
          source: "APPOINTMENT_SNAPSHOT",
        };
      }

      if (recipientUserId && row.customerUserId === recipientUserId) {
        return this.resolveUserEmail(recipientUserId);
      }

      return null;
    }

    if (!row.phone) return null;

    return {
      destination: row.phone,
      source: "APPOINTMENT_SNAPSHOT",
    };
  }

  private async resolveOrderDestination(
    orderId: string,
    tenantId: string,
    recipientUserId: string | null,
    channel: ClaimedNotificationDelivery["channel"]
  ): Promise<{
    destination: string;
    source: ResolvedNotificationDestination["source"];
  } | null> {
    const [row] = await db
      .select({
        customerUserId: orders.customerUserId,
        email: orders.customerEmailSnapshot,
        phone: orders.customerPhoneSnapshot,
      })
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.contextTenantId, tenantId)
        )
      )
      .limit(1);

    if (!row) return null;

    if (
      recipientUserId &&
      row.customerUserId &&
      recipientUserId !== row.customerUserId
    ) {
      return null;
    }

    if (channel === "EMAIL") {
      if (row.email) {
        return {
          destination: row.email,
          source: "ORDER_SNAPSHOT",
        };
      }

      if (recipientUserId && row.customerUserId === recipientUserId) {
        return this.resolveUserEmail(recipientUserId);
      }

      return null;
    }

    if (!row.phone) return null;

    return {
      destination: row.phone,
      source: "ORDER_SNAPSHOT",
    };
  }

  private async resolveUserEmail(
    userId: string
  ): Promise<{
    destination: string;
    source: "USER";
  } | null> {
    const [row] = await db
      .select({
        email: users.email,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row || row.status !== "ACTIVE" || !row.email) return null;

    return {
      destination: row.email,
      source: "USER",
    };
  }
}
