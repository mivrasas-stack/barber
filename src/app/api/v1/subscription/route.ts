import { NextRequest, NextResponse } from "next/server";
import { authorizeSubscriptionRequest } from "@/modules/subscriptions/infrastructure/subscription-auth";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { GetSubscriptionStatusUseCase } from "@/modules/subscriptions/application/get-subscription-status.usecase";
import { AppError } from "@/shared/errors/app-error";

const subscriptionRepo = new DrizzleSubscriptionRepository();
const getStatusUseCase = new GetSubscriptionStatusUseCase(subscriptionRepo);

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeSubscriptionRequest(req);
    const summary = await getStatusUseCase.execute(auth.tenantId);

    return NextResponse.json({
      data: summary,
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
