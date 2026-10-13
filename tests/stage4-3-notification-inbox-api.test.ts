import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { inArray } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  notificationInboxItems,
  notificationIntents,
  notificationPreferences,
} from "@/infrastructure/database/schema/notifications";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { users } from "@/infrastructure/database/schema/users";
import { DrizzleNotificationInboxRepository } from "@/modules/notifications/infrastructure/drizzle-notification-inbox.repository";

describe("Stage 4.3D-A Notification Inbox & Preferences", () => {
  const userIds: string[] = [];
  const tenantIds: string[] = [];
  const intentIds: string[] = [];

  async function createUser(label: string): Promise<string> {
    const suffix = randomUUID().slice(0, 8);
    const [row] = await db
      .insert(users)
      .values({
        email: `${label}-${suffix}@example.test`,
        emailNormalized: `${label}-${suffix}@example.test`,
        name: `User ${label}`,
      })
      .returning({ id: users.id });
    userIds.push(row.id);
    return row.id;
  }

  async function createTenant(label: string): Promise<string> {
    const suffix = randomUUID().slice(0, 8);
    const [row] = await db
      .insert(tenants)
      .values({
        slug: `notif-api-${label}-${suffix}`,
        name: `Notification API ${label}`,
      })
      .returning({ id: tenants.id });
    tenantIds.push(row.id);
    return row.id;
  }

  async function createInbox(
    userId: string,
    tenantId: string,
    label: string
  ): Promise<string> {
    const [intent] = await db
      .insert(notificationIntents)
      .values({
        sourceEventId: randomUUID(),
        sourceEventType: "appointment.created",
        tenantId,
        recipientUserId: userId,
        recipientKind: "USER",
        recipientReference: `user:${userId}`,
        category: "APPOINTMENT",
        policyKey: "appointment.created.transactional",
        templateKey: "appointment.created",
        templateVersion: 1,
        payload: { label },
        dedupeKey: randomUUID(),
        mandatory: true,
      })
      .returning({ id: notificationIntents.id });
    intentIds.push(intent.id);

    const [inbox] = await db
      .insert(notificationInboxItems)
      .values({
        notificationIntentId: intent.id,
        userId,
        tenantId,
      })
      .returning({ id: notificationInboxItems.id });

    return inbox.id;
  }

  afterEach(async () => {
    if (intentIds.length > 0) {
      await db
        .delete(notificationInboxItems)
        .where(inArray(notificationInboxItems.notificationIntentId, intentIds));
      await db
        .delete(notificationIntents)
        .where(inArray(notificationIntents.id, intentIds));
    }
    if (userIds.length > 0) {
      await db
        .delete(notificationPreferences)
        .where(inArray(notificationPreferences.userId, userIds));
      await db.delete(users).where(inArray(users.id, userIds));
    }
    if (tenantIds.length > 0) {
      await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    }
    intentIds.length = 0;
    userIds.length = 0;
    tenantIds.length = 0;
  });

  it("1. listInbox never returns another user's inbox items", async () => {
    const tenantId = await createTenant("isolation");
    const userA = await createUser("a");
    const userB = await createUser("b");
    await createInbox(userA, tenantId, "A");
    await createInbox(userB, tenantId, "B");

    const repository = new DrizzleNotificationInboxRepository();
    const list = await repository.listInbox({ userId: userA });

    expect(list).toHaveLength(1);
    expect(list[0].payload).toEqual({ label: "A" });
  });

  it("2. tenant filtering is applied in addition to user ownership", async () => {
    const userId = await createUser("tenant-filter");
    const tenantA = await createTenant("tenant-a");
    const tenantB = await createTenant("tenant-b");
    await createInbox(userId, tenantA, "A");
    await createInbox(userId, tenantB, "B");

    const repository = new DrizzleNotificationInboxRepository();
    const list = await repository.listInbox({
      userId,
      tenantId: tenantA,
    });

    expect(list).toHaveLength(1);
    expect(list[0].tenantId).toBe(tenantA);
  });

  it("3. markRead cannot mutate another user's item", async () => {
    const tenantId = await createTenant("read-owner");
    const owner = await createUser("owner");
    const attacker = await createUser("attacker");
    const id = await createInbox(owner, tenantId, "private");

    const repository = new DrizzleNotificationInboxRepository();

    expect(await repository.markRead(id, attacker)).toBe(false);
    expect(await repository.markRead(id, owner)).toBe(true);

    const [item] = await repository.listInbox({
      userId: owner,
      includeArchived: true,
    });
    expect(item.readAt).not.toBeNull();
  });

  it("4. archive cannot mutate another user's item and hides archived by default", async () => {
    const tenantId = await createTenant("archive-owner");
    const owner = await createUser("owner");
    const attacker = await createUser("attacker");
    const id = await createInbox(owner, tenantId, "private");

    const repository = new DrizzleNotificationInboxRepository();
    expect(await repository.archive(id, attacker)).toBe(false);
    expect(await repository.archive(id, owner)).toBe(true);

    expect(await repository.listInbox({ userId: owner })).toHaveLength(0);
    expect(
      await repository.listInbox({ userId: owner, includeArchived: true })
    ).toHaveLength(1);
  });

  it("5. unread count ignores read and archived items", async () => {
    const tenantId = await createTenant("unread");
    const userId = await createUser("unread");
    const one = await createInbox(userId, tenantId, "1");
    const two = await createInbox(userId, tenantId, "2");
    await createInbox(userId, tenantId, "3");

    const repository = new DrizzleNotificationInboxRepository();
    await repository.markRead(one, userId);
    await repository.archive(two, userId);

    expect(await repository.countUnread(userId)).toBe(1);
    expect(await repository.countUnread(userId, tenantId)).toBe(1);
  });

  it("6. global preference upsert updates instead of duplicating", async () => {
    const userId = await createUser("global-pref");
    const repository = new DrizzleNotificationInboxRepository();
    const base = {
      userId,
      tenantId: null,
      category: "appointment",
      inAppEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      whatsappEnabled: false,
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      timezone: "America/Bogota",
      locale: "es-CO",
    };

    const first = await repository.upsertPreference(base);
    const second = await repository.upsertPreference({
      ...base,
      smsEnabled: true,
    });

    expect(second.id).toBe(first.id);
    expect(second.category).toBe("APPOINTMENT");
    expect(second.smsEnabled).toBe(true);
    expect(await repository.listPreferences(userId, null)).toHaveLength(1);
  });

  it("7. tenant-specific preference is distinct from global preference", async () => {
    const userId = await createUser("tenant-pref");
    const tenantId = await createTenant("tenant-pref");
    const repository = new DrizzleNotificationInboxRepository();

    const common = {
      userId,
      category: "PAYMENT",
      inAppEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      whatsappEnabled: false,
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      timezone: "America/Bogota",
      locale: "es-CO",
    };

    await repository.upsertPreference({ ...common, tenantId: null });
    await repository.upsertPreference({
      ...common,
      tenantId,
      emailEnabled: false,
    });

    const list = await repository.listPreferences(userId, tenantId);
    expect(list).toHaveLength(2);
    expect(list.some((item) => item.tenantId === null)).toBe(true);
    expect(
      list.find((item) => item.tenantId === tenantId)?.emailEnabled
    ).toBe(false);
  });

  it("8. inbox limit is bounded and chronological newest-first", async () => {
    const userId = await createUser("limit");
    const tenantId = await createTenant("limit");
    for (let index = 0; index < 3; index += 1) {
      await createInbox(userId, tenantId, String(index));
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const repository = new DrizzleNotificationInboxRepository();
    const list = await repository.listInbox({ userId, limit: 2 });

    expect(list).toHaveLength(2);
    expect(list[0].createdAt.getTime()).toBeGreaterThanOrEqual(
      list[1].createdAt.getTime()
    );
  });
});
