import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { DrizzleAffiliationRepository } from "@/modules/professionals/infrastructure/drizzle-affiliation.repository";
import { DrizzleModuleRepository } from "@/modules/modules/infrastructure/drizzle-module.repository";
import { ModuleEntitlementResolver } from "@/modules/modules/application/module-entitlement-resolver";
import { AppError } from "@/shared/errors/app-error";

export async function GET(
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
    const subRepo = new DrizzleSubscriptionRepository();
    const subscription = workspace ? await subRepo.findSubscriptionByTenant(workspace.tenantId) : null;
    const plan = subscription ? await subRepo.findPlanById(subscription.planId) : null;

    const affilRepo = new DrizzleAffiliationRepository();
    const affiliations = await affilRepo.listByProfessional(profile.id);

    const moduleRepo = new DrizzleModuleRepository();
    const resolver = new ModuleEntitlementResolver(moduleRepo, subRepo);
    const effectiveModules = workspace ? await resolver.resolveEffectiveModules(workspace.tenantId) : [];
    const overrides = workspace ? await moduleRepo.listTenantOverrides(workspace.tenantId) : [];

    return NextResponse.json({
      data: {
        profile,
        workspace,
        subscription,
        plan,
        affiliations,
        effectiveModules,
        overrides,
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

export async function PATCH(
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

    const body = await request.json();
    const profRepo = new DrizzleProfessionalRepository();
    const updated = await profRepo.updateProfile(id, body);

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
