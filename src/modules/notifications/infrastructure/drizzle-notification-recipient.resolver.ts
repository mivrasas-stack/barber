import { and, eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { appointments } from "@/infrastructure/database/schema/appointments";
import { orders } from "@/infrastructure/database/schema/commerce";
import { paymentIntents } from "@/infrastructure/database/schema/payments";
import {
  professionalAffiliations,
  professionalProfiles,
  professionalWorkspaces,
} from "@/infrastructure/database/schema/professionals";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { membershipRoles, roles } from "@/infrastructure/database/schema/roles";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { users } from "@/infrastructure/database/schema/users";
import type { OutboxEnvelope } from "@/infrastructure/outbox/types";
import type { NotificationRecipientResolver } from "../domain/notification-recipient-resolver.interface";
import type {
  NotificationRecipient,
  NotificationRecipientStrategy,
} from "../domain/notification-policy";

const DEFAULT_LOCALE = "es-CO";
const DEFAULT_TIMEZONE = "America/Bogota";

export class DrizzleNotificationRecipientResolver
  implements NotificationRecipientResolver
{
  async resolve(
    envelope: OutboxEnvelope,
    strategy: NotificationRecipientStrategy
  ): Promise<NotificationRecipient[]> {
    switch (strategy) {
      case "APPOINTMENT_CUSTOMER":
        return this.resolveAppointmentCustomer(envelope);
      case "ORDER_CUSTOMER":
        return this.resolveOrderCustomer(envelope);
      case "PAYMENT_CUSTOMER_OR_TENANT_OWNERS":
        return this.resolvePaymentCustomerOrOwners(envelope);
      case "TENANT_OWNERS":
        return this.resolveTenantOwners(envelope.tenantId);
      case "PROFESSIONAL_USER":
        return this.resolveProfessionalUser(envelope.aggregateId, envelope.tenantId);
      case "AFFILIATION_PARTIES":
        return this.resolveAffiliationParties(envelope);
      default:
        return [];
    }
  }

  private async resolveAppointmentCustomer(
    envelope: OutboxEnvelope
  ): Promise<NotificationRecipient[]> {
    const [row] = await db
      .select({
        userId: appointments.customerUserId,
        email: appointments.customerEmailSnapshot,
        phone: appointments.customerPhoneSnapshot,
        timezone: appointments.timezone,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.id, envelope.aggregateId),
          eq(appointments.tenantId, envelope.tenantId)
        )
      )
      .limit(1);

    if (!row) return [];

    return [
      {
        userId: row.userId,
        kind: row.userId ? "USER" : "CONTACT",
        reference: `appointment:${envelope.aggregateId}`,
        hasEmail: Boolean(row.email),
        hasPhone: Boolean(row.phone),
        locale: DEFAULT_LOCALE,
        timezone: row.timezone || DEFAULT_TIMEZONE,
      },
    ];
  }

  private async resolveOrderCustomer(
    envelope: OutboxEnvelope
  ): Promise<NotificationRecipient[]> {
    const [row] = await db
      .select({
        userId: orders.customerUserId,
        email: orders.customerEmailSnapshot,
        phone: orders.customerPhoneSnapshot,
      })
      .from(orders)
      .where(
        and(
          eq(orders.id, envelope.aggregateId),
          eq(orders.contextTenantId, envelope.tenantId)
        )
      )
      .limit(1);

    if (!row) return [];

    return [
      {
        userId: row.userId,
        kind: row.userId ? "USER" : "CONTACT",
        reference: `order:${envelope.aggregateId}`,
        hasEmail: Boolean(row.email),
        hasPhone: Boolean(row.phone),
        locale: DEFAULT_LOCALE,
        timezone: await this.resolveTenantTimezone(envelope.tenantId),
      },
    ];
  }

  private async resolvePaymentCustomerOrOwners(
    envelope: OutboxEnvelope
  ): Promise<NotificationRecipient[]> {
    const [intent] = await db
      .select({
        orderId: paymentIntents.orderId,
        subscriptionInvoiceId: paymentIntents.subscriptionInvoiceId,
      })
      .from(paymentIntents)
      .where(
        and(
          eq(paymentIntents.id, envelope.aggregateId),
          eq(paymentIntents.collectorTenantId, envelope.tenantId)
        )
      )
      .limit(1);

    if (!intent) return [];

    if (intent.orderId) {
      return this.resolveOrderById(intent.orderId, envelope.tenantId);
    }

    return this.resolveTenantOwners(envelope.tenantId);
  }

  private async resolveOrderById(
    orderId: string,
    tenantId: string
  ): Promise<NotificationRecipient[]> {
    const [row] = await db
      .select({
        userId: orders.customerUserId,
        email: orders.customerEmailSnapshot,
        phone: orders.customerPhoneSnapshot,
      })
      .from(orders)
      .where(
        and(eq(orders.id, orderId), eq(orders.contextTenantId, tenantId))
      )
      .limit(1);

    if (!row) return [];

    return [
      {
        userId: row.userId,
        kind: row.userId ? "USER" : "CONTACT",
        reference: `order:${orderId}`,
        hasEmail: Boolean(row.email),
        hasPhone: Boolean(row.phone),
        locale: DEFAULT_LOCALE,
        timezone: await this.resolveTenantTimezone(tenantId),
      },
    ];
  }

  private async resolveTenantOwners(
    tenantId: string
  ): Promise<NotificationRecipient[]> {
    const rows = await db
      .select({
        userId: users.id,
        email: users.email,
      })
      .from(memberships)
      .innerJoin(
        membershipRoles,
        eq(membershipRoles.membershipId, memberships.id)
      )
      .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(
        and(
          eq(memberships.tenantId, tenantId),
          eq(memberships.status, "ACTIVE"),
          eq(roles.name, "OWNER"),
          eq(users.status, "ACTIVE")
        )
      );

    const timezone = await this.resolveTenantTimezone(tenantId);

    return this.uniqueRecipients(
      rows.map((row) => ({
        userId: row.userId,
        kind: "USER" as const,
        reference: `user:${row.userId}`,
        hasEmail: Boolean(row.email),
        hasPhone: false,
        locale: DEFAULT_LOCALE,
        timezone,
      }))
    );
  }

  private async resolveProfessionalUser(
    professionalProfileId: string,
    workspaceTenantId: string
  ): Promise<NotificationRecipient[]> {
    const [row] = await db
      .select({
        userId: users.id,
        email: users.email,
      })
      .from(professionalProfiles)
      .innerJoin(users, eq(users.id, professionalProfiles.userId))
      .innerJoin(
        professionalWorkspaces,
        eq(professionalWorkspaces.professionalProfileId, professionalProfiles.id)
      )
      .where(
        and(
          eq(professionalProfiles.id, professionalProfileId),
          eq(professionalWorkspaces.tenantId, workspaceTenantId),
          eq(professionalWorkspaces.status, "ACTIVE"),
          eq(users.status, "ACTIVE")
        )
      )
      .limit(1);

    if (!row) return [];

    return [
      {
        userId: row.userId,
        kind: "USER",
        reference: `user:${row.userId}`,
        hasEmail: Boolean(row.email),
        hasPhone: false,
        locale: DEFAULT_LOCALE,
        timezone: await this.resolveTenantTimezone(workspaceTenantId),
      },
    ];
  }

  private async resolveAffiliationParties(
    envelope: OutboxEnvelope
  ): Promise<NotificationRecipient[]> {
    const [affiliation] = await db
      .select({
        professionalProfileId: professionalAffiliations.professionalProfileId,
        professionalWorkspaceTenantId:
          professionalAffiliations.professionalWorkspaceTenantId,
        hostTenantId: professionalAffiliations.hostTenantId,
      })
      .from(professionalAffiliations)
      .where(
        and(
          eq(professionalAffiliations.id, envelope.aggregateId),
          eq(professionalAffiliations.hostTenantId, envelope.tenantId)
        )
      )
      .limit(1);

    if (!affiliation) return [];

    const [professional, owners] = await Promise.all([
      this.resolveProfessionalUser(
        affiliation.professionalProfileId,
        affiliation.professionalWorkspaceTenantId
      ),
      this.resolveTenantOwners(affiliation.hostTenantId),
    ]);

    return this.uniqueRecipients([...professional, ...owners]);
  }

  private async resolveTenantTimezone(tenantId: string): Promise<string> {
    const [tenant] = await db
      .select({ timezone: tenants.defaultTimezone })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    return tenant?.timezone || DEFAULT_TIMEZONE;
  }

  private uniqueRecipients(
    recipients: NotificationRecipient[]
  ): NotificationRecipient[] {
    const seen = new Set<string>();
    const output: NotificationRecipient[] = [];

    for (const recipient of recipients) {
      const key = recipient.userId
        ? `user:${recipient.userId}`
        : recipient.reference;
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(recipient);
    }

    return output;
  }
}
