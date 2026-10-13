import type {
  MediaAssetStatus,
  MediaPurpose,
  MediaVisibility,
} from "./media";

export interface CreateMediaUploadIntentRecordInput {
  assetId: string;
  uploadIntentId: string;
  tenantId: string;
  ownerUserId: string | null;
  purpose: MediaPurpose;
  visibility: MediaVisibility;
  originalFilename: string | null;
  sourceObjectKey: string;
  mimeType: string;
  maxBytes: number;
  expiresAt: Date;
}

export interface MediaUploadCompletionContext {
  assetId: string;
  tenantId: string | null;
  ownerUserId: string | null;
  purpose: MediaPurpose;
  status: MediaAssetStatus;
  sourceObjectKey: string;
  mimeType: string;
  sizeBytes: number | null;
  checksumSha256: string | null;
  uploadIntentId: string;
  allowedMime: string;
  maxBytes: number;
  expiresAt: Date;
  completedAt: Date | null;
}

export interface SettleMediaUploadInput {
  assetId: string;
  uploadIntentId: string;
  settledAt: Date;
  status: Extract<MediaAssetStatus, "UPLOADED" | "QUARANTINED">;
  sizeBytes: number;
  checksumSha256: string | null;
  mimeType: string;
  lastError: string | null;
}

export interface SettleMediaUploadResult {
  settled: boolean;
  expired: boolean;
  status: MediaAssetStatus;
  completedAt: Date | null;
}

export interface ClaimMediaProcessingInput {
  assetId: string;
  workerId: string;
  leaseId: string;
  leaseDurationMs: number;
}

export interface MediaProcessingClaim {
  assetId: string;
  tenantId: string | null;
  purpose: MediaPurpose;
  visibility: MediaVisibility;
  sourceObjectKey: string;
  mimeType: string;
  processingVersion: number;
  processingAttempts: number;
  processingMaxAttempts: number;
  leaseId: string;
}

export interface PersistMediaVariantInput {
  variantKey: string;
  objectKey: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  checksumSha256: string;
}

export interface MarkMediaProcessingReadyInput {
  assetId: string;
  leaseId: string;
  width: number;
  height: number;
  variants: PersistMediaVariantInput[];
}

export interface MarkMediaProcessingFailedInput {
  assetId: string;
  leaseId: string;
  retryDelayMs: number;
  error: string;
}

export interface MarkMediaProcessingQuarantinedInput {
  assetId: string;
  leaseId: string;
  error: string;
}

export interface MediaStoragePurgeCandidate {
  assetId: string;
  sourceObjectKey: string;
  variantObjectKeys: string[];
}

export interface MediaDeliveryVariant {
  variantKey: string;
  objectKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}

export interface MediaDeliveryRecord {
  assetId: string;
  tenantId: string | null;
  ownerUserId: string | null;
  purpose: MediaPurpose;
  visibility: MediaVisibility;
  status: MediaAssetStatus;
  variants: MediaDeliveryVariant[];
}

export interface MediaRepository {
  createUploadIntent(input: CreateMediaUploadIntentRecordInput): Promise<void>;
  findUploadForCompletion(
    assetId: string,
    uploadIntentId: string
  ): Promise<MediaUploadCompletionContext | null>;
  settleUpload(input: SettleMediaUploadInput): Promise<SettleMediaUploadResult>;

  findProcessableAssetIds(limit: number): Promise<string[]>;
  findMediaForDelivery(assetId: string): Promise<MediaDeliveryRecord | null>;

  findExpiredUploadAssetIds(limit: number): Promise<string[]>;
  markExpiredUploadDeleted(assetId: string): Promise<boolean>;
  findStoragePurgeCandidates(
    limit: number,
    gracePeriodMs: number
  ): Promise<MediaStoragePurgeCandidate[]>;
  markStoragePurged(assetId: string): Promise<boolean>;

  claimForProcessing(
    input: ClaimMediaProcessingInput
  ): Promise<MediaProcessingClaim | null>;
  markProcessingReady(input: MarkMediaProcessingReadyInput): Promise<boolean>;
  markProcessingFailed(input: MarkMediaProcessingFailedInput): Promise<boolean>;
  markProcessingQuarantined(
    input: MarkMediaProcessingQuarantinedInput
  ): Promise<boolean>;
}
