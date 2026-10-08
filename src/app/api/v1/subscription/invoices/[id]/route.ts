import { NextRequest, NextResponse } from "next/server";
import { authorizeSubscriptionRequest } from "@/modules/subscriptions/infrastructure/subscription-auth";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { AppError, NotFoundError, ForbiddenError } from "@/shared/errors/app-error";

const subscriptionRepo = new DrizzleSubscriptionRepository();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeSubscriptionRequest(req);
    const resolvedParams = await params;
    const invoice = await subscriptionRepo.findInvoiceById(resolvedParams.id);

    if (!invoice) {
      throw new NotFoundError("SubscriptionInvoice", resolvedParams.id);
    }

    if (invoice.tenantId !== auth.tenantId && !auth.session.isPlatformAdmin) {
      throw new ForbiddenError("Cannot view an invoice belonging to another workspace");
    }

    return NextResponse.json({
      data: invoice,
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
