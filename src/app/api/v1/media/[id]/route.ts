import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ResolveMediaDeliveryUseCase } from "@/modules/media/application/resolve-media-delivery.usecase";
import { DrizzleMediaRepository } from "@/modules/media/infrastructure/drizzle-media.repository";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";
import { getMediaDeliveryUrlResolver } from "@/infrastructure/media/media-storage-runtime";
import { optionalMediaSession } from "@/modules/media/infrastructure/media-api-auth";
import { mediaApiError } from "@/modules/media/infrastructure/media-api-error";
import { ValidationError } from "@/shared/errors/app-error";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError("Invalid media asset id");
    }

    const variantKey =
      request.nextUrl.searchParams.get("variant")?.trim() || undefined;
    if (variantKey && (variantKey.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(variantKey))) {
      throw new ValidationError("Invalid media variant key");
    }

    const session = await optionalMediaSession(request);
    const useCase = new ResolveMediaDeliveryUseCase(
      new DrizzleMediaRepository(),
      new DrizzleAuthorizationRepository(),
      getMediaDeliveryUrlResolver()
    );

    const result = await useCase.execute({
      assetId: id,
      variantKey,
      actorUserId: session?.userId,
      isPlatformAdmin: session?.isPlatformAdmin,
    });

    return NextResponse.json({
      data: {
        ...result,
        expiresAt: result.expiresAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return mediaApiError(error);
  }
}
