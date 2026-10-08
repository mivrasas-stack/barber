import { NextRequest, NextResponse } from "next/server";
import { authorizeSubscriptionRequest } from "@/modules/subscriptions/infrastructure/subscription-auth";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { ResumeSubscriptionUseCase } from "@/modules/subscriptions/application/resume-subscription.usecase";
import { AppError } from "@/shared/errors/app-error";

const subscriptionRepo = new DrizzleSubscriptionRepository();
const resumeUseCase = new ResumeSubscriptionUseCase(subscriptionRepo);

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeSubscriptionRequest(req, { requireOwnerOrAdmin: true });

    const result = await resumeUseCase.execute({
      tenantId: auth.tenantId,
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
