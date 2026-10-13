import { createHash, randomUUID } from "node:crypto";
import { ValidationError } from "@/shared/errors/app-error";
import { sanitizeAndBoundError } from "@/infrastructure/outbox/outbox-sanitizer";
import type { ObjectStorage } from "@/modules/media/application/object-storage.interface";
import type { ImageProcessor } from "@/modules/media/application/image-processor.interface";
import type {
  MediaRepository,
  PersistMediaVariantInput,
} from "@/modules/media/domain/media-repository.interface";
import type { MediaAssetStatus } from "@/modules/media/domain/media";

export interface MediaProcessingExecutorOptions {
  leaseDurationMs?: number;
  baseRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  newId?: () => string;
}

export interface MediaProcessingExecutionResult {
  claimed: boolean;
  settled: boolean;
  assetId: string;
  status?: MediaAssetStatus;
  variantCount?: number;
  reason?: "NOT_ELIGIBLE" | "STALE_LEASE" | "FAILED" | "QUARANTINED";
}

const DEFAULT_LEASE_DURATION_MS = 60_000;
const DEFAULT_BASE_RETRY_DELAY_MS = 5_000;
const DEFAULT_MAX_RETRY_DELAY_MS = 5 * 60_000;

function extensionForMime(mimeType: string): "webp" | "avif" {
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/avif") return "avif";
  throw new Error("MEDIA_VARIANT_MIME_UNSUPPORTED");
}

function deterministicJitter(assetId: string, attempt: number): number {
  const digest = createHash("sha256")
    .update(`${assetId}:${attempt}`)
    .digest();
  const sample = digest.readUInt16BE(0) / 0xffff;
  return 0.9 + sample * 0.2;
}

export class MediaProcessingExecutor {
  private readonly leaseDurationMs: number;
  private readonly baseRetryDelayMs: number;
  private readonly maxRetryDelayMs: number;
  private readonly newId: () => string;

  constructor(
    private readonly repository: MediaRepository,
    private readonly objectStorage: ObjectStorage,
    private readonly imageProcessor: ImageProcessor,
    options: MediaProcessingExecutorOptions = {}
  ) {
    this.leaseDurationMs =
      options.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS;
    this.baseRetryDelayMs =
      options.baseRetryDelayMs ?? DEFAULT_BASE_RETRY_DELAY_MS;
    this.maxRetryDelayMs =
      options.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS;
    this.newId = options.newId ?? (() => randomUUID());
  }

  async processAsset(
    assetId: string,
    workerId: string
  ): Promise<MediaProcessingExecutionResult> {
    const leaseId = this.newId();
    const claim = await this.repository.claimForProcessing({
      assetId,
      workerId,
      leaseId,
      leaseDurationMs: this.leaseDurationMs,
    });

    if (!claim) {
      return {
        claimed: false,
        settled: false,
        assetId,
        reason: "NOT_ELIGIBLE",
      };
    }

    try {
      const source = await this.objectStorage.getObject(claim.sourceObjectKey);
      if (!source) {
        throw new Error("MEDIA_SOURCE_OBJECT_NOT_FOUND");
      }

      const processed = await this.imageProcessor.process({
        body: source.body,
        expectedMimeType: claim.mimeType,
        purpose: claim.purpose,
      });

      const persistedVariants: PersistMediaVariantInput[] = [];
      const tenantScope = claim.tenantId ?? "global";
      const cacheControl =
        claim.visibility === "PUBLIC"
          ? "public, max-age=31536000, immutable"
          : "private, max-age=0, no-store";

      for (const variant of processed.variants) {
        const extension = extensionForMime(variant.mimeType);
        const objectKey =
          `media/v1/${tenantScope}/${claim.assetId}/variants/` +
          `v${claim.processingVersion}/${variant.variantKey}.${extension}`;

        const stored = await this.objectStorage.putObject({
          objectKey,
          body: variant.body,
          contentType: variant.mimeType,
          cacheControl,
          checksumSha256: variant.checksumSha256,
        });

        persistedVariants.push({
          variantKey: variant.variantKey,
          objectKey,
          mimeType: variant.mimeType,
          width: variant.width,
          height: variant.height,
          sizeBytes: stored.sizeBytes,
          checksumSha256: stored.checksumSha256,
        });
      }

      const settled = await this.repository.markProcessingReady({
        assetId: claim.assetId,
        leaseId: claim.leaseId,
        width: processed.sourceWidth,
        height: processed.sourceHeight,
        variants: persistedVariants,
      });

      if (!settled) {
        return {
          claimed: true,
          settled: false,
          assetId,
          reason: "STALE_LEASE",
        };
      }

      return {
        claimed: true,
        settled: true,
        assetId,
        status: "READY",
        variantCount: persistedVariants.length,
      };
    } catch (error) {
      const safeError = sanitizeAndBoundError(error);

      if (error instanceof ValidationError) {
        const settled = await this.repository.markProcessingQuarantined({
          assetId: claim.assetId,
          leaseId: claim.leaseId,
          error: safeError,
        });

        return {
          claimed: true,
          settled,
          assetId,
          status: settled ? "QUARANTINED" : undefined,
          reason: settled ? "QUARANTINED" : "STALE_LEASE",
        };
      }

      const exponential = Math.min(
        this.baseRetryDelayMs * 2 ** Math.max(0, claim.processingAttempts - 1),
        this.maxRetryDelayMs
      );
      const delay = Math.max(
        1,
        Math.round(
          exponential *
            deterministicJitter(claim.assetId, claim.processingAttempts)
        )
      );

      const settled = await this.repository.markProcessingFailed({
        assetId: claim.assetId,
        leaseId: claim.leaseId,
        retryDelayMs: delay,
        error: safeError,
      });

      return {
        claimed: true,
        settled,
        assetId,
        status: settled ? "FAILED" : undefined,
        reason: settled ? "FAILED" : "STALE_LEASE",
      };
    }
  }
}
