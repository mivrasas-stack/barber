import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { RunBillingCycleUseCase } from "@/modules/subscriptions/application/run-billing-cycle.usecase";
import { AppError } from "@/shared/errors/app-error";

const subscriptionRepo = new DrizzleSubscriptionRepository();
const runBillingUseCase = new RunBillingCycleUseCase(subscriptionRepo);

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await validateSessionWithDb(token);
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden: Platform Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const asOf = body.asOf ? new Date(body.asOf) : new Date();

    const result = await runBillingUseCase.execute({
      asOf,
      triggeredBy: `ADMIN:${session.userId}`,
      force: body.force ?? false,
    });

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
