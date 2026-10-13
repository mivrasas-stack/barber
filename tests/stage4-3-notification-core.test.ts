import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  notificationDeliveries,
  notificationInboxItems,
  notificationIntents,
  notificationPreferences,
} from "@/infrastructure/database/schema/notifications";
import { users } from "@/infrastructure/database/schema/users";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { roles, membershipRoles } from "@/infrastructure/database/schema/roles";
import { ProcessNotificationEventUseCase } from "@/modules/notifications/application/process-notification-event.usecase";
import { DrizzleNotificationRepository } from "@/modules/notifications/infrastructure/drizzle-notification.repository";
import { DrizzleNotificationRecipientResolver } from "@/modules/notifications/infrastructure/drizzle-notification-recipient.resolver";
import type { NotificationRecipientResolver } from "@/modules/notifications/domain/notification-recipient-resolver.interface";
import type { NotificationRecipient } from "@/modules/notifications/domain/notification-policy";
import type { OutboxEnvelope } from "@/infrastructure/outbox/types";

describe("Stage 4.3B Notification Core — durability, idempotency and policy", () => {
  const createdTenantIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdMembershipIds: string[] = [];
  const createdRoleIds: string[] = [];

  async function createTenantOwner(label = "owner") {
    const suffix = randomUUID().slice(0, 8);
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: `notif-${label}-${suffix}`,
        name: `Notification ${label} ${suffix}`,
      })
      .returning();

    const [user] = await db
      .insert(users)
      .values({
        email: `notif-${label}-${suffix}@example.test`,
        emailNormalized: `notif-${label}-${suffix}@example.test`,
        name: `Notification ${label}`,
        status: "ACTIVE",
      })
      .returning();

    const [membership] = await db
      .insert(memberships)
      .values({
        tenantId: tenant.id,
        userId: user.id,
        status: "ACTIVE",
      })
      .returning();

    const [role] = await db
      .insert(roles)
      .values({
        tenantId: tenant.id,
        name: "OWNER",
        description: "Notification test owner",
      })
      .returning();

    await db.insert(membershipRoles).values({
      membershipId: membership.id,
      roleId: role.id,
    });

    createdTenantIds.push(tenant.id);
    createdUserIds.push(user.id);
    createdMembershipIds.push(membership.id);
    createdRoleIds.push(role.id);

    return { tenant, user };
  }

  function envelope(
    tenantId: string,
    eventType = "subscription.invoice.generated.v1",
    payload: Record<string, unknown> = {}
  ): OutboxEnvelope {
    return {
      eventId: randomUUID(),
      eventType,
      eventVersion: 1,
      tenantId,
      locationId: null,
      aggregateId: randomUUID(),
      occurredAt: new Date().toISOString(),
      payload,
      deliveryAttempt: 1,
    };
  }

  function fixedResolver(recipient: NotificationRecipient): NotificationRecipientResolver {
    return {
      async resolve() {
        return [recipient];
      },
    };
  }

  afterEach(async () => {
    if (createdTenantIds.length > 0) {
      const intentRows = await db
        .select({ id: notificationIntents.id })
        .from(notificationIntents)
        .where(inArray(notificationIntents.tenantId, createdTenantIds));
      const intentIds = intentRows.map((row) => row.id);

      if (intentIds.length > 0) {
        await db
          .delete(notificationDeliveries)
          .where(inArray(notificationDeliveries.notificationIntentId, intentIds));
        await db
          .delete(notificationInboxItems)
          .where(inArray(notificationInboxItems.notificationIntentId, intentIds));
        await db
          .delete(notificationIntents)
          .where(inArray(notificationIntents.id, intentIds));
      }

      await db
        .delete(notificationPreferences)
        .where(inArray(notificationPreferences.userId, createdUserIds));
    }

    if (createdMembershipIds.length > 0) {
      await db
        .delete(membershipRoles)
        .where(inArray(membershipRoles.membershipId, createdMembershipIds));
    }
    if (createdRoleIds.length > 0) {
      await db.delete(roles).where(inArray(roles.id, createdRoleIds));
    }
    if (createdMembershipIds.length > 0) {
      await db
        .delete(memberships)
        .where(inArray(memberships.id, createdMembershipIds));
    }
    if (createdUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    if (createdTenantIds.length > 0) {
      await db.delete(tenants).where(inArray(tenants.id, createdTenantIds));
    }

    createdTenantIds.length = 0;
    createdUserIds.length = 0;
    createdMembershipIds.length = 0;
    createdRoleIds.length = 0;
  });

  it("1. 50 concurrent deliveries of the same event create exactly one durable intent for one recipient", async () => {
    const { tenant } = await createTenantOwner("race");
    const repository = new DrizzleNotificationRepository();
    const resolver = new DrizzleNotificationRecipientResolver();
    const useCase = new ProcessNotificationEventUseCase(repository, resolver);
    const event = envelope(tenant.id);

    const results = await Promise.all(
      Array.from({ length: 50 }, () => useCase.execute(event))
    );

    expect(results.reduce((sum, result) => sum + result.intentsCreated, 0)).toBe(1);
    expect(results.reduce((sum, result) => sum + result.duplicatesSkipped, 0)).toBe(49);

    const intents = await db
      .select()
      .from(notificationIntents)
      .where(eq(notificationIntents.sourceEventId, event.eventId));
    expect(intents).toHaveLength(1);

    const deliveries = await db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.notificationIntentId, intents[0].id));
    expect(deliveries).toHaveLength(2);
    expect(deliveries.find((d) => d.channel === "IN_APP")?.status).toBe("DELIVERED");
    expect(deliveries.find((d) => d.channel === "EMAIL")?.status).toBe("PENDING");

    const inbox = await db
      .select()
      .from(notificationInboxItems)
      .where(eq(notificationInboxItems.notificationIntentId, intents[0].id));
    expect(inbox).toHaveLength(1);
  }, 20_000);

  it("2. tenant owner resolution never leaks the notification to an owner of another tenant", async () => {
    const a = await createTenantOwner("tenant-a");
    const b = await createTenantOwner("tenant-b");
    const repository = new DrizzleNotificationRepository();
    const resolver = new DrizzleNotificationRecipientResolver();
    const useCase = new ProcessNotificationEventUseCase(repository, resolver);

    const result = await useCase.execute(envelope(a.tenant.id));
    expect(result.intentsCreated).toBe(1);

    const [intent] = await db
      .select()
      .from(notificationIntents)
      .where(eq(notificationIntents.tenantId, a.tenant.id));
    expect(intent.recipientUserId).toBe(a.user.id);
    expect(intent.recipientUserId).not.toBe(b.user.id);

    const leaked = await db
      .select()
      .from(notificationIntents)
      .where(eq(notificationIntents.recipientUserId, b.user.id));
    expect(leaked).toHaveLength(0);
  });

  it("3. optional channels honor an explicit opt-out and persist SUPPRESSED decisions", async () => {
    const { tenant, user } = await createTenantOwner("optional");
    await db.insert(notificationPreferences).values({
      userId: user.id,
      tenantId: tenant.id,
      category: "APPOINTMENT",
      inAppEnabled: false,
      emailEnabled: false,
      smsEnabled: false,
      whatsappEnabled: false,
    });

    const repository = new DrizzleNotificationRepository();
    const resolver = fixedResolver({
      userId: user.id,
      kind: "USER",
      reference: `user:${user.id}`,
      hasEmail: true,
      hasPhone: true,
      locale: "es-CO",
      timezone: "America/Bogota",
    });
    const useCase = new ProcessNotificationEventUseCase(repository, resolver);

    const result = await useCase.execute(
      envelope(tenant.id, "appointment.completed", {
        secretToken: "DO_NOT_STORE_THIS",
        toStatus: "COMPLETED",
      })
    );

    expect(result.intentsCreated).toBe(1);
    expect(result.inboxItemsCreated).toBe(0);

    const [intent] = await db
      .select()
      .from(notificationIntents)
      .where(eq(notificationIntents.tenantId, tenant.id));
    expect(intent.status).toBe("CANCELLED");

    const deliveries = await db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.notificationIntentId, intent.id));
    expect(deliveries.every((delivery) => delivery.status === "SUPPRESSED")).toBe(true);
  });

  it("4. mandatory appointment cancellation channels cannot be disabled by optional preferences", async () => {
    const { tenant, user } = await createTenantOwner("mandatory");
    await db.insert(notificationPreferences).values({
      userId: user.id,
      tenantId: tenant.id,
      category: "APPOINTMENT",
      inAppEnabled: false,
      emailEnabled: false,
      smsEnabled: false,
      whatsappEnabled: false,
    });

    const repository = new DrizzleNotificationRepository();
    const resolver = fixedResolver({
      userId: user.id,
      kind: "USER",
      reference: `user:${user.id}`,
      hasEmail: true,
      hasPhone: true,
      locale: "es-CO",
      timezone: "America/Bogota",
    });
    const useCase = new ProcessNotificationEventUseCase(repository, resolver);

    await useCase.execute(
      envelope(tenant.id, "appointment.cancelled", {
        reason: "Barber unavailable",
      })
    );

    const [intent] = await db
      .select()
      .from(notificationIntents)
      .where(eq(notificationIntents.tenantId, tenant.id));

    const deliveries = await db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.notificationIntentId, intent.id));

    expect(deliveries.find((d) => d.channel === "IN_APP")?.status).toBe("DELIVERED");
    expect(deliveries.find((d) => d.channel === "EMAIL")?.status).toBe("PENDING");
    expect(deliveries.find((d) => d.channel === "SMS")?.status).toBe("SUPPRESSED");
    expect(deliveries.find((d) => d.channel === "WHATSAPP")?.status).toBe("SUPPRESSED");

    const inbox = await db
      .select()
      .from(notificationInboxItems)
      .where(eq(notificationInboxItems.notificationIntentId, intent.id));
    expect(inbox).toHaveLength(1);
  });

  it("5. unsupported/internal event types are safely ignored", async () => {
    const { tenant } = await createTenantOwner("unsupported");
    const repository = new DrizzleNotificationRepository();
    const resolver = new DrizzleNotificationRecipientResolver();
    const useCase = new ProcessNotificationEventUseCase(repository, resolver);

    const result = await useCase.execute(
      envelope(tenant.id, "payment.intent.created.v1")
    );
    expect(result.status).toBe("SKIPPED_UNSUPPORTED");

    const intents = await db
      .select()
      .from(notificationIntents)
      .where(eq(notificationIntents.tenantId, tenant.id));
    expect(intents).toHaveLength(0);
  });

  it("6. stored template payload is allowlisted and never copies arbitrary outbox secrets", async () => {
    const { tenant, user } = await createTenantOwner("payload");
    const repository = new DrizzleNotificationRepository();
    const resolver = fixedResolver({
      userId: user.id,
      kind: "USER",
      reference: `user:${user.id}`,
      hasEmail: true,
      hasPhone: false,
      locale: "es-CO",
      timezone: "America/Bogota",
    });
    const useCase = new ProcessNotificationEventUseCase(repository, resolver);

    await useCase.execute(
      envelope(tenant.id, "appointment.completed", {
        toStatus: "COMPLETED",
        startsAt: "2030-01-01T10:00:00.000Z",
        secretToken: "super-secret",
        cardNumber: "4111111111111111",
      })
    );

    const [intent] = await db
      .select()
      .from(notificationIntents)
      .where(eq(notificationIntents.tenantId, tenant.id));
    const serialized = JSON.stringify(intent.payload);
    expect(serialized).not.toContain("super-secret");
    expect(serialized).not.toContain("4111111111111111");
    expect(serialized).toContain("COMPLETED");
  });

  it("7. replaying the same event returns the same intent identity rather than duplicating inbox state", async () => {
    const { tenant } = await createTenantOwner("replay");
    const repository = new DrizzleNotificationRepository();
    const resolver = new DrizzleNotificationRecipientResolver();
    const useCase = new ProcessNotificationEventUseCase(repository, resolver);
    const event = envelope(tenant.id, "subscription.cancelled.v1");

    const first = await useCase.execute(event);
    const second = await useCase.execute(event);

    expect(first.intentsCreated).toBe(1);
    expect(second.intentsCreated).toBe(0);
    expect(second.duplicatesSkipped).toBe(1);

    const intents = await db
      .select()
      .from(notificationIntents)
      .where(eq(notificationIntents.sourceEventId, event.eventId));
    expect(intents).toHaveLength(1);

    const inbox = await db
      .select()
      .from(notificationInboxItems)
      .where(eq(notificationInboxItems.notificationIntentId, intents[0].id));
    expect(inbox).toHaveLength(1);
  });

  it("8. subscription.activated.v1 is recognized as a real billing lifecycle event", async () => {
    const { tenant } = await createTenantOwner("activated");
    const repository = new DrizzleNotificationRepository();
    const resolver = new DrizzleNotificationRecipientResolver();
    const useCase = new ProcessNotificationEventUseCase(repository, resolver);

    const result = await useCase.execute(
      envelope(tenant.id, "subscription.activated.v1", {
        status: "ACTIVE",
      })
    );

    expect(result.status).toBe("PROCESSED");
    expect(result.intentsCreated).toBe(1);
  });
});
