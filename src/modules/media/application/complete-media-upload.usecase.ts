import type { AuthorizationRepository } from "@/modules/authorization/domain/authorization-repository.interface";
import type { ObjectStorage } from "./object-storage.interface";
import type { MediaRepository } from "../domain/media-repository.interface";
import type { MediaAssetStatus } from "../domain/media";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/shared/errors/app-error";
import { assertMediaPurposeAuthorization } from "./media-upload-policy";

export interface CompleteMediaUploadInput {
  actorUserId: string;
  tenantId: string;
  assetId: string;
  uploadIntentId: string;
}

export interface CompleteMediaUploadResult {
  assetId: string;
  status: MediaAssetStatus;
  completed: boolean;
  sizeBytes: number | null;
  checksumSha256: string | null;
}

function normalizeContentType(value: string): string {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

export class CompleteMediaUploadUseCase {
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly objectStorage: ObjectStorage,
    private readonly authorizationRepository: AuthorizationRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(
    input: CompleteMediaUploadInput
  ): Promise<CompleteMediaUploadResult> {
    const context = await this.authorizationRepository.getAuthorizationContext(
      input.actorUserId,
      input.tenantId
    );
    if (!context) {
      throw new ForbiddenError("Media upload authorization context not found");
    }

    const upload = await this.mediaRepository.findUploadForCompletion(
      input.assetId,
      input.uploadIntentId
    );
    if (!upload) {
      throw new NotFoundError("Media upload");
    }

    if (upload.tenantId !== input.tenantId) {
      throw new ForbiddenError("Media upload does not belong to active tenant");
    }

    assertMediaPurposeAuthorization({
      context,
      actorUserId: input.actorUserId,
      tenantId: input.tenantId,
      ownerUserId: upload.ownerUserId,
      purpose: upload.purpose,
    });

    if (upload.completedAt) {
      return {
        assetId: upload.assetId,
        status: upload.status,
        completed: false,
        sizeBytes: upload.sizeBytes,
        checksumSha256: upload.checksumSha256,
      };
    }

    const now = this.now();
    if (upload.expiresAt.getTime() <= now.getTime()) {
      throw new ConflictError("MEDIA_UPLOAD_INTENT_EXPIRED");
    }

    const metadata = await this.objectStorage.headObject(upload.sourceObjectKey);
    if (!metadata) {
      throw new ValidationError("MEDIA_OBJECT_NOT_FOUND");
    }

    let quarantineReason: string | null = null;
    if (metadata.sizeBytes <= 0 || metadata.sizeBytes > upload.maxBytes) {
      quarantineReason = "MEDIA_OBJECT_SIZE_INVALID";
    } else if (
      normalizeContentType(metadata.contentType) !==
      normalizeContentType(upload.allowedMime)
    ) {
      quarantineReason = "MEDIA_OBJECT_CONTENT_TYPE_MISMATCH";
    } else if (
      metadata.checksumSha256 !== null &&
      !/^[a-f0-9]{64}$/i.test(metadata.checksumSha256)
    ) {
      quarantineReason = "MEDIA_OBJECT_CHECKSUM_INVALID";
    }

    const settlement = await this.mediaRepository.settleUpload({
      assetId: upload.assetId,
      uploadIntentId: upload.uploadIntentId,
      settledAt: now,
      status: quarantineReason ? "QUARANTINED" : "UPLOADED",
      sizeBytes: metadata.sizeBytes,
      checksumSha256: metadata.checksumSha256,
      mimeType: normalizeContentType(metadata.contentType),
      lastError: quarantineReason,
    });

    if (settlement.expired) {
      throw new ConflictError("MEDIA_UPLOAD_INTENT_EXPIRED");
    }

    const current = settlement.settled
      ? {
          status: settlement.status,
          sizeBytes: metadata.sizeBytes,
          checksumSha256: metadata.checksumSha256,
        }
      : await this.mediaRepository.findUploadForCompletion(
          input.assetId,
          input.uploadIntentId
        );

    if (!current) {
      throw new Error("MEDIA_UPLOAD_COMPLETION_STATE_MISSING");
    }

    return {
      assetId: upload.assetId,
      status: current.status,
      completed: settlement.settled,
      sizeBytes: current.sizeBytes,
      checksumSha256: current.checksumSha256,
    };
  }
}
