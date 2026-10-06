import { NextRequest, NextResponse } from "next/server";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { SubscriptionPlan } from "@/modules/subscriptions/domain/subscription-plan";
import { AppError } from "@/shared/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const audienceParam = searchParams.get("audience");
    const audience =
      audienceParam === "BUSINESS" || audienceParam === "SOLO_PROFESSIONAL" || audienceParam === "ALL"
        ? audienceParam
        : undefined;

    const subRepo = new DrizzleSubscriptionRepository();
    const plans: SubscriptionPlan[] = await subRepo.listPlans(audience);

    return NextResponse.json({
      data: plans.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        audience: p.audience,
        description: p.description,
        billingPeriod: p.billingPeriod,
        priceMinor: p.priceMinor,
        currency: p.currency,
        trialDays: p.trialDays,
        status: p.status,
      })),
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
