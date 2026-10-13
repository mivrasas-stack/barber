export const MEDIA_KINDS = ["IMAGE", "VIDEO", "DOCUMENT"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEDIA_PURPOSES = [
  "PROFESSIONAL_AVATAR",
  "TENANT_LOGO",
  "PORTFOLIO",
  "SERVICE_IMAGE",
  "PRODUCT_IMAGE",
  "RECEIPT",
  "ATTACHMENT",
] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

export const MEDIA_VISIBILITIES = ["PUBLIC", "TENANT", "PRIVATE"] as const;
export type MediaVisibility = (typeof MEDIA_VISIBILITIES)[number];

export const MEDIA_ASSET_STATUSES = [
  "UPLOADING",
  "UPLOADED",
  "PROCESSING",
  "READY",
  "FAILED",
  "QUARANTINED",
  "DELETED",
] as const;
export type MediaAssetStatus = (typeof MEDIA_ASSET_STATUSES)[number];

export interface MediaAsset {
  id: string;
  tenantId: string | null;
  ownerUserId: string | null;
  mediaKind: MediaKind;
  purpose: MediaPurpose;
  visibility: MediaVisibility;
  originalFilename: string | null;
  sourceObjectKey: string;
  mimeType: string;
  sizeBytes: number | null;
  checksumSha256: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  status: MediaAssetStatus;
  processingVersion: number;
  processingAttempts: number;
  processingMaxAttempts: number;
  nextProcessingAttemptAt: Date;
  processingLeaseId: string | null;
  processingLockedAt: Date | null;
  processingLockedBy: string | null;
  processingLockExpiresAt: Date | null;
  lastError: string | null;
  uploadedAt: Date | null;
  processedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaVariant {
  id: string;
  mediaAssetId: string;
  variantKey: string;
  objectKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  checksumSha256: string;
  createdAt: Date;
}

export interface MediaUploadIntent {
  id: string;
  mediaAssetId: string;
  objectKey: string;
  allowedMime: string;
  maxBytes: number;
  expiresAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}
