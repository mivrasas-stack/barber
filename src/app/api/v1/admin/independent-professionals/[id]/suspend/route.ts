import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
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
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden: Platform Admin access required" }, { status: 403 });
    }

    const profRepo = new DrizzleProfessionalRepository();
    const profile = await profRepo.findById(id);
    if (!profile) return NextResponse.json({ error: "Professional not found" }, { status: 404 });

    const workspace = await profRepo.findWorkspaceByProfileId(profile.id);
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const newStatus = body.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED";

    const updatedWorkspace = await profRepo.updateWorkspaceStatus(workspace.tenantId, newStatus);
    const subRepo = new DrizzleSubscriptionRepository();
    const updatedSub = await subRepo.updateSubscriptionStatus(
      workspace.tenantId,
      newStatus === "SUSPENDED" ? "SUSPENDED" : "ACTIVE"
    );

    return NextResponse.json({
      data: {
        workspace: updatedWorkspace,
        subscription: updatedSub,
      },
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
