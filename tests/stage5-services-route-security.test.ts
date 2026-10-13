import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/infrastructure/database/client";
import { users } from "@/infrastructure/database/schema/users";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { roles, membershipRoles } from "@/infrastructure/database/schema/roles";
import { professionalProfiles, professionalWorkspaces } from "@/infrastructure/database/schema/professionals";
import { services } from "@/infrastructure/database/schema/services";
import { UnauthenticatedError } from "@/shared/errors/app-error";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@/modules/media/infrastructure/media-api-auth", () => ({
  requireMediaSession: async () => {
    if (!session.userId) throw new UnauthenticatedError("Missing session");
    return { userId: session.userId };
  },
}));

import { GET, POST } from "@/app/api/v1/professionals/me/services/route";
import { PATCH, DELETE } from "@/app/api/v1/professionals/me/services/[id]/route";

describe("Professional services API tenant and permission boundaries", () => {
  const userIds: string[] = [];
  const tenantIds: string[] = [];
  const serviceIds: string[] = [];
  const suffix = () => randomUUID().slice(0, 9);
  const base = "http://localhost:9002/api/v1/professionals/me/services";
  const getRequest = () => new NextRequest(base);
  const send = (method: string, payload: unknown) =>
    new NextRequest(base, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  const detail = (method: string, id: string, payload?: unknown) => {
    const request = new NextRequest(base + "/" + id, {
      method, ...(method === "PATCH"
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
        : {}),
    });
    return { request, context: { params: Promise.resolve({ id }) } };
  };
  const good = {
    name: "Corte premium", description: "Servicio de prueba",
    duration: 45, price: 35000,
  };

  async function professional(role?: "OWNER") {
    const name = suffix();
    const [user] = await db.insert(users).values({
      email: "service-route-" + name + "@example.test",
      emailNormalized: "service-route-" + name + "@example.test",
      name: "Service " + name, status: "ACTIVE",
    }).returning();
    const [tenant] = await db.insert(tenants).values({
      slug: "service-route-" + name, name: "Services " + name,
    }).returning();
    const [profile] = await db.insert(professionalProfiles).values({
      userId: user.id, professionalSlug: "service-route-" + name,
      displayName: "Services " + name,
    }).returning();
    await db.insert(professionalWorkspaces).values({
      professionalProfileId: profile.id, tenantId: tenant.id, status: "ACTIVE",
    });
    const [membership] = await db.insert(memberships).values({
      userId: user.id, tenantId: tenant.id, status: "ACTIVE",
    }).returning();
    if (role) {
      const [roleRow] = await db.insert(roles).values({
        tenantId: tenant.id, name: role,
      }).returning();
      await db.insert(membershipRoles).values({
        membershipId: membership.id, roleId: roleRow.id,
      });
    }
    userIds.push(user.id);
    tenantIds.push(tenant.id);
    return { user, tenant };
  }

  async function createService(tenantId: string) {
    const [row] = await db.insert(services).values({
      tenantId, slug: "service-" + suffix(), name: "De otro negocio",
      durationMinutes: 30, priceMinor: 18000,
    }).returning();
    serviceIds.push(row.id);
    return row;
  }

  afterEach(async () => {
    session.userId = null;
    if (serviceIds.length) await db.delete(services).where(inArray(services.id, serviceIds));
    if (userIds.length) {
      await db.delete(professionalProfiles).where(inArray(professionalProfiles.userId, userIds));
    }
    if (tenantIds.length) await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
    userIds.length = 0;
    tenantIds.length = 0;
    serviceIds.length = 0;
  });

  it("rejects anonymous list and create requests", async () => {
    expect((await GET(getRequest())).status).toBe(401);
    expect((await POST(send("POST", good))).status).toBe(401);
  });

  it("creates, edits, lists and deactivates tenant services", async () => {
    const actor = await professional("OWNER");
    session.userId = actor.user.id;
    const created = await POST(send("POST", good));
    expect(created.status).toBe(201);
    const createdData = (await created.json()).data;
    serviceIds.push(createdData.id);
    expect(createdData.name).toBe(good.name);
    expect(((await (await GET(getRequest())).json()).data as { id: string }[])
      .some(row => row.id === createdData.id)).toBe(true);
    const updated = detail("PATCH", createdData.id, {
      ...good, name: "Corte actualizado", price: 40000,
    });
    const editResponse = await PATCH(updated.request, updated.context);
    expect(editResponse.status).toBe(200);
    expect((await editResponse.json()).data.price).toBe(40000);
    const remove = detail("DELETE", createdData.id);
    expect((await DELETE(remove.request, remove.context)).status).toBe(200);
    const [row] = await db.select().from(services).where(eq(services.id, createdData.id));
    expect(row.status).toBe("INACTIVE");
    const visible = (await (await GET(getRequest())).json()).data as { id: string }[];
    expect(visible.some(item => item.id === createdData.id)).toBe(false);
  });

  it("cannot edit or deactivate another tenant's service", async () => {
    const owner = await professional("OWNER");
    const other = await professional("OWNER");
    const foreign = await createService(other.tenant.id);
    session.userId = owner.user.id;
    const update = detail("PATCH", foreign.id, good);
    const remove = detail("DELETE", foreign.id);
    expect((await PATCH(update.request, update.context)).status).toBe(404);
    expect((await DELETE(remove.request, remove.context)).status).toBe(404);
    const [saved] = await db.select().from(services).where(eq(services.id, foreign.id));
    expect(saved.status).toBe("ACTIVE");
  });

  it("does not allow service writes without management role", async () => {
    const actor = await professional();
    session.userId = actor.user.id;
    expect((await GET(getRequest())).status).toBe(200);
    expect((await POST(send("POST", good))).status).toBe(403);
  });

  it("validates service payloads and identifiers", async () => {
    const actor = await professional("OWNER");
    session.userId = actor.user.id;
    expect((await POST(send("POST", { ...good, price: -1 }))).status).toBe(400);
    const update = detail("PATCH", "invalid", good);
    expect((await PATCH(update.request, update.context)).status).toBe(400);
  });

  it("blocks access for suspended tenant membership", async () => {
    const actor = await professional("OWNER");
    session.userId = actor.user.id;
    await db.update(memberships).set({ status: "SUSPENDED" })
      .where(eq(memberships.userId, actor.user.id));
    expect((await GET(getRequest())).status).toBe(403);
    expect((await POST(send("POST", good))).status).toBe(403);
  });
});
