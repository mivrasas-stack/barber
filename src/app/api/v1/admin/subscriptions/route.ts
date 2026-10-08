import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { db } from "@/infrastructure/database/client";
import { tenantSubscriptions, subscriptionPlans, tenants } from "@/infrastructure/database/schema";
import { eq, desc } from "drizzle-orm";
import { AppError } from "@/shared/errors/app-error";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await validateSessionWithDb(token);
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden: Platform Admin access required" }, { status: 403 });
    }

    const rows = await db
      .select({
        id: tenantSubscriptions.id,
        tenantId: tenantSubscriptions.tenantId,
        tenantName: tenants.name,
        tenantType: tenants.tenantType,
        planId: tenantSubscriptions.planId,
        planCode: subscriptionPlans.code,
        planName: subscriptionPlans.name,
        status: tenantSubscriptions.status,
        startsAt: tenantSubscriptions.startsAt,
        trialEndsAt: tenantSubscriptions.trialEndsAt,
        currentPeriodStart: tenantSubscriptions.currentPeriodStart,
        currentPeriodEnd: tenantSubscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: tenantSubscriptions.cancelAtPeriodEnd,
        pastDueAt: tenantSubscriptions.pastDueAt,
        graceEndsAt: tenantSubscriptions.graceEndsAt,
        suspendedAt: tenantSubscriptions.suspendedAt,
        pendingPlanId: tenantSubscriptions.pendingPlanId,
        createdAt: tenantSubscriptions.createdAt,
      })
      .from(tenantSubscriptions)
      .leftJoin(tenants, eq(tenantSubscriptions.tenantId, tenants.id))
      .leftJoin(subscriptionPlans, eq(tenantSubscriptions.planId, subscriptionPlans.id))
      .orderBy(desc(tenantSubscriptions.createdAt));

    return NextResponse.json({
      data: rows,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
