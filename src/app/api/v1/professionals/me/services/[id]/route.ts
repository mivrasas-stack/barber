import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/infrastructure/database/client";
import { services } from "@/infrastructure/database/schema/services";
import { requireMediaSession } from "@/modules/media/infrastructure/media-api-auth";
import { mediaApiError } from "@/modules/media/infrastructure/media-api-error";
import { NotFoundError, ValidationError } from "@/shared/errors/app-error";
import { resolveTenant, schema } from "../route";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requireMediaSession(request);
    const tenantId = await resolveTenant(session.userId, true);
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError("Invalid service ID");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ValidationError("Invalid service", parsed.error.flatten());
    const [row] = await db.update(services).set({
      name: parsed.data.name, description: parsed.data.description,
      durationMinutes: parsed.data.duration, priceMinor: parsed.data.price,
      updatedAt: new Date(),
    }).where(and(eq(services.id, id), eq(services.tenantId, tenantId), eq(services.status, "ACTIVE"))).returning();
    if (!row) throw new NotFoundError("Service");
    return NextResponse.json({ data: {
      id: row.id, name: row.name, description: row.description ?? "",
      duration: row.durationMinutes, price: row.priceMinor, imageUrl: "",
    } });
  } catch (error) { return mediaApiError(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requireMediaSession(request);
    const tenantId = await resolveTenant(session.userId, true);
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError("Invalid service ID");
    const [row] = await db.update(services).set({ status: "INACTIVE", updatedAt: new Date() })
      .where(and(eq(services.id, id), eq(services.tenantId, tenantId), eq(services.status, "ACTIVE")))
      .returning({ id: services.id });
    if (!row) throw new NotFoundError("Service");
    return NextResponse.json({ data: { id: row.id, disabled: true } });
  } catch (error) { return mediaApiError(error); }
}
