import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleModuleRepository } from "@/modules/modules/infrastructure/drizzle-module.repository";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { ModuleEntitlementResolver } from "@/modules/modules/application/module-entitlement-resolver";
import { AppError } from "@/shared/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await validateSessionWithDb(token);
    if (!session) return NextResponse.json({ error: "Session invalid" }, { status: 401 });

    const profRepo = new DrizzleProfessionalRepository();
    const profile = await profRepo.findByUserId(session.userId);
    if (!profile) {
      return NextResponse.json({ error: "PROFESSIONAL_PROFILE_NOT_FOUND" }, { status: 404 });
    }

    const workspace = await profRepo.findWorkspaceByProfileId(profile.id);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const moduleRepo = new DrizzleModuleRepository();
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
