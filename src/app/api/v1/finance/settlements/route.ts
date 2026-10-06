import { NextRequest, NextResponse } from "next/server";
import { authorizeFinanceRequest } from "@/modules/finance/infrastructure/finance-auth";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { CreateSettlementUseCase } from "@/modules/finance/application/create-settlement.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await authorizeFinanceRequest(request, {
      requiredModule: "finance.settlements",
    });

    const searchParams = request.nextUrl.searchParams;
    const affiliationId = searchParams.get("affiliationId") || undefined;
    const status = searchParams.get("status") || undefined;
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const from = fromStr ? new Date(fromStr) : undefined;
    const to = toStr ? new Date(toStr) : undefined;

    const financeRepo = new DrizzleFinanceRepository();
    const result = await financeRepo.listSettlements(tenantId, {
      affiliationId,
      status,
      from,
      to,
      page,
      limit,
    });

    return NextResponse.json({
      data: {
        settlements: result.settlements.map((s) => ({
          id: s.id,
          fromTenantId: s.fromTenantId,
          toTenantId: s.toTenantId,
          affiliationId: s.affiliationId,
          currency: s.currency,
          amount: s.amount.toJSON(),
          status: s.status,
          settlementType: s.settlementType,
          reference: s.reference,
          notes: s.notes,
          confirmedAt: s.confirmedAt ? s.confirmedAt.toISOString() : null,
          createdAt: s.createdAt.toISOString(),
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, session } = await authorizeFinanceRequest(request, {
      requiredModule: "finance.settlements",
      targetTenantId: body.fromTenantId || body.tenantId,
    });

    if (!body.toTenantId || !body.amountMinor) {
      return NextResponse.json(
        { error: "toTenantId and amountMinor are required." },
        { status: 400 }
      );
    }

    const financeRepo = new DrizzleFinanceRepository();
    const useCase = new CreateSettlementUseCase(financeRepo);

    const settlement = await useCase.execute({
      fromTenantId: tenantId,
      toTenantId: body.toTenantId,
      affiliationId: body.affiliationId,
      amountMinor: BigInt(body.amountMinor),
      currency: body.currency,
      settlementType: body.settlementType,
      reference: body.reference,
      notes: body.notes,
      periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
      actorUserId: session.userId,
    });

    return NextResponse.json(
      {
        data: {
          id: settlement.id,
          fromTenantId: settlement.fromTenantId,
          toTenantId: settlement.toTenantId,
          amount: settlement.amount.toJSON(),
          currency: settlement.currency,
          status: settlement.status,
          settlementType: settlement.settlementType,
          confirmedAt: settlement.confirmedAt ? settlement.confirmedAt.toISOString() : null,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
