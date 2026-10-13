import { randomUUID } from "node:crypto";
import type { AuthorizationRepository } from "@/modules/authorization/domain/authorization-repository.interface";
import type { ObjectStorage } from "./object-storage.interface";
import type { MediaPurpose, MediaVisibility } from "../domain/media";
import type { MediaRepository } from "../domain/media-repository.interface";
import { ForbiddenError, ValidationError } from "@/shared/errors/app-error";
import { evaluateMediaUploadPolicy } from "./media-upload-policy";

const DEFAULT_UPLOAD_EXPIRY_SECONDS = 10 * 60;

export interface CreateMediaUploadIntentInput {
  actorUserId: string;
  tenantId: string;
  ownerUserId?: string | null;
  purpose: MediaPurpose;
  contentType: string;
  sizeBytes: number;
  originalFilename?: string | null;
  visibility?: MediaVisibility;
}

export interface CreateMediaUploadIntentResult {
  assetId: string;
  uploadIntentId: string;
  uploadUrl: string;
  method: "PUT";
  requiredHeaders: Record<string, string>;
  expiresAt: Date;
  maxBytes: number;
}

function sanitizeOriginalFilename(filename?: string | null): string | null {
  if (!filename) return null;

  const base = filename.split(/[\\/]/).pop() ?? "";
  const sanitized = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255);

  return sanitized || null;
}

export class CreateMediaUploadIntentUseCase {
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly objectStorage: ObjectStorage,
    private readonly authorizationRepository: AuthorizationRepository,
    private readonly newId: () => string = () => randomUUID()
  ) {}

  async execute(
    input: CreateMediaUploadIntentInput
  ): Promise<CreateMediaUploadIntentResult> {
    const context = await this.authorizationRepository.getAuthorizationContext(
      input.actorUserId,
      input.tenantId
    );

    if (!context) {
      throw new ForbiddenError("Media upload authorization context not found");
    }

    const ownerUserId =
      input.ownerUserId ??
      (input.purpose === "PROFESSIONAL_AVATAR" || input.purpose === "PORTFOLIO"
        ? input.actorUserId
        : null);

    const policy = evaluateMediaUploadPolicy({
      context,
      actorUserId: input.actorUserId,
      tenantId: input.tenantId,
      ownerUserId,
      purpose: input.purpose,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      requestedVisibility: input.visibility,
    });

    const assetId = this.newId();
    const uploadIntentId = this.newId();
    if (assetId === uploadIntentId) {
      throw new ValidationError("MEDIA_ID_COLLISION");
    }

    const sourceNonce = this.newId();
    const sourceObjectKey =
      `media/v1/${input.tenantId}/${assetId}/source/${sourceNonce}.${policy.extension}`;

    const signedUpload = await this.objectStorage.createSignedUpload({
      objectKey: sourceObjectKey,
      contentType: input.contentType,
      maxBytes: policy.maxBytes,
      expiresInSeconds: DEFAULT_UPLOAD_EXPIRY_SECONDS,
    });

    await this.mediaRepository.createUploadIntent({
      assetId,
      uploadIntentId,
      tenantId: input.tenantId,
      ownerUserId,
      purpose: input.purpose,
      visibility: policy.visibility,
      originalFilename: sanitizeOriginalFilename(input.originalFilename),
      sourceObjectKey,
      mimeType: input.contentType,
      maxBytes: policy.maxBytes,
      expiresAt: signedUpload.expiresAt,
    });

    return {
      assetId,
      uploadIntentId,
      uploadUrl: signedUpload.url,
      method: signedUpload.method,
      requiredHeaders: signedUpload.requiredHeaders,
      expiresAt: signedUpload.expiresAt,
      maxBytes: policy.maxBytes,
    };
  }
}
