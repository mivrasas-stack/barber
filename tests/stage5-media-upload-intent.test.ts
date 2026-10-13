import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  mediaAssets,
  mediaUploadIntents,
  mediaVariants,
} from "@/infrastructure/database/schema/media";
import { users } from "@/infrastructure/database/schema/users";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { roles, membershipRoles } from "@/infrastructure/database/schema/roles";
import { CreateMediaUploadIntentUseCase } from "@/modules/media/application/create-media-upload-intent.usecase";
import { DrizzleMediaRepository } from "@/modules/media/infrastructure/drizzle-media.repository";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";
import { InMemoryObjectStorage } from "@/infrastructure/media/in-memory-object-storage";

describe("Stage 5B3 Media Signed Upload Intent & Authorization", () => {
  const tenantIds: string[] = [];
  const userIds: string[] = [];
  const membershipIds: string[] = [];
  const roleIds: string[] = [];

  async function createActor(roleName = "EMPLOYEE") {
    const suffix = randomUUID().slice(0, 8);
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: `media-${suffix}`,
        name: `Media ${suffix}`,
      })
      .returning();

    const [user] = await db
      .insert(users)
      .values({
        email: `media-${suffix}@example.test`,
        emailNormalized: `media-${suffix}@example.test`,
        name: `Media ${suffix}`,
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
        name: roleName,
        description: "Stage 5 media test role",
      })
      .returning();

    await db.insert(membershipRoles).values({
      membershipId: membership.id,
      roleId: role.id,
    });

    tenantIds.push(tenant.id);
    userIds.push(user.id);
    membershipIds.push(membership.id);
    roleIds.push(role.id);

    return { tenant, user };
  }

  function createUseCase() {
    return new CreateMediaUploadIntentUseCase(
      new DrizzleMediaRepository(),
      new InMemoryObjectStorage(),
      new DrizzleAuthorizationRepository()
    );
  }

  afterEach(async () => {
    if (tenantIds.length > 0) {
      const assets = await db
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(inArray(mediaAssets.tenantId, tenantIds));
      const assetIds = assets.map((row) => row.id);

      if (assetIds.length > 0) {
        await db
          .delete(mediaVariants)
          .where(inArray(mediaVariants.mediaAssetId, assetIds));
        await db
          .delete(mediaUploadIntents)
          .where(inArray(mediaUploadIntents.mediaAssetId, assetIds));
        await db.delete(mediaAssets).where(inArray(mediaAssets.id, assetIds));
      }
    }

    if (membershipIds.length > 0) {
      await db.delete(membershipRoles).where(inArray(membershipRoles.membershipId, membershipIds));
      await db.delete(memberships).where(inArray(memberships.id, membershipIds));
    }
    if (roleIds.length > 0) {
      await db.delete(roles).where(inArray(roles.id, roleIds));
    }
    if (userIds.length > 0) {
      await db.delete(users).where(inArray(users.id, userIds));
    }
    if (tenantIds.length > 0) {
      await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    }

    tenantIds.length = 0;
    userIds.length = 0;
    membershipIds.length = 0;
    roleIds.length = 0;
  });

  it("1. active member can create a durable signed intent for own professional avatar", async () => {
    const { tenant, user } = await createActor("EMPLOYEE");
    const result = await createUseCase().execute({
      actorUserId: user.id,
      tenantId: tenant.id,
      purpose: "PROFESSIONAL_AVATAR",
      contentType: "image/jpeg",
      sizeBytes: 500_000,
      originalFilename: "../../my avatar.jpg",
    });

    expect(result.method).toBe("PUT");
    expect(result.maxBytes).toBe(10 * 1024 * 1024);
    expect(result.uploadUrl).not.toContain("my%20avatar");
    expect(result.uploadUrl).not.toContain(user.email);

    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, result.assetId))
      .limit(1);
    const [intent] = await db
      .select()
      .from(mediaUploadIntents)
      .where(eq(mediaUploadIntents.id, result.uploadIntentId))
      .limit(1);

    expect(asset.status).toBe("UPLOADING");
    expect(asset.ownerUserId).toBe(user.id);
    expect(asset.originalFilename).toBe("my avatar.jpg");
    expect(asset.sourceObjectKey).toMatch(/^media\/v1\//);
    expect(intent.mediaAssetId).toBe(asset.id);
    expect(intent.objectKey).toBe(asset.sourceObjectKey);
  });

  it("2. foreign tenant id is rejected and persists no media", async () => {
    const actor = await createActor("EMPLOYEE");
    const foreign = await createActor("OWNER");

    await expect(
      createUseCase().execute({
        actorUserId: actor.user.id,
        tenantId: foreign.tenant.id,
        purpose: "PROFESSIONAL_AVATAR",
        contentType: "image/jpeg",
        sizeBytes: 1000,
      })
    ).rejects.toThrow("Active tenant membership is required");

    const rows = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.tenantId, foreign.tenant.id));
    expect(rows).toHaveLength(0);
  });

  it("3. ordinary member cannot upload tenant logo", async () => {
    const { tenant, user } = await createActor("EMPLOYEE");

    await expect(
      createUseCase().execute({
        actorUserId: user.id,
        tenantId: tenant.id,
        purpose: "TENANT_LOGO",
        contentType: "image/png",
        sizeBytes: 1000,
      })
    ).rejects.toThrow("Tenant media management permission is required");
  });

  it("4. tenant OWNER can upload tenant logo", async () => {
    const { tenant, user } = await createActor("OWNER");

    const result = await createUseCase().execute({
      actorUserId: user.id,
      tenantId: tenant.id,
      purpose: "TENANT_LOGO",
      contentType: "image/png",
      sizeBytes: 1000,
    });

    expect(result.assetId).toBeTruthy();
  });

  it("5. SVG and unsupported purpose fail closed", async () => {
    const { tenant, user } = await createActor("OWNER");

    await expect(
      createUseCase().execute({
        actorUserId: user.id,
        tenantId: tenant.id,
        purpose: "PORTFOLIO",
        contentType: "image/svg+xml",
        sizeBytes: 1000,
      })
    ).rejects.toThrow("MEDIA_CONTENT_TYPE_NOT_ALLOWED");

    await expect(
      createUseCase().execute({
        actorUserId: user.id,
        tenantId: tenant.id,
        purpose: "ATTACHMENT",
        contentType: "image/jpeg",
        sizeBytes: 1000,
      })
    ).rejects.toThrow("MEDIA_PURPOSE_NOT_ENABLED");
  });

  it("6. purpose-specific byte ceiling rejects oversized upload before signing/persistence", async () => {
    const { tenant, user } = await createActor("OWNER");

    await expect(
      createUseCase().execute({
        actorUserId: user.id,
        tenantId: tenant.id,
        purpose: "PROFESSIONAL_AVATAR",
        contentType: "image/jpeg",
        sizeBytes: 10 * 1024 * 1024 + 1,
      })
    ).rejects.toThrow("MEDIA_SIZE_EXCEEDS_PURPOSE_LIMIT");

    const rows = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.tenantId, tenant.id));
    expect(rows).toHaveLength(0);
  });
});
