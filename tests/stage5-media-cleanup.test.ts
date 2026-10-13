import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  mediaAssets,
  mediaUploadIntents,
  mediaVariants,
} from "@/infrastructure/database/schema/media";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { DrizzleMediaRepository } from "@/modules/media/infrastructure/drizzle-media.repository";
import { InMemoryObjectStorage } from "@/infrastructure/media/in-memory-object-storage";
import { MediaLifecycleCleaner } from "@/infrastructure/media/media-lifecycle-cleaner";

class FailOnceDeleteStorage extends InMemoryObjectStorage {
  private failed = false;

  override async deleteObject(
    objectKey: string,
    signal?: AbortSignal
  ): Promise<void> {
    if (!this.failed) {
      this.failed = true;
      throw new Error("temporary storage outage token=secret");
    }
    return super.deleteObject(objectKey, signal);
  }
}

describe("Stage 5C3 Media Lifecycle Cleanup", () => {
  const tenantIds: string[] = [];

  async function createTenant() {
    const suffix = randomUUID().slice(0, 8);
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: `media-cleanup-${suffix}`,
        name: `Media Cleanup ${suffix}`,
      })
      .returning();
    tenantIds.push(tenant.id);
    return tenant;
  }

  async function createUpload(
    expiresAt: Date,
    status: "UPLOADING" | "DELETED" = "UPLOADING"
  ) {
    const tenant = await createTenant();
    const assetId = randomUUID();
    const uploadIntentId = randomUUID();
    const sourceObjectKey = `media/v1/${tenant.id}/${assetId}/source/test.jpg`;

    await db.insert(mediaAssets).values({
      id: assetId,
      tenantId: tenant.id,
      mediaKind: "IMAGE",
      purpose: "PROFESSIONAL_AVATAR",
      visibility: "PRIVATE",
      sourceObjectKey,
      mimeType: "image/jpeg",
      status,
      deletedAt: status === "DELETED" ? new Date(Date.now() - 60_000) : null,
    });

    await db.insert(mediaUploadIntents).values({
      id: uploadIntentId,
      mediaAssetId: assetId,
      objectKey: sourceObjectKey,
      allowedMime: "image/jpeg",
      maxBytes: 10_000,
      expiresAt,
      completedAt: status === "DELETED" ? new Date(Date.now() - 60_000) : null,
    });

    return { tenant, assetId, uploadIntentId, sourceObjectKey };
  }

  afterEach(async () => {
    if (tenantIds.length === 0) return;

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

    await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    tenantIds.length = 0;
  });

  it("1. expires abandoned uploads and purges their source object", async () => {
    const storage = new InMemoryObjectStorage();
    const created = await createUpload(new Date(Date.now() - 60_000));

    await storage.putObject({
      objectKey: created.sourceObjectKey,
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
    });

    const result = await new MediaLifecycleCleaner(
      new DrizzleMediaRepository(),
      storage,
      { storagePurgeGraceMs: 0 }
    ).tick();

    expect(result.expiredDeleted).toBe(1);
    expect(result.purged).toBe(1);
    expect(result.failed).toBe(0);
    expect(await storage.headObject(created.sourceObjectKey)).toBeNull();

    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, created.assetId))
      .limit(1);
    const [intent] = await db
      .select()
      .from(mediaUploadIntents)
      .where(eq(mediaUploadIntents.id, created.uploadIntentId))
      .limit(1);

    expect(asset.status).toBe("DELETED");
    expect(asset.deletedAt).not.toBeNull();
    expect(asset.storagePurgedAt).not.toBeNull();
    expect(intent.completedAt).not.toBeNull();
  });

  it("2. does not expire an upload whose intent is still valid", async () => {
    const storage = new InMemoryObjectStorage();
    const created = await createUpload(new Date(Date.now() + 60_000));

    await storage.putObject({
      objectKey: created.sourceObjectKey,
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
    });

    const result = await new MediaLifecycleCleaner(
      new DrizzleMediaRepository(),
      storage,
      { storagePurgeGraceMs: 0 }
    ).tick();

    expect(result.expiredDiscovered).toBe(0);
    expect(result.purgeDiscovered).toBe(0);

    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, created.assetId))
      .limit(1);

    expect(asset.status).toBe("UPLOADING");
    expect(await storage.headObject(created.sourceObjectKey)).not.toBeNull();
  });

  it("3. purges source and registered variants while preserving DB evidence", async () => {
    const storage = new InMemoryObjectStorage();
    const created = await createUpload(
      new Date(Date.now() - 120_000),
      "DELETED"
    );
    const variantKey = `media/v1/${created.tenant.id}/${created.assetId}/variants/v1/avatar-64x64-webp.webp`;

    await db.insert(mediaVariants).values({
      mediaAssetId: created.assetId,
      variantKey: "avatar-64x64-webp",
      objectKey: variantKey,
      mimeType: "image/webp",
      width: 64,
      height: 64,
      sizeBytes: 3,
      checksumSha256: "a".repeat(64),
    });

    await storage.putObject({
      objectKey: created.sourceObjectKey,
      body: new Uint8Array([1]),
      contentType: "image/jpeg",
    });
    await storage.putObject({
      objectKey: variantKey,
      body: new Uint8Array([2]),
      contentType: "image/webp",
    });

    const result = await new MediaLifecycleCleaner(
      new DrizzleMediaRepository(),
      storage,
      { storagePurgeGraceMs: 0 }
    ).tick();

    expect(result.purged).toBe(1);
    expect(await storage.headObject(created.sourceObjectKey)).toBeNull();
    expect(await storage.headObject(variantKey)).toBeNull();

    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, created.assetId))
      .limit(1);
    const variants = await db
      .select()
      .from(mediaVariants)
      .where(eq(mediaVariants.mediaAssetId, created.assetId));

    expect(asset.storagePurgedAt).not.toBeNull();
    expect(variants).toHaveLength(1);
  });

  it("4. storage failure leaves purge pending and a later tick can recover", async () => {
    const storage = new FailOnceDeleteStorage();
    const created = await createUpload(
      new Date(Date.now() - 120_000),
      "DELETED"
    );

    await storage.putObject({
      objectKey: created.sourceObjectKey,
      body: new Uint8Array([1]),
      contentType: "image/jpeg",
    });

    const cleaner = new MediaLifecycleCleaner(
      new DrizzleMediaRepository(),
      storage,
      { storagePurgeGraceMs: 0 }
    );

    const first = await cleaner.tick();
    expect(first.failed).toBe(1);
    expect(first.purged).toBe(0);

    let [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, created.assetId))
      .limit(1);
    expect(asset.storagePurgedAt).toBeNull();

    const second = await cleaner.tick();
    expect(second.purged).toBe(1);

    [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, created.assetId))
      .limit(1);
    expect(asset.storagePurgedAt).not.toBeNull();
    expect(await storage.headObject(created.sourceObjectKey)).toBeNull();
  });

  it("5. rejects unsafe cleanup discovery limits", async () => {
    const repository = new DrizzleMediaRepository();
    await expect(repository.findExpiredUploadAssetIds(0)).rejects.toThrow(
      "MEDIA_CLEANUP_DISCOVERY_LIMIT_INVALID"
    );
    await expect(
      repository.findStoragePurgeCandidates(501, 0)
    ).rejects.toThrow("MEDIA_CLEANUP_DISCOVERY_LIMIT_INVALID");
  });
});
