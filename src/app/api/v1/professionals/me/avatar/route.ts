import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AttachProfessionalAvatarUseCase } from "@/modules/professionals/application/attach-professional-avatar.usecase";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleMediaRepository } from "@/modules/media/infrastructure/drizzle-media.repository";
import { requireMediaSession } from "@/modules/media/infrastructure/media-api-auth";
import { mediaApiError } from "@/modules/media/infrastructure/media-api-error";
import { NotFoundError, ValidationError } from "@/shared/errors/app-error";

const bodySchema = z.object({
  assetId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireMediaSession(request);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ValidationError("Invalid avatar media", parsed.error.flatten());
    }

    const useCase = new AttachProfessionalAvatarUseCase(
      new DrizzleProfessionalRepository(),
      new DrizzleMediaRepository()
    );

    const profile = await useCase.execute({
      actorUserId: session.userId,
      assetId: parsed.data.assetId,
    });

    return NextResponse.json({ data: profile });
  } catch (error) {
    return mediaApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireMediaSession(request);
    const repository = new DrizzleProfessionalRepository();
    const profile = await repository.findByUserId(session.userId);
    if (!profile) {
      throw new NotFoundError("Professional profile");
    }
    const workspace = await repository.findWorkspaceByProfileId(profile.id);
    if (!workspace || workspace.status !== "ACTIVE") throw new NotFoundError("Active professional workspace");
    return NextResponse.json({
      data: { assetId: profile.avatarMediaId ?? null, tenantId: workspace.tenantId },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return mediaApiError(error);
  }
}
