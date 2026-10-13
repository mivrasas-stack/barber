import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { appointments } from "@/infrastructure/database/schema/appointments";
import { locations } from "@/infrastructure/database/schema/locations";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { staffProfiles } from "@/infrastructure/database/schema/staff";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { users } from "@/infrastructure/database/schema/users";
import type { OutboxEnvelope } from "@/infrastructure/outbox/types";
import { DrizzleNotificationRecipientResolver } from "@/modules/notifications/infrastructure/drizzle-notification-recipient.resolver";
import {
  DrizzleNotificationDestinationResolver,
  hashNotificationDestination,
  maskEmail,
  maskPhone,
  normalizeEmail,
  normalizePhone,
} from "@/modules/notifications/infrastructure/drizzle-notification-destination.resolver";
import type { ClaimedNotificationDelivery } from "@/modules/notifications/domain/notification-delivery-repository.interface";

describe("Stage 4.3C2-A Notification Destination Resolution", () => {
  const tenantIds: string[] = [];
  const locationIds: string[] = [];
  const userIds: string[] = [];
  const membershipIds: string[] = [];
  const staffIds: string[] = [];
  const appointmentIds: string[] = [];

  let tenantId: string;
  let otherTenantId: string;
  let locationId: string;
  let customerUserId: string;
  let appointmentId: string;
  let fallbackAppointmentId: string;

  beforeAll(async () => {
    const suffix = randomUUID().slice(0, 8);

    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: `notif-dest-${suffix}`,
        name: `Notification Destination ${suffix}`,
        defaultTimezone: "America/Bogota",
      })
      .returning({ id: tenants.id });
    tenantId = tenant.id;
    tenantIds.push(tenant.id);

    const [otherTenant] = await db
      .insert(tenants)
      .values({
        slug: `notif-dest-other-${suffix}`,
        name: `Notification Destination Other ${suffix}`,
      })
      .returning({ id: tenants.id });
    otherTenantId = otherTenant.id;
    tenantIds.push(otherTenant.id);

    const [location] = await db
      .insert(locations)
      .values({
        tenantId,
        slug: `main-${suffix}`,
        name: "Main",
        timezone: "America/Bogota",
      })
      .returning({ id: locations.id });
    locationId = location.id;
    locationIds.push(location.id);

    const [customer] = await db
      .insert(users)
      .values({
        email: `Customer.${suffix}@Example.TEST`,
        emailNormalized: `customer.${suffix}@example.test`,
        name: "Destination Customer",
        status: "ACTIVE",
      })
      .returning({ id: users.id });
    customerUserId = customer.id;
    userIds.push(customer.id);

    const [staffUser] = await db
      .insert(users)
      .values({
        email: `staff.${suffix}@example.test`,
        emailNormalized: `staff.${suffix}@example.test`,
        name: "Destination Staff",
        status: "ACTIVE",
      })
      .returning({ id: users.id });
    userIds.push(staffUser.id);

    const [membership] = await db
      .insert(memberships)
      .values({
        tenantId,
        userId: staffUser.id,
        status: "ACTIVE",
      })
      .returning({ id: memberships.id });
    membershipIds.push(membership.id);

    const [staff] = await db
      .insert(staffProfiles)
      .values({
        tenantId,
        membershipId: membership.id,
        displayName: "Destination Barber",
        status: "ACTIVE",
      })
      .returning({ id: staffProfiles.id });
    staffIds.push(staff.id);

    const baseAppointment = {
      tenantId,
      locationId,
      customerUserId,
      customerNameSnapshot: "Customer Snapshot",
      customerPhoneSnapshot: "+57 (300) 123-4567",
      staffId: staff.id,
      status: "PENDING",
      startsAt: new Date("2030-01-15T15:00:00.000Z"),
      endsAt: new Date("2030-01-15T16:00:00.000Z"),
      timezone: "America/Bogota",
      source: "ONLINE",
    };

    const [appointment] = await db
      .insert(appointments)
      .values({
        ...baseAppointment,
        customerEmailSnapshot: ` Snapshot.${suffix}@Example.TEST `,
      })
      .returning({ id: appointments.id });
    appointmentId = appointment.id;
    appointmentIds.push(appointment.id);

    const [fallbackAppointment] = await db
      .insert(appointments)
      .values({
        ...baseAppointment,
        customerEmailSnapshot: null,
        startsAt: new Date("2030-01-16T15:00:00.000Z"),
        endsAt: new Date("2030-01-16T16:00:00.000Z"),
      })
      .returning({ id: appointments.id });
    fallbackAppointmentId = fallbackAppointment.id;
    appointmentIds.push(fallbackAppointment.id);
  });

  afterAll(async () => {
    if (appointmentIds.length > 0) {
      await db
        .delete(appointments)
        .where(inArray(appointments.id, appointmentIds));
    }
    if (staffIds.length > 0) {
      await db
        .delete(staffProfiles)
        .where(inArray(staffProfiles.id, staffIds));
    }
    if (membershipIds.length > 0) {
      await db
        .delete(memberships)
        .where(inArray(memberships.id, membershipIds));
    }
    if (locationIds.length > 0) {
      await db
        .delete(locations)
        .where(inArray(locations.id, locationIds));
    }
    if (userIds.length > 0) {
      await db.delete(users).where(inArray(users.id, userIds));
    }
    if (tenantIds.length > 0) {
      await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    }
  });

  function claimed(
    channel: "EMAIL" | "SMS" | "WHATSAPP",
    options: {
      reference?: string;
      tenant?: string;
      userId?: string | null;
    } = {}
  ): ClaimedNotificationDelivery {
    const now = new Date("2030-01-01T10:00:00.000Z");
    return {
      id: randomUUID(),
      notificationIntentId: randomUUID(),
      sourceEventId: randomUUID(),
      sourceEventType: "appointment.created",
      tenantId: options.tenant ?? tenantId,
      locationId,
      recipientUserId:
        options.userId === undefined ? customerUserId : options.userId,
      recipientKind: "USER",
      recipientReference:
        options.reference ?? `appointment:${appointmentId}`,
      category: "APPOINTMENT",
      policyKey: "appointment.created.transactional",
      templateKey: "appointment.created",
      templateVersion: 1,
      locale: "es-CO",
      timezone: "America/Bogota",
      payload: {
        appointmentId,
      },
      mandatory: true,
      channel,
      status: "PROCESSING",
      destinationHash: null,
      destinationMasked: null,
      provider: null,
      providerMessageId: null,
      attempts: 1,
      maxAttempts: 8,
      nextAttemptAt: now,
      lockedAt: now,
      lockedBy: "worker-destination",
      lockExpiresAt: new Date(now.getTime() + 30_000),
      sentAt: null,
      deliveredAt: null,
      failedAt: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  it("1. appointment recipients keep appointment reference even when linked to a user", async () => {
    const resolver = new DrizzleNotificationRecipientResolver();
    const envelope: OutboxEnvelope = {
      eventId: randomUUID(),
      eventType: "appointment.created",
      eventVersion: 1,
      tenantId,
      locationId,
      aggregateId: appointmentId,
      occurredAt: new Date().toISOString(),
      payload: {},
      deliveryAttempt: 1,
    };

    const recipients = await resolver.resolve(
      envelope,
      "APPOINTMENT_CUSTOMER"
    );

    expect(recipients).toHaveLength(1);
    expect(recipients[0].userId).toBe(customerUserId);
    expect(recipients[0].reference).toBe(
      `appointment:${appointmentId}`
    );
    expect(recipients[0].hasEmail).toBe(true);
    expect(recipients[0].hasPhone).toBe(true);
  });

  it("2. EMAIL uses the transactional appointment snapshot and stores only hash/mask metadata", async () => {
    const resolver = new DrizzleNotificationDestinationResolver();
    const result = await resolver.resolve(claimed("EMAIL"));

    expect(result).not.toBeNull();
    expect(result?.destination).toMatch(/^snapshot\..+@example\.test$/);
    expect(result?.source).toBe("APPOINTMENT_SNAPSHOT");
    expect(result?.destinationMasked).toMatch(/^s\*\*\*@example\.test$/);
    expect(result?.destinationHash).toBe(
      hashNotificationDestination(result!.destination)
    );
    expect(result?.destinationHash).not.toContain("@");
  });

  it("3. SMS and WhatsApp normalize phone snapshots without persisting the raw formatting", async () => {
    const resolver = new DrizzleNotificationDestinationResolver();

    const sms = await resolver.resolve(claimed("SMS"));
    const whatsapp = await resolver.resolve(claimed("WHATSAPP"));

    expect(sms?.destination).toBe("+573001234567");
    expect(whatsapp?.destination).toBe("+573001234567");
    expect(sms?.destinationMasked).toBe("***4567");
    expect(sms?.destinationHash).toBe(
      hashNotificationDestination("+573001234567")
    );
  });

  it("4. structured appointment references never cross tenant boundaries", async () => {
    const resolver = new DrizzleNotificationDestinationResolver();

    const result = await resolver.resolve(
      claimed("EMAIL", {
        tenant: otherTenantId,
      })
    );

    expect(result).toBeNull();
  });

  it("5. appointment email may safely fall back to the linked active user when the snapshot is empty", async () => {
    const resolver = new DrizzleNotificationDestinationResolver();

    const result = await resolver.resolve(
      claimed("EMAIL", {
        reference: `appointment:${fallbackAppointmentId}`,
      })
    );

    expect(result?.source).toBe("USER");
    expect(result?.destination).toMatch(/^customer\..+@example\.test$/);
  });

  it("6. generic user references resolve email but never invent a phone destination", async () => {
    const resolver = new DrizzleNotificationDestinationResolver();

    const email = await resolver.resolve(
      claimed("EMAIL", {
        reference: `user:${customerUserId}`,
      })
    );
    const sms = await resolver.resolve(
      claimed("SMS", {
        reference: `user:${customerUserId}`,
      })
    );

    expect(email?.source).toBe("USER");
    expect(email?.destination).toMatch(/^customer\..+@example\.test$/);
    expect(sms).toBeNull();
  });

  it("7. normalization and masking helpers are deterministic and PII-minimizing", () => {
    expect(normalizeEmail(" User.Name@Example.COM ")).toBe(
      "user.name@example.com"
    );
    expect(maskEmail("user.name@example.com")).toBe("u***@example.com");

    expect(normalizePhone("00 57 (300) 123-4567")).toBe(
      "+573001234567"
    );
    expect(maskPhone("+573001234567")).toBe("***4567");

    const hash = hashNotificationDestination("user.name@example.com");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
