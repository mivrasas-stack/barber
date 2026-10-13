import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/infrastructure/database/client";
import { services } from "@/infrastructure/database/schema/services";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";
import { requireMediaSession } from "@/modules/media/infrastructure/media-api-auth";
import { mediaApiError } from "@/modules/media/infrastructure/media-api-error";
import { ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error";

export const schema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().max(5000).optional(),
  duration: z.number().int().min(1).max(1440),
  price: z.number().int().min(0).max(100000000),
});

export async function resolveTenant(userId: string, write = false) {
  const repo = new DrizzleProfessionalRepository();
  const profile = await repo.findByUserId(userId);
  if (!profile) throw new NotFoundError("Professional profile");
  const workspace = await repo.findWorkspaceByProfileId(profile.id);
  if (!workspace || workspace.status !== "ACTIVE") throw new ForbiddenError("Active professional workspace required");
  const auth = await new DrizzleAuthorizationRepository().getAuthorizationContext(userId, workspace.tenantId);
  if (!auth || auth.activeTenantId !== workspace.tenantId) throw new ForbiddenError("Active membership required");
  if (write && !auth.isPlatformAdmin && !auth.hasRole("OWNER") && !auth.hasRole("MANAGER") && !auth.hasPermission("services.manage")) {
    throw new ForbiddenError("Service management permission required");
  }
  return workspace.tenantId;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireMediaSession(request);
    const tenantId = await resolveTenant(session.userId);
    const rows = await db.select().from(services).where(and(eq(services.tenantId, tenantId), eq(services.status, "ACTIVE")));
    return NextResponse.json({ data: rows.map(row => ({
      id: row.id, name: row.name, description: row.description ?? "",
      duration: row.durationMinutes, price: row.priceMinor, imageUrl: "",
    })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return mediaApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireMediaSession(request);
    const tenantId = await resolveTenant(session.userId, true);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ValidationError("Invalid service", parsed.error.flatten());
    const input = parsed.data;
    const slug = `service-${crypto.randomUUID()}`;
    const [row] = await db.insert(services).values({
      tenantId, slug, name: input.name, description: input.description,
      durationMinutes: input.duration, priceMinor: input.price,
    }).returning();
    return NextResponse.json({ data: { id: row.id, name: row.name, description: row.description ?? "", duration: row.durationMinutes, price: row.priceMinor, imageUrl: "" } }, { status: 201 });
  } catch (error) { return mediaApiError(error); }
}
