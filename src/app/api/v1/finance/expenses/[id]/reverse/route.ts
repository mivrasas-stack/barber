import { NextRequest, NextResponse } from "next/server";
import { authorizeFinanceRequest } from "@/modules/finance/infrastructure/finance-auth";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { ReverseExpenseUseCase } from "@/modules/finance/application/reverse-expense.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { tenantId, session } = await authorizeFinanceRequest(request, {
      requiredModule: "finance.expenses",
      targetTenantId: body.tenantId,
    });

    const reason = body.reason || "Manual expense reversal";

    const financeRepo = new DrizzleFinanceRepository();
    const useCase = new ReverseExpenseUseCase(financeRepo);

    const reversed = await useCase.execute({
      expenseId: id,
      tenantId,
      actorUserId: session.userId,
      reason,
    });

    return NextResponse.json({
      data: {
        id: reversed.id,
        tenantId: reversed.tenantId,
        status: reversed.status,
        description: reversed.description,
        amount: reversed.amount.toJSON(),
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
