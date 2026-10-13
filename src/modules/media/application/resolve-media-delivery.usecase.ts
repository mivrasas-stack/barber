import type { AuthorizationRepository } from "@/modules/authorization/domain/authorization-repository.interface";
import type { MediaRepository } from "@/modules/media/domain/media-repository.interface";
import { ForbiddenError, NotFoundError, UnauthenticatedError } from "@/shared/errors/app-error";
import type { MediaDeliveryUrlResolver } from "@/infrastructure/media/media-delivery-url-resolver";

export interface ResolveMediaDeliveryInput {
  assetId: string;
  variantKey?: string;
  actorUserId?: string;
  isPlatformAdmin?: boolean;
}

export interface ResolveMediaDeliveryResult {
  assetId: string;
  tenantId: string | null;
  purpose: string;
  visibility: string;
  variantKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  url: string;
  expiresAt: Date | null;
  cacheable: boolean;
}

export class ResolveMediaDeliveryUseCase {
  constructor(
    private readonly repository: MediaRepository,
    private readonly authorizationRepository: AuthorizationRepository,
    private readonly urlResolver: MediaDeliveryUrlResolver
  ) {}

  async execute(
    input: ResolveMediaDeliveryInput
  ): Promise<ResolveMediaDeliveryResult> {
    const media = await this.repository.findMediaForDelivery(input.assetId);

    if (!media || media.status !== "READY" || media.variants.length === 0) {
      throw new NotFoundError("Media asset");
    }

    if (media.visibility !== "PUBLIC") {
      if (!input.actorUserId) {
        throw new UnauthenticatedError();
      }

      if (!input.isPlatformAdmin) {
        if (!media.tenantId) {
          throw new ForbiddenError("Private global media requires platform admin");
        }

        if (media.visibility === "PRIVATE" && media.ownerUserId === input.actorUserId) {
          // Owner access is sufficient.
        } else {
          const context =
            await this.authorizationRepository.getAuthorizationContext(
              input.actorUserId,
              media.tenantId
            );

          if (!context || context.activeTenantId !== media.tenantId) {
            throw new ForbiddenError("Active tenant membership is required");
          }

          if (
            media.visibility === "PRIVATE" &&
            !context.hasRole("OWNER") &&
            !context.hasRole("MANAGER") &&
            !context.hasPermission("tenant.manage") &&
            !context.hasPermission("settings.manage") &&
            !context.hasPermission("staff.manage")
          ) {
            throw new ForbiddenError("Private media access denied");
          }
        }
      }
    }

    const variant = input.variantKey
      ? media.variants.find((candidate) => candidate.variantKey === input.variantKey)
      : media.variants[0];

    if (!variant) {
      throw new NotFoundError("Media variant");
    }

    const resolved = await this.urlResolver.resolve(
      variant.objectKey,
      media.visibility
    );

    return {
      assetId: media.assetId,
      tenantId: media.tenantId,
      purpose: media.purpose,
      visibility: media.visibility,
      variantKey: variant.variantKey,
      mimeType: variant.mimeType,
      width: variant.width,
      height: variant.height,
      url: resolved.url,
      expiresAt: resolved.expiresAt,
      cacheable: resolved.cacheable,
    };
  }
}
