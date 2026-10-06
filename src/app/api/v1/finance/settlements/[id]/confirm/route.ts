import { NextRequest, NextResponse } from "next/server";
import { authorizeFinanceRequest } from "@/modules/finance/infrastructure/finance-auth";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { ConfirmSettlementUseCase } from "@/modules/finance/application/confirm-settlement.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { session } = await authorizeFinanceRequest(request, {
      requiredModule: "finance.settlements",
    });

    const financeRepo = new DrizzleFinanceRepository();
    const useCase = new ConfirmSettlementUseCase(financeRepo);

    const confirmed = await useCase.execute({
      settlementId: id,
      actorUserId: session.userId,
    });

    return NextResponse.json({
      data: {
        id: confirmed.id,
        status: confirmed.status,
        confirmedAt: confirmed.confirmedAt?.toISOString(),
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
