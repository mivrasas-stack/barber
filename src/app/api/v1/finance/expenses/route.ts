import { NextRequest, NextResponse } from "next/server";
import { authorizeFinanceRequest } from "@/modules/finance/infrastructure/finance-auth";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { RecordExpenseUseCase } from "@/modules/finance/application/record-expense.usecase";
import { AppError } from "@/shared/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await authorizeFinanceRequest(request, {
      requiredModule: "finance.expenses",
    });

    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get("categoryId") || undefined;
    const status = searchParams.get("status") || undefined;
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const from = fromStr ? new Date(fromStr) : undefined;
    const to = toStr ? new Date(toStr) : undefined;

    const financeRepo = new DrizzleFinanceRepository();
    const result = await financeRepo.listExpenses(tenantId, {
      categoryId,
      status,
      from,
      to,
      page,
      limit,
    });

    return NextResponse.json({
      data: {
        expenses: result.expenses.map((e) => ({
          id: e.id,
          tenantId: e.tenantId,
          categoryId: e.categoryId,
          description: e.description,
          amount: e.amount.toJSON(),
          incurredAt: e.incurredAt.toISOString(),
          status: e.status,
          vendorName: e.vendorName,
          receiptMediaId: e.receiptMediaId,
          journalEntryId: e.journalEntryId,
          createdAt: e.createdAt.toISOString(),
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
      requiredModule: "finance.expenses",
      targetTenantId: body.tenantId,
    });

    if (!body.description || !body.amountMinor) {
      return NextResponse.json(
        { error: "description and amountMinor are required." },
        { status: 400 }
      );
    }

    const financeRepo = new DrizzleFinanceRepository();
    const useCase = new RecordExpenseUseCase(financeRepo);

    const expense = await useCase.execute({
      tenantId,
      description: body.description,
      amountMinor: BigInt(body.amountMinor),
      currency: body.currency,
      categoryId: body.categoryId,
      vendorName: body.vendorName,
      receiptMediaId: body.receiptMediaId,
      incurredAt: body.incurredAt ? new Date(body.incurredAt) : undefined,
      actorUserId: session.userId,
    });

    return NextResponse.json(
      {
        data: {
          id: expense.id,
          tenantId: expense.tenantId,
          description: expense.description,
          amount: expense.amount.toJSON(),
          incurredAt: expense.incurredAt.toISOString(),
          status: expense.status,
          vendorName: expense.vendorName,
          journalEntryId: expense.journalEntryId,
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
