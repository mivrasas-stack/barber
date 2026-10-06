import { NextRequest, NextResponse } from "next/server";
import { authorizeFinanceRequest } from "@/modules/finance/infrastructure/finance-auth";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { ReverseJournalEntryUseCase } from "@/modules/finance/application/reverse-journal-entry.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { tenantId, session } = await authorizeFinanceRequest(request, {
      requiredModule: "finance.ledger",
      targetTenantId: body.tenantId,
    });

    const reason = body.reason || "Manual reversal adjustment";

    const financeRepo = new DrizzleFinanceRepository();
    const useCase = new ReverseJournalEntryUseCase(financeRepo);

    const reversal = await useCase.execute({
      journalEntryId: id,
      tenantId,
      actorUserId: session.userId,
      reason,
      allowClawbackAdjustment: body.allowClawbackAdjustment,
    });

    return NextResponse.json({
      data: {
        id: reversal.id,
        entryNumber: reversal.entryNumber,
        status: reversal.status,
        entryType: reversal.entryType,
        reversedEntryId: reversal.reversalOfEntryId,
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
