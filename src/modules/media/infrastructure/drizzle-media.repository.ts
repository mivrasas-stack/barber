import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  mediaAssets,
  mediaUploadIntents,
  mediaVariants,
} from "@/infrastructure/database/schema/media";
import type {
  ClaimMediaProcessingInput,
  CreateMediaUploadIntentRecordInput,
  MarkMediaProcessingFailedInput,
  MarkMediaProcessingQuarantinedInput,
  MarkMediaProcessingReadyInput,
  MediaDeliveryRecord,
  MediaProcessingClaim,
  MediaRepository,
  MediaStoragePurgeCandidate,
  MediaUploadCompletionContext,
  SettleMediaUploadInput,
  SettleMediaUploadResult,
} from "../domain/media-repository.interface";
import type {
  MediaAssetStatus,
  MediaPurpose,
  MediaVisibility,
} from "../domain/media";

export class DrizzleMediaRepository implements MediaRepository {
  async createUploadIntent(input: CreateMediaUploadIntentRecordInput): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.insert(mediaAssets).values({
        id: input.assetId,
        tenantId: input.tenantId,
        ownerUserId: input.ownerUserId,
        mediaKind: "IMAGE",
        purpose: input.purpose,
        visibility: input.visibility,
        originalFilename: input.originalFilename,
        sourceObjectKey: input.sourceObjectKey,
        mimeType: input.mimeType,
        status: "UPLOADING",
      });

      await tx.insert(mediaUploadIntents).values({
        id: input.uploadIntentId,
        mediaAssetId: input.assetId,
        objectKey: input.sourceObjectKey,
        allowedMime: input.mimeType,
        maxBytes: input.maxBytes,
        expiresAt: input.expiresAt,
      });
    });
  }

  async findUploadForCompletion(
    assetId: string,
    uploadIntentId: string
  ): Promise<MediaUploadCompletionContext | null> {
    const [row] = await db
      .select({
        assetId: mediaAssets.id,
        tenantId: mediaAssets.tenantId,
        ownerUserId: mediaAssets.ownerUserId,
        purpose: mediaAssets.purpose,
        status: mediaAssets.status,
        sourceObjectKey: mediaAssets.sourceObjectKey,
        mimeType: mediaAssets.mimeType,
        sizeBytes: mediaAssets.sizeBytes,
        checksumSha256: mediaAssets.checksumSha256,
        uploadIntentId: mediaUploadIntents.id,
        allowedMime: mediaUploadIntents.allowedMime,
        maxBytes: mediaUploadIntents.maxBytes,
        expiresAt: mediaUploadIntents.expiresAt,
        completedAt: mediaUploadIntents.completedAt,
      })
      .from(mediaAssets)
      .innerJoin(
        mediaUploadIntents,
        eq(mediaUploadIntents.mediaAssetId, mediaAssets.id)
      )
      .where(
        and(
          eq(mediaAssets.id, assetId),
          eq(mediaUploadIntents.id, uploadIntentId)
        )
      )
      .limit(1);

    if (!row) return null;

    return {
      ...row,
      purpose: row.purpose as MediaPurpose,
      status: row.status as MediaAssetStatus,
    };
  }

  async settleUpload(input: SettleMediaUploadInput): Promise<SettleMediaUploadResult> {
    return db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(mediaUploadIntents)
        .set({ completedAt: input.settledAt })
        .where(
          and(
            eq(mediaUploadIntents.id, input.uploadIntentId),
            eq(mediaUploadIntents.mediaAssetId, input.assetId),
            isNull(mediaUploadIntents.completedAt),
            gt(mediaUploadIntents.expiresAt, input.settledAt)
          )
        )
        .returning({ id: mediaUploadIntents.id });

      if (!claimed) {
        const [existing] = await tx
          .select({
            status: mediaAssets.status,
            completedAt: mediaUploadIntents.completedAt,
            expiresAt: mediaUploadIntents.expiresAt,
          })
          .from(mediaAssets)
          .innerJoin(
            mediaUploadIntents,
            eq(mediaUploadIntents.mediaAssetId, mediaAssets.id)
          )
          .where(
            and(
              eq(mediaAssets.id, input.assetId),
              eq(mediaUploadIntents.id, input.uploadIntentId)
            )
          )
          .limit(1);

        if (!existing) {
          throw new Error("MEDIA_UPLOAD_SETTLEMENT_CONTEXT_NOT_FOUND");
        }

        return {
          settled: false,
          expired:
            existing.completedAt === null &&
            existing.expiresAt.getTime() <= input.settledAt.getTime(),
          status: existing.status as MediaAssetStatus,
          completedAt: existing.completedAt,
        };
      }

      const [updatedAsset] = await tx
        .update(mediaAssets)
        .set({
          status: input.status,
          sizeBytes: input.sizeBytes,
          checksumSha256: input.checksumSha256,
          mimeType: input.mimeType,
          uploadedAt: input.settledAt,
          lastError: input.lastError,
          updatedAt: input.settledAt,
        })
        .where(
          and(
            eq(mediaAssets.id, input.assetId),
            eq(mediaAssets.status, "UPLOADING")
          )
        )
        .returning({ status: mediaAssets.status });

      if (!updatedAsset) {
        throw new Error("MEDIA_UPLOAD_ASSET_STATE_CONFLICT");
      }

      return {
        settled: true,
        expired: false,
        status: updatedAsset.status as MediaAssetStatus,
        completedAt: input.settledAt,
      };
    });
  }

  async findProcessableAssetIds(limit: number): Promise<string[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new Error("MEDIA_PROCESSING_DISCOVERY_LIMIT_INVALID");
    }

    const rows = await db
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .where(
        and(
          sql`${mediaAssets.processingAttempts} < ${mediaAssets.processingMaxAttempts}`,
          or(
            and(
              inArray(mediaAssets.status, ["UPLOADED", "FAILED"]),
              sql`${mediaAssets.nextProcessingAttemptAt} <= now()`
            ),
            and(
              eq(mediaAssets.status, "PROCESSING"),
              sql`${mediaAssets.processingLockExpiresAt} <= now()`
            )
          )
        )
      )
      .orderBy(asc(mediaAssets.createdAt), asc(mediaAssets.id))
      .limit(limit);

    return rows.map((row) => row.id);
  }

  async findMediaForDelivery(assetId: string): Promise<MediaDeliveryRecord | null> {
    const [asset] = await db
      .select({
        assetId: mediaAssets.id,
        tenantId: mediaAssets.tenantId,
        ownerUserId: mediaAssets.ownerUserId,
        purpose: mediaAssets.purpose,
        visibility: mediaAssets.visibility,
        status: mediaAssets.status,
      })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, assetId))
      .limit(1);

    if (!asset) return null;

    const variants = await db
      .select({
        variantKey: mediaVariants.variantKey,
        objectKey: mediaVariants.objectKey,
        mimeType: mediaVariants.mimeType,
        width: mediaVariants.width,
        height: mediaVariants.height,
      })
      .from(mediaVariants)
      .where(eq(mediaVariants.mediaAssetId, assetId))
      .orderBy(asc(mediaVariants.variantKey));

    return {
      ...asset,
      purpose: asset.purpose as MediaPurpose,
      visibility: asset.visibility as MediaVisibility,
      status: asset.status as MediaAssetStatus,
      variants,
    };
  }

  async findExpiredUploadAssetIds(limit: number): Promise<string[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new Error("MEDIA_CLEANUP_DISCOVERY_LIMIT_INVALID");
    }

    const rows = await db
      .select({ assetId: mediaAssets.id })
      .from(mediaAssets)
      .innerJoin(
        mediaUploadIntents,
        eq(mediaUploadIntents.mediaAssetId, mediaAssets.id)
      )
      .where(
        and(
          eq(mediaAssets.status, "UPLOADING"),
          isNull(mediaUploadIntents.completedAt),
          sql`${mediaUploadIntents.expiresAt} <= now()`
        )
      )
      .orderBy(asc(mediaUploadIntents.expiresAt), asc(mediaAssets.id))
      .limit(limit);

    return rows.map((row) => row.assetId);
  }

  async markExpiredUploadDeleted(assetId: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [expiredIntent] = await tx
        .update(mediaUploadIntents)
        .set({ completedAt: sql`now()` })
        .where(
          and(
            eq(mediaUploadIntents.mediaAssetId, assetId),
            isNull(mediaUploadIntents.completedAt),
            sql`${mediaUploadIntents.expiresAt} <= now()`
          )
        )
        .returning({ id: mediaUploadIntents.id });

      if (!expiredIntent) return false;

      const [deleted] = await tx
        .update(mediaAssets)
        .set({
          status: "DELETED",
          deletedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(mediaAssets.id, assetId),
            eq(mediaAssets.status, "UPLOADING")
          )
        )
        .returning({ id: mediaAssets.id });

      if (!deleted) {
        throw new Error("MEDIA_EXPIRED_UPLOAD_STATE_CONFLICT");
      }

      return true;
    });
  }

  async findStoragePurgeCandidates(
    limit: number,
    gracePeriodMs: number
  ): Promise<MediaStoragePurgeCandidate[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new Error("MEDIA_CLEANUP_DISCOVERY_LIMIT_INVALID");
    }
    if (!Number.isInteger(gracePeriodMs) || gracePeriodMs < 0) {
      throw new Error("MEDIA_STORAGE_PURGE_GRACE_INVALID");
    }

    const assets = await db
      .select({
        assetId: mediaAssets.id,
        sourceObjectKey: mediaAssets.sourceObjectKey,
      })
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.status, "DELETED"),
          isNotNull(mediaAssets.deletedAt),
          isNull(mediaAssets.storagePurgedAt),
          sql`${mediaAssets.deletedAt} <= now() - (${gracePeriodMs} * interval '1 millisecond')`
        )
      )
      .orderBy(asc(mediaAssets.deletedAt), asc(mediaAssets.id))
      .limit(limit);

    if (assets.length === 0) return [];

    const assetIds = assets.map((asset) => asset.assetId);
    const variants = await db
      .select({
        mediaAssetId: mediaVariants.mediaAssetId,
        objectKey: mediaVariants.objectKey,
      })
      .from(mediaVariants)
      .where(inArray(mediaVariants.mediaAssetId, assetIds));

    const variantKeys = new Map<string, string[]>();
    for (const variant of variants) {
      const keys = variantKeys.get(variant.mediaAssetId) ?? [];
      keys.push(variant.objectKey);
      variantKeys.set(variant.mediaAssetId, keys);
    }

    return assets.map((asset) => ({
      assetId: asset.assetId,
      sourceObjectKey: asset.sourceObjectKey,
      variantObjectKeys: variantKeys.get(asset.assetId) ?? [],
    }));
  }

  async markStoragePurged(assetId: string): Promise<boolean> {
    const [purged] = await db
      .update(mediaAssets)
      .set({
        storagePurgedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(mediaAssets.id, assetId),
          eq(mediaAssets.status, "DELETED"),
          isNull(mediaAssets.storagePurgedAt)
        )
      )
      .returning({ id: mediaAssets.id });

    return Boolean(purged);
  }

  async claimForProcessing(
    input: ClaimMediaProcessingInput
  ): Promise<MediaProcessingClaim | null> {
    const [row] = await db
      .update(mediaAssets)
      .set({
        status: "PROCESSING",
        processingAttempts: sql`${mediaAssets.processingAttempts} + 1`,
        processingLeaseId: input.leaseId,
        processingLockedAt: sql`now()`,
        processingLockedBy: input.workerId,
        processingLockExpiresAt: sql`now() + (${input.leaseDurationMs} * interval '1 millisecond')`,
        lastError: null,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(mediaAssets.id, input.assetId),
          sql`${mediaAssets.processingAttempts} < ${mediaAssets.processingMaxAttempts}`,
          or(
            and(
              inArray(mediaAssets.status, ["UPLOADED", "FAILED"]),
              sql`${mediaAssets.nextProcessingAttemptAt} <= now()`
            ),
            and(
              eq(mediaAssets.status, "PROCESSING"),
              sql`${mediaAssets.processingLockExpiresAt} <= now()`
            )
          )
        )
      )
      .returning({
        assetId: mediaAssets.id,
        tenantId: mediaAssets.tenantId,
        purpose: mediaAssets.purpose,
        visibility: mediaAssets.visibility,
        sourceObjectKey: mediaAssets.sourceObjectKey,
        mimeType: mediaAssets.mimeType,
        processingVersion: mediaAssets.processingVersion,
        processingAttempts: mediaAssets.processingAttempts,
        processingMaxAttempts: mediaAssets.processingMaxAttempts,
        leaseId: mediaAssets.processingLeaseId,
      });

    if (!row || !row.leaseId) return null;

    return {
      ...row,
      purpose: row.purpose as MediaPurpose,
      visibility: row.visibility as MediaVisibility,
      leaseId: row.leaseId,
    };
  }

  async markProcessingReady(
    input: MarkMediaProcessingReadyInput
  ): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [settled] = await tx
        .update(mediaAssets)
        .set({
          status: "READY",
          width: input.width,
          height: input.height,
          processedAt: sql`now()`,
          processingLeaseId: null,
          processingLockedAt: null,
          processingLockedBy: null,
          processingLockExpiresAt: null,
          lastError: null,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(mediaAssets.id, input.assetId),
            eq(mediaAssets.status, "PROCESSING"),
            eq(mediaAssets.processingLeaseId, input.leaseId)
          )
        )
        .returning({ id: mediaAssets.id });

      if (!settled) return false;

      if (input.variants.length > 0) {
        await tx.insert(mediaVariants).values(
          input.variants.map((variant) => ({
            mediaAssetId: input.assetId,
            variantKey: variant.variantKey,
            objectKey: variant.objectKey,
            mimeType: variant.mimeType,
            width: variant.width,
            height: variant.height,
            sizeBytes: variant.sizeBytes,
            checksumSha256: variant.checksumSha256,
          }))
        );
      }

      return true;
    });
  }

  async markProcessingFailed(
    input: MarkMediaProcessingFailedInput
  ): Promise<boolean> {
    const [settled] = await db
      .update(mediaAssets)
      .set({
        status: "FAILED",
        nextProcessingAttemptAt: sql`now() + (${input.retryDelayMs} * interval '1 millisecond')`,
        processingLeaseId: null,
        processingLockedAt: null,
        processingLockedBy: null,
        processingLockExpiresAt: null,
        lastError: input.error,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(mediaAssets.id, input.assetId),
          eq(mediaAssets.status, "PROCESSING"),
          eq(mediaAssets.processingLeaseId, input.leaseId)
        )
      )
      .returning({ id: mediaAssets.id });

    return Boolean(settled);
  }

  async markProcessingQuarantined(
    input: MarkMediaProcessingQuarantinedInput
  ): Promise<boolean> {
    const [settled] = await db
      .update(mediaAssets)
      .set({
        status: "QUARANTINED",
        processingLeaseId: null,
        processingLockedAt: null,
        processingLockedBy: null,
        processingLockExpiresAt: null,
        lastError: input.error,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(mediaAssets.id, input.assetId),
          eq(mediaAssets.status, "PROCESSING"),
          eq(mediaAssets.processingLeaseId, input.leaseId)
        )
      )
      .returning({ id: mediaAssets.id });

    return Boolean(settled);
  }
}
