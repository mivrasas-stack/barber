import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CreateMediaUploadIntentUseCase } from "@/modules/media/application/create-media-upload-intent.usecase";
import { DrizzleMediaRepository } from "@/modules/media/infrastructure/drizzle-media.repository";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";
import { requireMediaSession } from "@/modules/media/infrastructure/media-api-auth";
import { mediaApiError } from "@/modules/media/infrastructure/media-api-error";
import {
  assertDirectMediaUploadConfigured,
  getMediaObjectStorage,
} from "@/infrastructure/media/media-storage-runtime";
import { ValidationError } from "@/shared/errors/app-error";

const inputSchema = z.object({
  tenantId: z.string().uuid(),
  ownerUserId: z.string().uuid().nullable().optional(),
  purpose: z.enum([
    "PROFESSIONAL_AVATAR",
    "TENANT_LOGO",
    "PORTFOLIO",
    "SERVICE_IMAGE",
    "PRODUCT_IMAGE",
  ]),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  sizeBytes: z.number().int().positive(),
  originalFilename: z.string().max(255).nullable().optional(),
  visibility: z.enum(["PUBLIC", "TENANT", "PRIVATE"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireMediaSession(request);
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid media upload intent",
        parsed.error.flatten()
      );
    }

    assertDirectMediaUploadConfigured();

    const useCase = new CreateMediaUploadIntentUseCase(
      new DrizzleMediaRepository(),
      getMediaObjectStorage(),
      new DrizzleAuthorizationRepository()
    );

    const result = await useCase.execute({
      actorUserId: session.userId,
      ...parsed.data,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return mediaApiError(error);
  }
}
