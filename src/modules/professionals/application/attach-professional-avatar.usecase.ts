import type { MediaRepository } from "@/modules/media/domain/media-repository.interface";
import type { ProfessionalRepository } from "../domain/professional-repository.interface";
import type { ProfessionalProfile } from "../domain/professional-profile";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/shared/errors/app-error";

export class AttachProfessionalAvatarUseCase {
  constructor(
    private readonly professionalRepository: ProfessionalRepository,
    private readonly mediaRepository: MediaRepository
  ) {}

  async execute(input: {
    actorUserId: string;
    assetId: string;
  }): Promise<ProfessionalProfile> {
    const profile = await this.professionalRepository.findByUserId(
      input.actorUserId
    );
    if (!profile) {
      throw new NotFoundError("Professional profile");
    }

    const workspace =
      await this.professionalRepository.findWorkspaceByProfileId(profile.id);
    if (!workspace || workspace.status !== "ACTIVE") {
      throw new ForbiddenError("Active professional workspace required");
    }

    const media = await this.mediaRepository.findMediaForDelivery(input.assetId);
    if (!media) {
      throw new NotFoundError("Media asset");
    }

    if (media.status !== "READY") {
      throw new ValidationError("MEDIA_AVATAR_NOT_READY");
    }
    if (media.purpose !== "PROFESSIONAL_AVATAR") {
      throw new ValidationError("MEDIA_AVATAR_PURPOSE_INVALID");
    }
    if (media.ownerUserId !== input.actorUserId) {
      throw new ForbiddenError("Avatar media belongs to another user");
    }
    if (media.tenantId !== workspace.tenantId) {
      throw new ForbiddenError("Avatar media belongs to another tenant");
    }
    if (!media.variants.some((variant) => variant.variantKey.startsWith("avatar-"))) {
      throw new ValidationError("MEDIA_AVATAR_VARIANTS_MISSING");
    }

    return this.professionalRepository.updateProfile(profile.id, {
      avatarMediaId: media.assetId,
    });
  }
}
