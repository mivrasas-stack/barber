import { NextRequest, NextResponse } from "next/server";
import { authorizeFinanceRequest } from "@/modules/finance/infrastructure/finance-auth";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { AppError } from "@/shared/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await authorizeFinanceRequest(request, {
      requiredModule: "finance.overview",
    });

    const currency = request.nextUrl.searchParams.get("currency") || "COP";
    const financeRepo = new DrizzleFinanceRepository();

    await financeRepo.getOrCreateDefaultAccounts(tenantId, currency);
    const accounts = await financeRepo.listAccounts(tenantId, currency);

    return NextResponse.json({
      data: accounts.map((a) => ({
        id: a.id,
        tenantId: a.tenantId,
        accountCode: a.accountCode,
        accountName: a.accountName,
        accountType: a.accountType,
        normalBalance: a.normalBalance,
        currency: a.currency,
        status: a.status,
        isSystem: a.isSystem,
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
