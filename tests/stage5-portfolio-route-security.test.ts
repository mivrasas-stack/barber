import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/infrastructure/database/client";
import { users } from "@/infrastructure/database/schema/users";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { professionalProfiles, professionalWorkspaces } from "@/infrastructure/database/schema/professionals";
import { mediaAssets, mediaVariants } from "@/infrastructure/database/schema/media";
import { UnauthenticatedError } from "@/shared/errors/app-error";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@/modules/media/infrastructure/media-api-auth", () => ({
  requireMediaSession: async () => {
    if (!session.userId) throw new UnauthenticatedError("Missing session");
    return { userId: session.userId };
  },
}));
vi.mock("@/infrastructure/media/media-storage-runtime", () => ({
  getMediaDeliveryUrlResolver: () => ({
    resolve: async (key: string, visibility: string) => ({ url: visibility + ":" + key }),
  }),
}));

import { GET, DELETE } from "@/app/api/v1/professionals/me/portfolio/route";

describe("Portfolio API authorization, isolation and visibility", () => {
  const userIds: string[] = [];
  const tenantIds: string[] = [];
  const assetIds: string[] = [];
  const suffix = () => randomUUID().slice(0, 9);
  const getRequest = () => new NextRequest("http://localhost:9002/api/v1/professionals/me/portfolio");
  const deleteRequest = (body: unknown) => new NextRequest(
    "http://localhost:9002/api/v1/professionals/me/portfolio",
    { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  async function professional() {
    const name = suffix();
    const [user] = await db.insert(users).values({
      email: "portfolio-" + name + "@example.test",
      emailNormalized: "portfolio-" + name + "@example.test",
      name: "Portfolio " + name, status: "ACTIVE",
    }).returning();
    const [tenant] = await db.insert(tenants).values({
      slug: "portfolio-" + name, name: "Portfolio " + name,
    }).returning();
    const [profile] = await db.insert(professionalProfiles).values({
      userId: user.id, professionalSlug: "portfolio-" + name, displayName: "Portfolio " + name,
    }).returning();
    await db.insert(professionalWorkspaces).values({
      professionalProfileId: profile.id, tenantId: tenant.id, status: "ACTIVE",
    });
    await db.insert(memberships).values({
      userId: user.id, tenantId: tenant.id, status: "ACTIVE",
    });
    userIds.push(user.id);
    tenantIds.push(tenant.id);
    return { user, tenant, profile };
  }

  async function asset(options: {
    tenantId: string; ownerUserId: string; purpose?: string;
    status?: string; visibility?: string; deletedAt?: Date;
  }) {
    const id = randomUUID();
    await db.insert(mediaAssets).values({
      id, tenantId: options.tenantId, ownerUserId: options.ownerUserId,
      purpose: options.purpose ?? "PORTFOLIO", status: options.status ?? "READY",
      visibility: options.visibility ?? "PUBLIC", mediaKind: "IMAGE",
      sourceObjectKey: "portfolio-tests/" + id + "/source.jpg",
      mimeType: "image/jpeg", deletedAt: options.deletedAt,
    });
    await db.insert(mediaVariants).values({
      mediaAssetId: id, variantKey: "portfolio-640w-webp",
      objectKey: "portfolio-tests/" + id + "/image.webp", mimeType: "image/webp",
      width: 640, height: 640, sizeBytes: 100, checksumSha256: "b".repeat(64),
    });
    assetIds.push(id);
    return id;
  }

  afterEach(async () => {
    session.userId = null;
    if (assetIds.length) {
      await db.delete(mediaVariants).where(inArray(mediaVariants.mediaAssetId, assetIds));
      await db.delete(mediaAssets).where(inArray(mediaAssets.id, assetIds));
    }
    if (userIds.length) {
      await db.delete(professionalProfiles).where(inArray(professionalProfiles.userId, userIds));
    }
    if (tenantIds.length) await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
    assetIds.length = 0;
    userIds.length = 0;
    tenantIds.length = 0;
  });

  it("rejects anonymous requests", async () => {
    expect((await GET(getRequest())).status).toBe(401);
    expect((await DELETE(deleteRequest({ assetId: randomUUID() }))).status).toBe(401);
  });

  it("lists only owned READY portfolio photos and respects private delivery", async () => {
    const mine = await professional();
    const other = await professional();
    session.userId = mine.user.id;
    const publicId = await asset({ tenantId: mine.tenant.id, ownerUserId: mine.user.id });
    const privateId = await asset({
      tenantId: mine.tenant.id, ownerUserId: mine.user.id, visibility: "PRIVATE",
    });
    await asset({ tenantId: mine.tenant.id, ownerUserId: mine.user.id, status: "UPLOADED" });
    await asset({ tenantId: mine.tenant.id, ownerUserId: other.user.id });
    await asset({ tenantId: other.tenant.id, ownerUserId: mine.user.id });
    await asset({ tenantId: mine.tenant.id, ownerUserId: mine.user.id, purpose: "PRODUCT_IMAGE" });
    await asset({ tenantId: mine.tenant.id, ownerUserId: mine.user.id, deletedAt: new Date() });
    const response = await GET(getRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const data = (await response.json()).data as { id: string; url: string }[];
    expect(data).toHaveLength(2);
    expect(data.find(item => item.id === publicId)?.url).toMatch(/^PUBLIC:/);
    expect(data.find(item => item.id === privateId)?.url).toMatch(/^PRIVATE:/);
  });

  it("allows soft deleting own image but never another owner, tenant or purpose", async () => {
    const mine = await professional();
    const other = await professional();
    session.userId = mine.user.id;
    const ownId = await asset({ tenantId: mine.tenant.id, ownerUserId: mine.user.id });
    const foreignUserId = await asset({ tenantId: mine.tenant.id, ownerUserId: other.user.id });
    const foreignTenantId = await asset({ tenantId: other.tenant.id, ownerUserId: mine.user.id });
    const productId = await asset({
      tenantId: mine.tenant.id, ownerUserId: mine.user.id, purpose: "PRODUCT_IMAGE",
    });
    for (const id of [foreignUserId, foreignTenantId, productId]) {
      expect((await DELETE(deleteRequest({ assetId: id }))).status).toBe(404);
    }
    expect((await DELETE(deleteRequest({ assetId: ownId }))).status).toBe(200);
    const [saved] = await db.select({ deletedAt: mediaAssets.deletedAt })
      .from(mediaAssets).where(eq(mediaAssets.id, ownId));
    expect(saved.deletedAt).toBeInstanceOf(Date);
    expect((await DELETE(deleteRequest({ assetId: ownId }))).status).toBe(404);
    expect((await GET(getRequest())).status).toBe(200);
    expect((await (await GET(getRequest())).json()).data).toEqual([]);
  });

  it("denies portfolio access after tenant membership is suspended", async () => {
    const mine = await professional();
    session.userId = mine.user.id;
    const id = await asset({ tenantId: mine.tenant.id, ownerUserId: mine.user.id });
    await db.update(memberships).set({ status: "SUSPENDED" })
      .where(eq(memberships.userId, mine.user.id));
    expect((await GET(getRequest())).status).toBe(403);
    expect((await DELETE(deleteRequest({ assetId: id }))).status).toBe(403);
  });

  it("validates the portfolio asset id", async () => {
    const mine = await professional();
    session.userId = mine.user.id;
    expect((await DELETE(deleteRequest({ assetId: "not-a-uuid" }))).status).toBe(400);
  });
});
