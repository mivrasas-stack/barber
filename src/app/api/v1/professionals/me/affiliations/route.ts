import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleAffiliationRepository } from "@/modules/professionals/infrastructure/drizzle-affiliation.repository";
import { ManageAffiliationUseCase } from "@/modules/professionals/application/manage-affiliation.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await validateSessionWithDb(token);
    if (!session) return NextResponse.json({ error: "Session invalid" }, { status: 401 });

    const profRepo = new DrizzleProfessionalRepository();
    const profile = await profRepo.findByUserId(session.userId);
    if (!profile) return NextResponse.json({ error: "PROFESSIONAL_PROFILE_NOT_FOUND" }, { status: 404 });

    const affilRepo = new DrizzleAffiliationRepository();
    const affiliations = await affilRepo.listByProfessional(profile.id);

    return NextResponse.json({ data: affiliations });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await validateSessionWithDb(token);
    if (!session) return NextResponse.json({ error: "Session invalid" }, { status: 401 });

    const profRepo = new DrizzleProfessionalRepository();
    const profile = await profRepo.findByUserId(session.userId);
    if (!profile) return NextResponse.json({ error: "PROFESSIONAL_PROFILE_NOT_FOUND" }, { status: 404 });

    const workspace = await profRepo.findWorkspaceByProfileId(profile.id);
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const body = await request.json();
    const affilRepo = new DrizzleAffiliationRepository();
    const useCase = new ManageAffiliationUseCase(affilRepo, profRepo);

    const affiliation = await useCase.requestAffiliation({
      professionalWorkspaceTenantId: workspace.tenantId,
      hostTenantId: body.hostTenantId,
      relationshipType: body.relationshipType,
      locationIds: body.locationIds,
      requestedByUserId: session.userId,
    });

    return NextResponse.json({ data: affiliation }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
