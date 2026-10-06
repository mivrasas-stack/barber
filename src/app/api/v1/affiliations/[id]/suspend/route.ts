import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleAffiliationRepository } from "@/modules/professionals/infrastructure/drizzle-affiliation.repository";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { ManageAffiliationUseCase } from "@/modules/professionals/application/manage-affiliation.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await validateSessionWithDb(token);
    if (!session) return NextResponse.json({ error: "Session invalid" }, { status: 401 });

    const affilRepo = new DrizzleAffiliationRepository();
    const profRepo = new DrizzleProfessionalRepository();
    const useCase = new ManageAffiliationUseCase(affilRepo, profRepo);

    const updated = await useCase.suspendAffiliation({
      affiliationId: id,
      actorUserId: session.userId,
    });

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
