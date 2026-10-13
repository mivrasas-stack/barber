import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { users } from "@/infrastructure/database/schema/users";
import { tenants } from "@/infrastructure/database/schema/tenants";
import {
  professionalProfiles,
  professionalWorkspaces,
} from "@/infrastructure/database/schema/professionals";
import { mediaAssets, mediaVariants } from "@/infrastructure/database/schema/media";
import { AttachProfessionalAvatarUseCase } from "@/modules/professionals/application/attach-professional-avatar.usecase";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleMediaRepository } from "@/modules/media/infrastructure/drizzle-media.repository";

describe("Stage 5D3 Professional Avatar Attachment", () => {
  const userIds: string[] = [];
  const tenantIds: string[] = [];
  const assetIds: string[] = [];

  async function setupProfessional() {
    const suffix = randomUUID().slice(0, 8);
    const [user] = await db.insert(users).values({
      email: `avatar-${suffix}@example.test`,
      emailNormalized: `avatar-${suffix}@example.test`,
      name: `Avatar ${suffix}`,
      status: "ACTIVE",
    }).returning();

    const [tenant] = await db.insert(tenants).values({
      slug: `avatar-${suffix}`,
      name: `Avatar ${suffix}`,
    }).returning();

    const [profile] = await db.insert(professionalProfiles).values({
      userId: user.id,
      professionalSlug: `avatar-${suffix}`,
      displayName: `Avatar ${suffix}`,
    }).returning();

    await db.insert(professionalWorkspaces).values({
      professionalProfileId: profile.id,
      tenantId: tenant.id,
      status: "ACTIVE",
    });

    userIds.push(user.id);
    tenantIds.push(tenant.id);
    return { user, tenant, profile };
  }

  async function createMedia(input: {
    tenantId: string;
    ownerUserId: string;
    purpose?: string;
    status?: string;
  }) {
    const assetId = randomUUID();
    await db.insert(mediaAssets).values({
      id: assetId,
      tenantId: input.tenantId,
      ownerUserId: input.ownerUserId,
      mediaKind: "IMAGE",
      purpose: input.purpose ?? "PROFESSIONAL_AVATAR",
      visibility: "PUBLIC",
      sourceObjectKey: `media/v1/${input.tenantId}/${assetId}/source/avatar.jpg`,
      mimeType: "image/jpeg",
      status: input.status ?? "READY",
    });
    await db.insert(mediaVariants).values({
      mediaAssetId: assetId,
      variantKey: "avatar-256x256-webp",
      objectKey: `media/v1/${input.tenantId}/${assetId}/variants/v1/avatar-256x256-webp.webp`,
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
    return new AttachProfessionalAvatarUseCase(
      new DrizzleProfessionalRepository(),
      new DrizzleMediaRepository()
    );
  }

  afterEach(async () => {
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
    tenantIds.length = 0;
    userIds.length = 0;
  });

  it("1. attaches a READY owned avatar from the same workspace", async () => {
    const { user, tenant, profile } = await setupProfessional();
    const assetId = await createMedia({
      tenantId: tenant.id,
      ownerUserId: user.id,
    });

    const updated = await useCase().execute({
      actorUserId: user.id,
      assetId,
    });

    expect(updated.avatarMediaId).toBe(assetId);

    const [row] = await db
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.id, profile.id))
      .limit(1);
    expect(row.avatarMediaId).toBe(assetId);
  });

  it("2. rejects media owned by another user", async () => {
    const owner = await setupProfessional();
    const other = await setupProfessional();
    const assetId = await createMedia({
      tenantId: owner.tenant.id,
      ownerUserId: other.user.id,
    });

    await expect(
      useCase().execute({ actorUserId: owner.user.id, assetId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("3. rejects media from another tenant even for the same user", async () => {
    const owner = await setupProfessional();
    const foreignTenant = await db.insert(tenants).values({
      slug: `avatar-foreign-${randomUUID().slice(0, 8)}`,
      name: "Foreign",
    }).returning();
    tenantIds.push(foreignTenant[0].id);

    const assetId = await createMedia({
      tenantId: foreignTenant[0].id,
      ownerUserId: owner.user.id,
    });

    await expect(
      useCase().execute({ actorUserId: owner.user.id, assetId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("4. rejects non-avatar purpose", async () => {
    const { user, tenant } = await setupProfessional();
    const assetId = await createMedia({
      tenantId: tenant.id,
      ownerUserId: user.id,
      purpose: "PORTFOLIO",
    });

    await expect(
      useCase().execute({ actorUserId: user.id, assetId })
    ).rejects.toThrow("MEDIA_AVATAR_PURPOSE_INVALID");
  });

  it("5. rejects media that is not READY", async () => {
    const { user, tenant } = await setupProfessional();
    const assetId = await createMedia({
      tenantId: tenant.id,
      ownerUserId: user.id,
      status: "PROCESSING",
    });

    await expect(
      useCase().execute({ actorUserId: user.id, assetId })
    ).rejects.toThrow("MEDIA_AVATAR_NOT_READY");
  });
});
