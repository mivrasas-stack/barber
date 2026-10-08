import { NextRequest, NextResponse } from "next/server";
import { authorizeSubscriptionRequest } from "@/modules/subscriptions/infrastructure/subscription-auth";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { ChangeSubscriptionPlanUseCase } from "@/modules/subscriptions/application/change-subscription-plan.usecase";
import { AppError } from "@/shared/errors/app-error";

const subscriptionRepo = new DrizzleSubscriptionRepository();
const changePlanUseCase = new ChangeSubscriptionPlanUseCase(subscriptionRepo);

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeSubscriptionRequest(req, { requireOwnerOrAdmin: true });
    const body = await req.json();

    if (!body.planId && !body.planCode) {
      return NextResponse.json({ error: "planId or planCode is required" }, { status: 400 });
    }

    const result = await changePlanUseCase.execute({
      tenantId: auth.tenantId,
      newPlanCodeOrId: body.planId || body.planCode,
      immediate: body.immediate,
      actorUserId: auth.userId,
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
