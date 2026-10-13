import { serviceSchema, resolveProfessionalTenant } from "./shared";
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



export async function GET(request: NextRequest) {
  try {
    const session = await requireMediaSession(request);
    const tenantId = await resolveProfessionalTenant(session.userId);
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
    const tenantId = await resolveProfessionalTenant(session.userId, true);
    const parsed = serviceSchema.safeParse(await request.json());
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
