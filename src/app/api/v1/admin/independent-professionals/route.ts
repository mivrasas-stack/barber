import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { DrizzleAffiliationRepository } from "@/modules/professionals/infrastructure/drizzle-affiliation.repository";
import { ProvisionProfessionalUseCase } from "@/modules/professionals/application/provision-professional.usecase";
import { AppError, ForbiddenError } from "@/shared/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await validateSessionWithDb(token);
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden: Platform Admin access required" }, { status: 403 });
    }

    const profRepo = new DrizzleProfessionalRepository();
    const subRepo = new DrizzleSubscriptionRepository();
    const affilRepo = new DrizzleAffiliationRepository();

    const list = await profRepo.listAllProfessionals();

    const enriched = await Promise.all(
      list.map(async (item) => {
        const sub = await subRepo.findSubscriptionByTenant(item.workspace.tenantId);
        const plan = sub ? await subRepo.findPlanById(sub.planId) : null;
        const affiliations = await affilRepo.listByProfessional(item.profile.id);

        return {
          profile: item.profile,
          workspace: item.workspace,
          subscription: sub,
          plan,
          affiliationsCount: affiliations.length,
          activeAffiliationsCount: affiliations.filter((a) => a.isActive).length,
        };
      })
    );

    // Compute metrics
    const total = enriched.length;
    const active = enriched.filter((e) => e.workspace.isActive && e.subscription?.isOperational).length;
    const trialing = enriched.filter((e) => e.subscription?.status === "TRIALING").length;
    const suspended = enriched.filter((e) => e.workspace.status === "SUSPENDED" || e.subscription?.status === "SUSPENDED").length;
    const withActiveAffiliation = enriched.filter((e) => e.activeAffiliationsCount > 0).length;

    return NextResponse.json({
      data: enriched,
      metrics: {
        total,
        active,
        trialing,
        suspended,
        withActiveAffiliation,
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

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await validateSessionWithDb(token);
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden: Platform Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const useCase = new ProvisionProfessionalUseCase();

    const result = await useCase.execute({
      userId: body.userId,
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
      actorUserId: session.userId,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
