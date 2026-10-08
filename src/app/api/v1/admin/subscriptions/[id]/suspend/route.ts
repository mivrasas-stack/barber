import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { AdminSubscriptionActionsUseCase } from "@/modules/subscriptions/application/admin-subscription-actions.usecase";
import { AppError, NotFoundError } from "@/shared/errors/app-error";

const subscriptionRepo = new DrizzleSubscriptionRepository();
const adminActions = new AdminSubscriptionActionsUseCase(subscriptionRepo);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await validateSessionWithDb(token);
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden: Platform Admin access required" }, { status: 403 });
    }

    const resolvedParams = await params;
    const body = await req.json().catch(() => ({}));

    let sub = await subscriptionRepo.findSubscriptionById(resolvedParams.id);
    if (!sub) {
      sub = await subscriptionRepo.findSubscriptionByTenant(resolvedParams.id);
    }
    if (!sub) {
      throw new NotFoundError("Subscription", resolvedParams.id);
    }

    const result = await adminActions.suspendSubscription(
      sub.tenantId,
      body.reason || "Administrative suspension",
      session.userId
    );

    return NextResponse.json({
      data: result,
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
