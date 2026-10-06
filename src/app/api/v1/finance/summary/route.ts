import { NextRequest, NextResponse } from "next/server";
import { authorizeFinanceRequest } from "@/modules/finance/infrastructure/finance-auth";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await authorizeFinanceRequest(request, {
      requiredModule: "finance.overview",
    });

    const searchParams = request.nextUrl.searchParams;
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const currency = searchParams.get("currency") || "COP";

    const from = fromStr ? new Date(fromStr) : undefined;
    const to = toStr ? new Date(toStr) : undefined;

    const financeRepo = new DrizzleFinanceRepository();
    const useCase = new GetFinancialSummaryUseCase(financeRepo);

    const summary = await useCase.execute({
      tenantId,
      from,
      to,
      currency,
    });

    return NextResponse.json({
      data: {
        tenantId: summary.tenantId,
        currency: summary.currency,
        totalRevenue: summary.totalRevenue.toJSON(),
        totalExpenses: summary.totalExpenses.toJSON(),
        netIncome: summary.netIncome.toJSON(),
        totalCash: summary.totalCash.toJSON(),
        totalReceivables: summary.totalReceivables.toJSON(),
        totalPayables: summary.totalPayables.toJSON(),
        accountBalances: summary.accountBalances.map((b) => ({
          accountCode: b.account.accountCode,
          accountName: b.account.accountName,
          accountType: b.account.accountType,
          normalBalance: b.account.normalBalance,
          debitTotal: b.debitTotal.toJSON(),
          creditTotal: b.creditTotal.toJSON(),
          netBalance: b.netBalance.toJSON(),
        })),
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
