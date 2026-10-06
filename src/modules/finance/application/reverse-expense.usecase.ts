import { IFinanceRepository } from "../domain/finance-repository.interface";
import { Expense } from "../domain/expense";

export interface ReverseExpenseInput {
  expenseId: string;
  tenantId: string;
  actorUserId: string;
  reason: string;
}

export class ReverseExpenseUseCase {
  constructor(private readonly financeRepository: IFinanceRepository) {}

  async execute(input: ReverseExpenseInput): Promise<Expense> {
    return this.financeRepository.reverseExpense(
      input.expenseId,
      input.tenantId,
      input.actorUserId,
      input.reason
    );
  }
}
