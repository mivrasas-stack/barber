import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { DrizzleAffiliationRepository } from "@/modules/professionals/infrastructure/drizzle-affiliation.repository";
import { ProvisionProfessionalUseCase } from "@/modules/professionals/application/provision-professional.usecase";
import { AppError } from "@/shared/errors/app-error";
import { z } from "zod";
import { randomBytes } from "node:crypto";

const adminProvisionSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(2).max(255),
  displayName: z.string().trim().min(2).max(255),
  professionalSlug: z.string().trim().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  workspaceName: z.string().trim().min(2).max(255).optional(),
  planCode: z.enum(["SOLO_STARTER", "SOLO_PRO", "SOLO_ELITE"]),
  accessDuration: z.enum(["DAY", "MONTH", "YEAR"]),
}).strict();

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
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "JSON inválido", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, { status: 500 });
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

    const raw = adminProvisionSchema.safeParse(await request.json());
    if (!raw.success) {
      return NextResponse.json({ error: "Datos del profesional inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    const body = raw.data;
    // The plaintext password exists only in this request and the one-time response.
    const generatedPassword = randomBytes(24).toString("base64url");
    const useCase = new ProvisionProfessionalUseCase();

    const result = await useCase.execute({
      email: body.email,
      name: body.name,
      password: generatedPassword,
      displayName: body.displayName,
      professionalSlug: body.professionalSlug,
      workspaceName: body.workspaceName,
      planCode: body.planCode,
      adminAccessDuration: body.accessDuration,
      actorUserId: session.userId,
    });

    return NextResponse.json({
      data: result,
      // Delivered to an authenticated platform admin once; never stored as plaintext.
      credentials: { email: result.user.email, temporaryPassword: generatedPassword },
      accessEndsAt: result.subscription.trialEndsAt?.toISOString() ?? null,
    }, {
      status: 201,
      headers: { "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache" },
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "JSON inválido", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
