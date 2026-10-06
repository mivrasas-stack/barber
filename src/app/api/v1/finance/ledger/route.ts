import { NextRequest, NextResponse } from "next/server";
import { authorizeFinanceRequest } from "@/modules/finance/infrastructure/finance-auth";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { GetLedgerEntriesUseCase } from "@/modules/finance/application/get-ledger-entries.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await authorizeFinanceRequest(request, {
      requiredModule: "finance.ledger",
    });

    const searchParams = request.nextUrl.searchParams;
    const sourceType = searchParams.get("sourceType") || undefined;
    const status = searchParams.get("status") || undefined;
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const from = fromStr ? new Date(fromStr) : undefined;
    const to = toStr ? new Date(toStr) : undefined;

    const financeRepo = new DrizzleFinanceRepository();
    const useCase = new GetLedgerEntriesUseCase(financeRepo);

    const result = await useCase.execute({
      tenantId,
      sourceType,
      status,
      from,
      to,
      page,
      limit,
    });

    return NextResponse.json({
      data: {
        entries: result.entries.map((e) => ({
          id: e.id,
          entryNumber: e.entryNumber,
          entryType: e.entryType,
          currency: e.currency,
          sourceType: e.sourceType,
          sourceId: e.sourceId,
          description: e.description,
          status: e.status,
          occurredAt: e.occurredAt.toISOString(),
          postedAt: e.postedAt.toISOString(),
          reversedEntryId: e.reversedEntryId,
          reversalOfEntryId: e.reversalOfEntryId,
          totalAmount: e.getTotalAmount().toJSON(),
          lines: e.lines.map((l) => ({
            id: l.id,
            financialAccountId: l.financialAccountId,
            direction: l.direction,
            amount: l.amount.toJSON(),
            memo: l.memo,
          })),
        })),
        total: result.total,
        page,
        limit,
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
