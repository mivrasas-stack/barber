import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleModuleRepository } from "@/modules/modules/infrastructure/drizzle-module.repository";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { ModuleEntitlementResolver } from "@/modules/modules/application/module-entitlement-resolver";
import { AppError } from "@/shared/errors/app-error";

export async function PUT(
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

    const body = await request.json();
    const { moduleId, state, reason } = body;

    const moduleRepo = new DrizzleModuleRepository();
    if (state === "CLEAR" || state === null) {
      await moduleRepo.removeTenantOverride(workspace.tenantId, moduleId);
    } else {
      await moduleRepo.setTenantOverride(
        workspace.tenantId,
        moduleId,
        state as "FORCE_ENABLED" | "FORCE_DISABLED",
        reason,
        session.userId
      );
    }

    const subRepo = new DrizzleSubscriptionRepository();
    const resolver = new ModuleEntitlementResolver(moduleRepo, subRepo);
    const effective = await resolver.resolveEffectiveModules(workspace.tenantId);

    return NextResponse.json({ data: effective });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
