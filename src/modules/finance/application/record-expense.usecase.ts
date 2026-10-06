import { IFinanceRepository } from "../domain/finance-repository.interface";
import { Expense } from "../domain/expense";
import { Money } from "../domain/money";

export interface RecordExpenseInput {
  tenantId: string;
  description: string;
  amountMinor: bigint | number;
  currency?: string;
  categoryId?: string | null;
  vendorName?: string | null;
  receiptMediaId?: string | null;
  incurredAt?: Date;
  actorUserId: string;
}

export class RecordExpenseUseCase {
  constructor(private readonly financeRepository: IFinanceRepository) {}

  async execute(input: RecordExpenseInput): Promise<Expense> {
    const currency = (input.currency ?? "COP").toUpperCase();
    const amount = Money.fromMinor(BigInt(input.amountMinor), currency);

    const expense = new Expense({
      tenantId: input.tenantId,
      description: input.description,
      amount,
      categoryId: input.categoryId,
      vendorName: input.vendorName,
      receiptMediaId: input.receiptMediaId,
      incurredAt: input.incurredAt ?? new Date(),
      createdByUserId: input.actorUserId,
    });

    return this.financeRepository.createExpense(expense);
  }
}
