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
import { CompleteMediaUploadUseCase } from "@/modules/media/application/complete-media-upload.usecase";
import { DrizzleMediaRepository } from "@/modules/media/infrastructure/drizzle-media.repository";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";
import { InMemoryObjectStorage } from "@/infrastructure/media/in-memory-object-storage";

describe("Stage 5B4 Media Upload Completion & Idempotency", () => {
  const tenantIds: string[] = [];
  const userIds: string[] = [];
  const membershipIds: string[] = [];
  const roleIds: string[] = [];

  async function createActor(roleName = "EMPLOYEE") {
    const suffix = randomUUID().slice(0, 8);
    const [tenant] = await db
      .insert(tenants)
      .values({ slug: `media-complete-${suffix}`, name: `Media Complete ${suffix}` })
      .returning();

    const [user] = await db
      .insert(users)
      .values({
        email: `media-complete-${suffix}@example.test`,
        emailNormalized: `media-complete-${suffix}@example.test`,
        name: `Media Complete ${suffix}`,
        status: "ACTIVE",
      })
      .returning();

    const [membership] = await db
      .insert(memberships)
      .values({ tenantId: tenant.id, userId: user.id, status: "ACTIVE" })
      .returning();

    const [role] = await db
      .insert(roles)
      .values({
        tenantId: tenant.id,
        name: roleName,
        description: "Stage 5 completion test role",
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

  function createMediaUseCases(storage: InMemoryObjectStorage) {
    const repo = new DrizzleMediaRepository();
    const auth = new DrizzleAuthorizationRepository();
    return {
      create: new CreateMediaUploadIntentUseCase(repo, storage, auth),
      complete: new CompleteMediaUploadUseCase(repo, storage, auth),
    };
  }

  async function createAvatarUpload(storage: InMemoryObjectStorage) {
    const actor = await createActor("EMPLOYEE");
    const cases = createMediaUseCases(storage);
    const created = await cases.create.execute({
      actorUserId: actor.user.id,
      tenantId: actor.tenant.id,
      purpose: "PROFESSIONAL_AVATAR",
      contentType: "image/jpeg",
      sizeBytes: 1000,
      originalFilename: "avatar.jpg",
    });
    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, created.assetId))
      .limit(1);
    return { actor, cases, created, asset };
  }

  afterEach(async () => {
    if (tenantIds.length > 0) {
      const assets = await db
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(inArray(mediaAssets.tenantId, tenantIds));
      const assetIds = assets.map((row) => row.id);

      if (assetIds.length > 0) {
        await db.delete(mediaVariants).where(inArray(mediaVariants.mediaAssetId, assetIds));
        await db.delete(mediaUploadIntents).where(inArray(mediaUploadIntents.mediaAssetId, assetIds));
        await db.delete(mediaAssets).where(inArray(mediaAssets.id, assetIds));
      }
    }

    if (membershipIds.length > 0) {
      await db.delete(membershipRoles).where(inArray(membershipRoles.membershipId, membershipIds));
      await db.delete(memberships).where(inArray(memberships.id, membershipIds));
    }
    if (roleIds.length > 0) await db.delete(roles).where(inArray(roles.id, roleIds));
    if (userIds.length > 0) await db.delete(users).where(inArray(users.id, userIds));
    if (tenantIds.length > 0) await db.delete(tenants).where(inArray(tenants.id, tenantIds));

    tenantIds.length = 0;
    userIds.length = 0;
    membershipIds.length = 0;
    roleIds.length = 0;
  });

  it("1. verifies object metadata and durably transitions UPLOADING -> UPLOADED", async () => {
    const storage = new InMemoryObjectStorage();
    const { actor, cases, created, asset } = await createAvatarUpload(storage);

    const body = new Uint8Array([1, 2, 3, 4, 5]);
    const stored = await storage.putObject({
      objectKey: asset.sourceObjectKey,
      body,
      contentType: "image/jpeg",
    });

    const result = await cases.complete.execute({
      actorUserId: actor.user.id,
      tenantId: actor.tenant.id,
      assetId: created.assetId,
      uploadIntentId: created.uploadIntentId,
    });

    expect(result.completed).toBe(true);
    expect(result.status).toBe("UPLOADED");
    expect(result.sizeBytes).toBe(body.byteLength);
    expect(result.checksumSha256).toBe(stored.checksumSha256);

    const [persisted] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, created.assetId))
      .limit(1);
    expect(persisted.status).toBe("UPLOADED");
    expect(persisted.uploadedAt).not.toBeNull();
    expect(persisted.checksumSha256).toBe(stored.checksumSha256);
  });

  it("2. missing storage object fails without changing durable state", async () => {
    const storage = new InMemoryObjectStorage();
    const { actor, cases, created } = await createAvatarUpload(storage);

    await expect(
      cases.complete.execute({
        actorUserId: actor.user.id,
        tenantId: actor.tenant.id,
        assetId: created.assetId,
        uploadIntentId: created.uploadIntentId,
      })
    ).rejects.toThrow("MEDIA_OBJECT_NOT_FOUND");

    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, created.assetId))
      .limit(1);
    expect(asset.status).toBe("UPLOADING");
  });

  it("3. oversized uploaded object is quarantined", async () => {
    const storage = new InMemoryObjectStorage();
    const { actor, cases, created, asset } = await createAvatarUpload(storage);

    await db
      .update(mediaUploadIntents)
      .set({ maxBytes: 2 })
      .where(eq(mediaUploadIntents.id, created.uploadIntentId));

    await storage.putObject({
      objectKey: asset.sourceObjectKey,
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
    });

    const result = await cases.complete.execute({
      actorUserId: actor.user.id,
      tenantId: actor.tenant.id,
      assetId: created.assetId,
      uploadIntentId: created.uploadIntentId,
    });

    expect(result.status).toBe("QUARANTINED");

    const [persisted] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, created.assetId))
      .limit(1);
    expect(persisted.lastError).toBe("MEDIA_OBJECT_SIZE_INVALID");
  });

  it("4. content-type mismatch is quarantined", async () => {
    const storage = new InMemoryObjectStorage();
    const { actor, cases, created, asset } = await createAvatarUpload(storage);

    await storage.putObject({
      objectKey: asset.sourceObjectKey,
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/png",
    });

    const result = await cases.complete.execute({
      actorUserId: actor.user.id,
      tenantId: actor.tenant.id,
      assetId: created.assetId,
      uploadIntentId: created.uploadIntentId,
    });

    expect(result.status).toBe("QUARANTINED");
  });

  it("5. expired upload intent cannot be completed", async () => {
    const storage = new InMemoryObjectStorage();
    const { actor, cases, created, asset } = await createAvatarUpload(storage);

    await db
      .update(mediaUploadIntents)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(mediaUploadIntents.id, created.uploadIntentId));

    await storage.putObject({
      objectKey: asset.sourceObjectKey,
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
    });

    await expect(
      cases.complete.execute({
        actorUserId: actor.user.id,
        tenantId: actor.tenant.id,
        assetId: created.assetId,
        uploadIntentId: created.uploadIntentId,
      })
    ).rejects.toThrow("MEDIA_UPLOAD_INTENT_EXPIRED");
  });

  it("6. 50 concurrent completion calls produce exactly one durable settlement", async () => {
    const storage = new InMemoryObjectStorage();
    const { actor, cases, created, asset } = await createAvatarUpload(storage);

    await storage.putObject({
      objectKey: asset.sourceObjectKey,
      body: new Uint8Array([9, 8, 7, 6]),
      contentType: "image/jpeg",
    });

    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        cases.complete.execute({
          actorUserId: actor.user.id,
          tenantId: actor.tenant.id,
          assetId: created.assetId,
          uploadIntentId: created.uploadIntentId,
        })
      )
    );

    expect(results.filter((result) => result.completed)).toHaveLength(1);
    expect(results.every((result) => result.status === "UPLOADED")).toBe(true);

    const [intent] = await db
      .select()
      .from(mediaUploadIntents)
      .where(eq(mediaUploadIntents.id, created.uploadIntentId))
      .limit(1);
    const [persisted] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, created.assetId))
      .limit(1);

    expect(intent.completedAt).not.toBeNull();
    expect(persisted.status).toBe("UPLOADED");
  });

  it("7. completion is tenant-isolated even when foreign asset ids are known", async () => {
    const storage = new InMemoryObjectStorage();
    const own = await createAvatarUpload(storage);
    const foreign = await createActor("OWNER");

    await storage.putObject({
      objectKey: own.asset.sourceObjectKey,
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
    });

    await expect(
      own.cases.complete.execute({
        actorUserId: foreign.user.id,
        tenantId: foreign.tenant.id,
        assetId: own.created.assetId,
        uploadIntentId: own.created.uploadIntentId,
      })
    ).rejects.toThrow("Media upload does not belong to active tenant");
  });
});
