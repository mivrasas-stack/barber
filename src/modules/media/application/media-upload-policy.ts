import type { AuthorizationContext } from "@/modules/authorization/domain/authorization-context";
import type { MediaPurpose, MediaVisibility } from "../domain/media";
import { ForbiddenError, ValidationError } from "@/shared/errors/app-error";

const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const PURPOSE_MAX_BYTES: Record<
  Extract<
    MediaPurpose,
    | "PROFESSIONAL_AVATAR"
    | "TENANT_LOGO"
    | "PORTFOLIO"
    | "SERVICE_IMAGE"
    | "PRODUCT_IMAGE"
  >,
  number
> = {
  PROFESSIONAL_AVATAR: 10 * 1024 * 1024,
  TENANT_LOGO: 10 * 1024 * 1024,
  PORTFOLIO: 20 * 1024 * 1024,
  SERVICE_IMAGE: 10 * 1024 * 1024,
  PRODUCT_IMAGE: 10 * 1024 * 1024,
};

const INITIAL_IMAGE_PURPOSES = new Set<MediaPurpose>(
  Object.keys(PURPOSE_MAX_BYTES) as MediaPurpose[]
);

export interface MediaPurposeAuthorizationInput {
  context: AuthorizationContext;
  actorUserId: string;
  tenantId: string;
  ownerUserId: string | null;
  purpose: MediaPurpose;
}

export interface MediaUploadPolicyInput extends MediaPurposeAuthorizationInput {
  contentType: string;
  sizeBytes: number;
  requestedVisibility?: MediaVisibility;
}

export interface MediaUploadPolicyDecision {
  maxBytes: number;
  extension: string;
  visibility: MediaVisibility;
}

function canManageTenantMedia(context: AuthorizationContext): boolean {
  return (
    context.isPlatformAdmin ||
    context.hasRole("OWNER") ||
    context.hasRole("MANAGER") ||
    context.hasPermission("tenant.manage") ||
    context.hasPermission("settings.manage")
  );
}

export function assertMediaPurposeAuthorization(
  input: MediaPurposeAuthorizationInput
): void {
  if (!INITIAL_IMAGE_PURPOSES.has(input.purpose)) {
    throw new ValidationError("MEDIA_PURPOSE_NOT_ENABLED");
  }

  if (input.context.activeTenantId !== input.tenantId && !input.context.isPlatformAdmin) {
    throw new ForbiddenError("Active tenant membership is required for media upload");
  }

  const isPersonalPurpose =
    input.purpose === "PROFESSIONAL_AVATAR" || input.purpose === "PORTFOLIO";

  if (isPersonalPurpose) {
    const ownerUserId = input.ownerUserId ?? input.actorUserId;
    if (
      ownerUserId !== input.actorUserId &&
      !canManageTenantMedia(input.context) &&
      !input.context.hasPermission("staff.manage")
    ) {
      throw new ForbiddenError("Cannot upload personal media for another user");
    }
  }

  if (
    input.purpose === "TENANT_LOGO" &&
    !canManageTenantMedia(input.context)
  ) {
    throw new ForbiddenError("Tenant media management permission is required");
  }

  if (
    input.purpose === "SERVICE_IMAGE" &&
    !canManageTenantMedia(input.context) &&
    !input.context.hasPermission("services.manage")
  ) {
    throw new ForbiddenError("Service management permission is required");
  }

  if (
    input.purpose === "PRODUCT_IMAGE" &&
    !canManageTenantMedia(input.context) &&
    !input.context.hasPermission("products.manage")
  ) {
    throw new ForbiddenError("Product management permission is required");
  }
}

export function evaluateMediaUploadPolicy(
  input: MediaUploadPolicyInput
): MediaUploadPolicyDecision {
  assertMediaPurposeAuthorization(input);

  const extension = IMAGE_MIME_EXTENSIONS[input.contentType];
  if (!extension) {
    throw new ValidationError("MEDIA_CONTENT_TYPE_NOT_ALLOWED");
  }

  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new ValidationError("MEDIA_SIZE_INVALID");
  }

  const maxBytes = PURPOSE_MAX_BYTES[
    input.purpose as keyof typeof PURPOSE_MAX_BYTES
  ];

  if (input.sizeBytes > maxBytes) {
    throw new ValidationError("MEDIA_SIZE_EXCEEDS_PURPOSE_LIMIT");
  }

  return {
    maxBytes,
    extension,
    visibility: input.requestedVisibility ?? "PUBLIC",
  };
}
