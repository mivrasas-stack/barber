import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CompleteMediaUploadUseCase } from "@/modules/media/application/complete-media-upload.usecase";
import { DrizzleMediaRepository } from "@/modules/media/infrastructure/drizzle-media.repository";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";
import { getMediaObjectStorage } from "@/infrastructure/media/media-storage-runtime";
import { requireMediaSession } from "@/modules/media/infrastructure/media-api-auth";
import { mediaApiError } from "@/modules/media/infrastructure/media-api-error";
import { ValidationError } from "@/shared/errors/app-error";

const bodySchema = z.object({
  tenantId: z.string().uuid(),
  uploadIntentId: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireMediaSession(request);
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError("Invalid media asset id");
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid media upload completion",
        parsed.error.flatten()
      );
    }

    const useCase = new CompleteMediaUploadUseCase(
      new DrizzleMediaRepository(),
      getMediaObjectStorage(),
      new DrizzleAuthorizationRepository()
    );

    const result = await useCase.execute({
      actorUserId: session.userId,
      tenantId: parsed.data.tenantId,
      assetId: id,
      uploadIntentId: parsed.data.uploadIntentId,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return mediaApiError(error);
  }
}
