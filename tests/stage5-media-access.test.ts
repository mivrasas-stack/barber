import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { mediaAssets, mediaVariants } from "@/infrastructure/database/schema/media";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { users } from "@/infrastructure/database/schema/users";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { roles, membershipRoles } from "@/infrastructure/database/schema/roles";
import { ResolveMediaDeliveryUseCase } from "@/modules/media/application/resolve-media-delivery.usecase";
import { DrizzleMediaRepository } from "@/modules/media/infrastructure/drizzle-media.repository";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";
import { InMemoryObjectStorage } from "@/infrastructure/media/in-memory-object-storage";
import { MediaDeliveryUrlResolver } from "@/infrastructure/media/media-delivery-url-resolver";

describe("Stage 5D2 Authorized Media Delivery", () => {
  const tenantIds: string[] = [];
  const userIds: string[] = [];
  const membershipIds: string[] = [];
  const roleIds: string[] = [];
  const assetIds: string[] = [];

  async function createTenant() {
    const suffix = randomUUID().slice(0, 8);
    const [tenant] = await db
      .insert(tenants)
      .values({ slug: `media-access-${suffix}`, name: `Media Access ${suffix}` })
      .returning();
    tenantIds.push(tenant.id);
    return tenant;
  }

  async function createMember(tenantId: string, roleName = "EMPLOYEE") {
    const suffix = randomUUID().slice(0, 8);
    const [user] = await db
      .insert(users)
      .values({
        email: `media-access-${suffix}@example.test`,
        emailNormalized: `media-access-${suffix}@example.test`,
        name: `Media Access ${suffix}`,
        status: "ACTIVE",
      })
      .returning();

    const [membership] = await db
      .insert(memberships)
      .values({ tenantId, userId: user.id, status: "ACTIVE" })
      .returning();

    const [role] = await db
      .insert(roles)
      .values({
        tenantId,
        name: roleName === "MANAGER" ? "MANAGER" : `EMPLOYEE-${suffix}`,
        description: "Media access test role",
      })
      .returning();

    await db.insert(membershipRoles).values({
      membershipId: membership.id,
      roleId: role.id,
    });

    userIds.push(user.id);
    membershipIds.push(membership.id);
    roleIds.push(role.id);
    return user;
  }

  async function createReadyMedia(input: {
    tenantId: string;
    ownerUserId?: string | null;
    visibility: "PUBLIC" | "TENANT" | "PRIVATE";
    status?: "READY" | "PROCESSING";
  }) {
    const assetId = randomUUID();
    const objectKey = `media/v1/${input.tenantId}/${assetId}/variants/v1/avatar-256x256-webp.webp`;
    await db.insert(mediaAssets).values({
      id: assetId,
      tenantId: input.tenantId,
      ownerUserId: input.ownerUserId ?? null,
      mediaKind: "IMAGE",
      purpose: "PROFESSIONAL_AVATAR",
      visibility: input.visibility,
      sourceObjectKey: `media/v1/${input.tenantId}/${assetId}/source/source.jpg`,
      mimeType: "image/jpeg",
      status: input.status ?? "READY",
    });
    await db.insert(mediaVariants).values({
      mediaAssetId: assetId,
      variantKey: "avatar-256x256-webp",
      objectKey,
      mimeType: "image/webp",
      width: 256,
      height: 256,
      sizeBytes: 100,
      checksumSha256: "a".repeat(64),
    });
    assetIds.push(assetId);
    return assetId;
  }

  function useCase() {
    return new ResolveMediaDeliveryUseCase(
      new DrizzleMediaRepository(),
      new DrizzleAuthorizationRepository(),
      new MediaDeliveryUrlResolver(
        new InMemoryObjectStorage(),
        "https://cdn.example.test"
      )
    );
  }

  afterEach(async () => {
    if (assetIds.length) {
      await db.delete(mediaVariants).where(inArray(mediaVariants.mediaAssetId, assetIds));
      await db.delete(mediaAssets).where(inArray(mediaAssets.id, assetIds));
    }
    if (membershipIds.length) {
      await db.delete(membershipRoles).where(inArray(membershipRoles.membershipId, membershipIds));
      await db.delete(memberships).where(inArray(memberships.id, membershipIds));
    }
    if (roleIds.length) await db.delete(roles).where(inArray(roles.id, roleIds));
    if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
    if (tenantIds.length) await db.delete(tenants).where(inArray(tenants.id, tenantIds));

    assetIds.length = 0;
    membershipIds.length = 0;
    roleIds.length = 0;
    userIds.length = 0;
    tenantIds.length = 0;
  });

  it("1. PUBLIC READY media resolves anonymously through CDN", async () => {
    const tenant = await createTenant();
    const assetId = await createReadyMedia({
      tenantId: tenant.id,
      visibility: "PUBLIC",
    });

    const result = await useCase().execute({ assetId });

    expect(result.url).toContain("https://cdn.example.test/media/v1/");
    expect(result.cacheable).toBe(true);
    expect(result.expiresAt).toBeNull();
  });

  it("2. TENANT media requires an active membership", async () => {
    const tenant = await createTenant();
    const member = await createMember(tenant.id);
    const assetId = await createReadyMedia({
      tenantId: tenant.id,
      visibility: "TENANT",
    });

    await expect(useCase().execute({ assetId })).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });

    const result = await useCase().execute({
      assetId,
      actorUserId: member.id,
    });
    expect(result.cacheable).toBe(false);
    expect(result.url).toContain("storage.invalid/read/");
  });

  it("3. cross-tenant member cannot resolve TENANT media", async () => {
    const tenant = await createTenant();
    const foreignTenant = await createTenant();
    const foreignUser = await createMember(foreignTenant.id);
    const assetId = await createReadyMedia({
      tenantId: tenant.id,
      visibility: "TENANT",
    });

    await expect(
      useCase().execute({ assetId, actorUserId: foreignUser.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("4. PRIVATE media allows owner but rejects unrelated ordinary member", async () => {
    const tenant = await createTenant();
    const owner = await createMember(tenant.id);
    const other = await createMember(tenant.id);
    const assetId = await createReadyMedia({
      tenantId: tenant.id,
      ownerUserId: owner.id,
      visibility: "PRIVATE",
    });

    await expect(
      useCase().execute({ assetId, actorUserId: other.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const result = await useCase().execute({
      assetId,
      actorUserId: owner.id,
    });
    expect(result.cacheable).toBe(false);
  });

  it("5. tenant MANAGER can resolve another user's PRIVATE media", async () => {
    const tenant = await createTenant();
    const owner = await createMember(tenant.id);
    const manager = await createMember(tenant.id, "MANAGER");
    const assetId = await createReadyMedia({
      tenantId: tenant.id,
      ownerUserId: owner.id,
      visibility: "PRIVATE",
    });

    const result = await useCase().execute({
      assetId,
      actorUserId: manager.id,
    });
    expect(result.assetId).toBe(assetId);
  });

  it("6. non-READY media is never delivered", async () => {
    const tenant = await createTenant();
    const assetId = await createReadyMedia({
      tenantId: tenant.id,
      visibility: "PUBLIC",
      status: "PROCESSING",
    });

    await expect(useCase().execute({ assetId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
