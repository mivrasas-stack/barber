import { NextRequest, NextResponse } from "next/server";
import { ProvisionProfessionalUseCase } from "@/modules/professionals/application/provision-professional.usecase";
import { DrizzleIdempotencyRepository } from "@/modules/appointments/infrastructure/drizzle-idempotency.repository";
import { AppError } from "@/shared/errors/app-error";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idempotencyKey =
      request.headers.get("x-idempotency-key") ||
      request.headers.get("idempotency-key") ||
      undefined;

    const idempotencyRepo = new DrizzleIdempotencyRepository();

    if (idempotencyKey) {
      const hash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
      // Use system tenant ID for global registrations
      const globalSystemTenantId = "00000000-0000-0000-0000-000000000000";
      const existing = await idempotencyRepo.find(
        globalSystemTenantId,
        body.email || "anonymous",
        "PROFESSIONAL_REGISTER",
        idempotencyKey
      );

      if (existing) {
        if (existing.status === "COMPLETED") {
          return NextResponse.json({ data: existing.responseBody, isIdempotentReplay: true }, { status: 200 });
        }
        if (existing.status === "PROCESSING") {
          return NextResponse.json({ error: "Registration request already in progress" }, { status: 409 });
        }
      }
    }

    const useCase = new ProvisionProfessionalUseCase();
    const result = await useCase.execute({
      email: body.email,
      name: body.displayName,
      password: body.password,
      displayName: body.displayName,
      professionalSlug: body.professionalSlug,
      workspaceName: body.workspaceName,
      planCode: body.planCode,
      bio: body.bio,
      phonePublic: body.phonePublic,
      instagram: body.instagram,
      tiktok: body.tiktok,
      yearsExperience: body.yearsExperience,
    });

    if (idempotencyKey) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const rec = await idempotencyRepo.create({
        tenantId: "00000000-0000-0000-0000-000000000000",
        userId: result.user.id,
        key: idempotencyKey,
        operation: "PROFESSIONAL_REGISTER",
        requestHash: createHash("sha256").update(JSON.stringify(body)).digest("hex"),
        expiresAt,
      });
      await idempotencyRepo.complete(rec.id, 201, {
        profileId: result.profile.id,
        workspaceId: result.tenant.id,
      });
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
