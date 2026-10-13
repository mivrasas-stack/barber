import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { mediaAssets, mediaVariants } from "@/infrastructure/database/schema/media";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";
import { requireMediaSession } from "@/modules/media/infrastructure/media-api-auth";
import { mediaApiError } from "@/modules/media/infrastructure/media-api-error";
import { ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error";
import { getMediaDeliveryUrlResolver } from "@/infrastructure/media/media-storage-runtime";
import { z } from "zod";

async function activeWorkspace(userId: string) {
  const profiles = new DrizzleProfessionalRepository();
  const profile = await profiles.findByUserId(userId);
  if (!profile) throw new NotFoundError("Professional profile");
  const workspace = await profiles.findWorkspaceByProfileId(profile.id);
  if (!workspace || workspace.status !== "ACTIVE") throw new ForbiddenError("Active professional workspace required");
  const auth = await new DrizzleAuthorizationRepository().getAuthorizationContext(userId, workspace.tenantId);
  if (!auth || auth.activeTenantId !== workspace.tenantId) throw new ForbiddenError("Active tenant membership required");
  return workspace;
}

const owned = (tenantId: string, userId: string) => and(
  eq(mediaAssets.tenantId, tenantId), eq(mediaAssets.ownerUserId, userId),
  eq(mediaAssets.purpose, "PORTFOLIO"), isNull(mediaAssets.deletedAt)
);

export async function GET(request: NextRequest) {
  try {
    const session = await requireMediaSession(request);
    const workspace = await activeWorkspace(session.userId);
    const assets = await db.select({
      id: mediaAssets.id, name: mediaAssets.originalFilename,
      status: mediaAssets.status, visibility: mediaAssets.visibility, createdAt: mediaAssets.createdAt,
      objectKey: mediaVariants.objectKey,
    }).from(mediaAssets)
      .leftJoin(mediaVariants, and(eq(mediaVariants.mediaAssetId, mediaAssets.id),
        eq(mediaVariants.variantKey, "portfolio-640w-webp")))
      .where(owned(workspace.tenantId, session.userId))
      .orderBy(desc(mediaAssets.createdAt)).limit(100);
    const resolver = getMediaDeliveryUrlResolver();
    const photos = await Promise.all(assets.filter(a => a.status === "READY" && a.objectKey).map(async asset => ({
      id: asset.id,
      name: asset.name ?? "Corte",
      url: (await resolver.resolve(asset.objectKey!, asset.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE")).url,
      createdAt: asset.createdAt,
    })));
    return NextResponse.json({ data: photos }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return mediaApiError(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireMediaSession(request);
    const workspace = await activeWorkspace(session.userId);
    const parsed = z.object({ assetId: z.string().uuid() }).safeParse(await request.json());
    if (!parsed.success) throw new ValidationError("Invalid portfolio asset");
    const [removed] = await db.update(mediaAssets)
      .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(owned(workspace.tenantId, session.userId), eq(mediaAssets.id, parsed.data.assetId)))
      .returning({ id: mediaAssets.id });
    if (!removed) throw new NotFoundError("Portfolio image");
    return NextResponse.json({ data: { removed: true } });
  } catch (error) { return mediaApiError(error); }
}
