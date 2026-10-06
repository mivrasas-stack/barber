import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
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
    const subRepo = new DrizzleSubscriptionRepository();
    const subscription = workspace ? await subRepo.findSubscriptionByTenant(workspace.tenantId) : null;
    const plan = subscription ? await subRepo.findPlanById(subscription.planId) : null;

    return NextResponse.json({
      data: {
        profile,
        workspace,
        subscription,
        plan,
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

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const updated = await profRepo.updateProfile(profile.id, {
      displayName: body.displayName,
      bio: body.bio,
      phonePublic: body.phonePublic,
      instagram: body.instagram,
      tiktok: body.tiktok,
      yearsExperience: body.yearsExperience,
      bookingEnabled: body.bookingEnabled,
      profileVisibility: body.profileVisibility,
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
