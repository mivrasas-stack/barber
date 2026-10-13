import { sanitizeAndBoundError } from "@/infrastructure/outbox/outbox-sanitizer";
import type { ObjectStorage } from "@/modules/media/application/object-storage.interface";
import type { MediaRepository } from "@/modules/media/domain/media-repository.interface";
import type { MediaLogger } from "./media-logger";
import { JsonMediaLogger } from "./media-logger";

export interface MediaLifecycleCleanerOptions {
  batchSize?: number;
  storagePurgeGraceMs?: number;
  logger?: MediaLogger;
}

export interface MediaLifecycleCleanupResult {
  expiredDiscovered: number;
  expiredDeleted: number;
  purgeDiscovered: number;
  purged: number;
  failed: number;
}

function positiveInt(value: number, code: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 500) {
    throw new Error(code);
  }
  return value;
}

export class MediaLifecycleCleaner {
  private readonly batchSize: number;
  private readonly storagePurgeGraceMs: number;
  private readonly logger: MediaLogger;

  constructor(
    private readonly repository: MediaRepository,
    private readonly objectStorage: ObjectStorage,
    options: MediaLifecycleCleanerOptions = {}
  ) {
    this.batchSize = positiveInt(
      options.batchSize ?? 100,
      "MEDIA_CLEANUP_BATCH_SIZE_INVALID"
    );
    this.storagePurgeGraceMs = options.storagePurgeGraceMs ?? 24 * 60 * 60 * 1000;
    if (!Number.isInteger(this.storagePurgeGraceMs) || this.storagePurgeGraceMs < 0) {
      throw new Error("MEDIA_STORAGE_PURGE_GRACE_INVALID");
    }
    this.logger = options.logger ?? new JsonMediaLogger();
  }

  async tick(): Promise<MediaLifecycleCleanupResult> {
    const expiredIds = await this.repository.findExpiredUploadAssetIds(
      this.batchSize
    );

    let expiredDeleted = 0;
    let failed = 0;

    for (const assetId of expiredIds) {
      try {
        if (await this.repository.markExpiredUploadDeleted(assetId)) {
          expiredDeleted += 1;
        }
      } catch (error) {
        failed += 1;
        this.logger.warn("media_expired_upload_cleanup_failed", {
          assetId,
          error: sanitizeAndBoundError(error, 1000),
        });
      }
    }

    const purgeCandidates = await this.repository.findStoragePurgeCandidates(
      this.batchSize,
      this.storagePurgeGraceMs
    );

    let purged = 0;

    for (const candidate of purgeCandidates) {
      try {
        const objectKeys = new Set([
          candidate.sourceObjectKey,
          ...candidate.variantObjectKeys,
        ]);

        for (const objectKey of objectKeys) {
          await this.objectStorage.deleteObject(objectKey);
        }

        if (await this.repository.markStoragePurged(candidate.assetId)) {
          purged += 1;
        }
      } catch (error) {
        failed += 1;
        this.logger.warn("media_storage_purge_failed", {
          assetId: candidate.assetId,
          error: sanitizeAndBoundError(error, 1000),
        });
      }
    }

    return {
      expiredDiscovered: expiredIds.length,
      expiredDeleted,
      purgeDiscovered: purgeCandidates.length,
      purged,
      failed,
    };
  }
}
