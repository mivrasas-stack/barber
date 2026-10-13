import { afterEach, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
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
import type {
  ImageProcessor,
  ProcessImageInput,
  ProcessImageResult,
} from "@/modules/media/application/image-processor.interface";
import { DrizzleMediaRepository } from "@/modules/media/infrastructure/drizzle-media.repository";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";
import { InMemoryObjectStorage } from "@/infrastructure/media/in-memory-object-storage";
import { MediaProcessingExecutor } from "@/infrastructure/media/media-processing-executor";
import { ValidationError } from "@/shared/errors/app-error";

describe("Stage 5C2-A Media Processing Leases & Executor", () => {
  const tenantIds: string[] = [];
  const userIds: string[] = [];
  const membershipIds: string[] = [];
  const roleIds: string[] = [];

  async function createActor() {
    const suffix = randomUUID().slice(0, 8);
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: `media-worker-${suffix}`,
        name: `Media Worker ${suffix}`,
      })
      .returning();

    const [user] = await db
      .insert(users)
      .values({
        email: `media-worker-${suffix}@example.test`,
        emailNormalized: `media-worker-${suffix}@example.test`,
        name: `Media Worker ${suffix}`,
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
        name: "EMPLOYEE",
        description: "Stage 5 media worker role",
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

  function checksum(body: Uint8Array): string {
    return createHash("sha256").update(body).digest("hex");
  }

  function deterministicProcessor(): ImageProcessor {
    const sizes = [64, 64, 128, 128, 256, 256, 512, 512];

    return {
      async process(_input: ProcessImageInput): Promise<ProcessImageResult> {
        const variants = sizes.map((size, index) => {
          const body = new Uint8Array([index + 1, size % 251, 7]);
          const format = index % 2 === 0 ? "webp" : "avif";
          return {
            variantKey: `avatar-${size}x${size}-${format}`,
            body,
            mimeType: format === "webp" ? "image/webp" as const : "image/avif" as const,
            width: size,
            height: size,
            sizeBytes: body.byteLength,
            checksumSha256: checksum(body),
          };
        });

        return {
          sourceFormat: "jpeg",
          sourceMimeType: "image/jpeg",
          sourceWidth: 1024,
          sourceHeight: 1024,
          variants,
        };
      },
    };
  }

  async function uploadedAvatar(storage: InMemoryObjectStorage) {
    const actor = await createActor();
    const repository = new DrizzleMediaRepository();
    const authorization = new DrizzleAuthorizationRepository();

    const create = new CreateMediaUploadIntentUseCase(
      repository,
      storage,
      authorization
    );
    const complete = new CompleteMediaUploadUseCase(
      repository,
      storage,
      authorization
    );

    const upload = await create.execute({
      actorUserId: actor.user.id,
      tenantId: actor.tenant.id,
      purpose: "PROFESSIONAL_AVATAR",
      contentType: "image/jpeg",
      sizeBytes: 1_000_000,
      visibility: "PUBLIC",
    });

    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, upload.assetId))
      .limit(1);

    await storage.putObject({
      objectKey: asset.sourceObjectKey,
      body: new Uint8Array([1, 2, 3, 4]),
      contentType: "image/jpeg",
    });

    await complete.execute({
      actorUserId: actor.user.id,
      tenantId: actor.tenant.id,
      assetId: upload.assetId,
      uploadIntentId: upload.uploadIntentId,
    });

    return { actor, upload, repository };
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
      await db
        .delete(membershipRoles)
        .where(inArray(membershipRoles.membershipId, membershipIds));
      await db
        .delete(memberships)
        .where(inArray(memberships.id, membershipIds));
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

  it("1. processes an uploaded image to READY with immutable variants", async () => {
    const storage = new InMemoryObjectStorage();
    const { upload, repository } = await uploadedAvatar(storage);

    const result = await new MediaProcessingExecutor(
      repository,
      storage,
      deterministicProcessor()
    ).processAsset(upload.assetId, "worker-a");

    expect(result.claimed).toBe(true);
    expect(result.settled).toBe(true);
    expect(result.status).toBe("READY");
    expect(result.variantCount).toBe(8);

    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, upload.assetId))
      .limit(1);
    const variants = await db
      .select()
      .from(mediaVariants)
      .where(eq(mediaVariants.mediaAssetId, upload.assetId));

    expect(asset.status).toBe("READY");
    expect(asset.width).toBe(1024);
    expect(asset.height).toBe(1024);
    expect(asset.processingLeaseId).toBeNull();
    expect(variants).toHaveLength(8);

    for (const variant of variants) {
      expect(variant.objectKey).toContain(
        `/variants/v1/${variant.variantKey}.`
      );
      const stored = await storage.headObject(variant.objectKey);
      expect(stored?.cacheControl).toBe(
        "public, max-age=31536000, immutable"
      );
    }
  });

  it("2. concurrent executors claim one live processing lease", async () => {
    const storage = new InMemoryObjectStorage();
    const { upload, repository } = await uploadedAvatar(storage);

    const executor = new MediaProcessingExecutor(
      repository,
      storage,
      deterministicProcessor()
    );

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        executor.processAsset(upload.assetId, `worker-${index}`)
      )
    );

    expect(results.filter((result) => result.claimed)).toHaveLength(1);
    expect(results.filter((result) => result.status === "READY")).toHaveLength(1);

    const variants = await db
      .select()
      .from(mediaVariants)
      .where(eq(mediaVariants.mediaAssetId, upload.assetId));
    expect(variants).toHaveLength(8);
  });

  it("3. an expired lease is reclaimed and the stale lease cannot settle", async () => {
    const storage = new InMemoryObjectStorage();
    const { upload, repository } = await uploadedAvatar(storage);

    const first = await repository.claimForProcessing({
      assetId: upload.assetId,
      workerId: "old-worker",
      leaseId: "lease-old",
      leaseDurationMs: 60_000,
    });
    expect(first?.processingAttempts).toBe(1);

    await db
      .update(mediaAssets)
      .set({ processingLockExpiresAt: new Date(Date.now() - 60_000) })
      .where(eq(mediaAssets.id, upload.assetId));

    const second = await repository.claimForProcessing({
      assetId: upload.assetId,
      workerId: "new-worker",
      leaseId: "lease-new",
      leaseDurationMs: 60_000,
    });

    expect(second?.processingAttempts).toBe(2);
    expect(second?.leaseId).toBe("lease-new");

    const staleSettled = await repository.markProcessingReady({
      assetId: upload.assetId,
      leaseId: "lease-old",
      width: 1,
      height: 1,
      variants: [],
    });
    expect(staleSettled).toBe(false);

    const currentSettled = await repository.markProcessingFailed({
      assetId: upload.assetId,
      leaseId: "lease-new",
      retryDelayMs: 1000,
      error: "test cleanup",
    });
    expect(currentSettled).toBe(true);
  });

  it("4. permanent image validation errors are quarantined rather than retried", async () => {
    const storage = new InMemoryObjectStorage();
    const { upload, repository } = await uploadedAvatar(storage);
    const rejectingProcessor: ImageProcessor = {
      async process(_input: ProcessImageInput): Promise<ProcessImageResult> {
        throw new ValidationError("MEDIA_IMAGE_DECODE_FAILED");
      },
    };

    const result = await new MediaProcessingExecutor(
      repository,
      storage,
      rejectingProcessor
    ).processAsset(upload.assetId, "worker-corrupt");

    expect(result.status).toBe("QUARANTINED");

    const [persisted] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, upload.assetId))
      .limit(1);
    expect(persisted.status).toBe("QUARANTINED");
    expect(persisted.lastError).toContain("MEDIA_IMAGE_DECODE_FAILED");
  });

  it("5. transient processor errors are sanitized and scheduled for retry", async () => {
    const storage = new InMemoryObjectStorage();
    const { upload, repository } = await uploadedAvatar(storage);

    const failingProcessor: ImageProcessor = {
      async process(_input: ProcessImageInput): Promise<ProcessImageResult> {
        throw new Error(
          "Bearer raw-token password=secret postgresql://user:pass@db/internal"
        );
      },
    };

    const result = await new MediaProcessingExecutor(
      repository,
      storage,
      failingProcessor,
      { baseRetryDelayMs: 1000, maxRetryDelayMs: 1000 }
    ).processAsset(upload.assetId, "worker-fail");

    expect(result.status).toBe("FAILED");

    const [persisted] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, upload.assetId))
      .limit(1);

    expect(persisted.status).toBe("FAILED");
    expect(persisted.nextProcessingAttemptAt.getTime()).toBeGreaterThan(
      persisted.updatedAt.getTime()
    );
    expect(persisted.lastError).toContain("[REDACTED]");
    expect(persisted.lastError).not.toContain("raw-token");
    expect(persisted.lastError).not.toContain("password=secret");
    expect(persisted.lastError).not.toContain("user:pass");
  });

  it("6. max-attempt assets are not claimed again", async () => {
    const storage = new InMemoryObjectStorage();
    const { upload, repository } = await uploadedAvatar(storage);
    const now = new Date();

    await db
      .update(mediaAssets)
      .set({
        status: "FAILED",
        processingAttempts: 8,
        processingMaxAttempts: 8,
        nextProcessingAttemptAt: new Date(now.getTime() - 1000),
      })
      .where(eq(mediaAssets.id, upload.assetId));

    const claim = await repository.claimForProcessing({
      assetId: upload.assetId,
      workerId: "worker-max",
      leaseId: "lease-max",
      leaseDurationMs: 1000,
    });

    expect(claim).toBeNull();
  });

  it("7. missing source object becomes retryable FAILED state", async () => {
    const storage = new InMemoryObjectStorage();
    const { upload, repository } = await uploadedAvatar(storage);
    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, upload.assetId))
      .limit(1);

    await storage.deleteObject(asset.sourceObjectKey);

    const result = await new MediaProcessingExecutor(
      repository,
      storage,
      deterministicProcessor()
    ).processAsset(upload.assetId, "worker-missing");

    expect(result.status).toBe("FAILED");

    const [persisted] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, upload.assetId))
      .limit(1);
    expect(persisted.lastError).toBe("MEDIA_SOURCE_OBJECT_NOT_FOUND");
  });
});
