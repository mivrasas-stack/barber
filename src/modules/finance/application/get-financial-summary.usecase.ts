import { IFinanceRepository, FinancialSummary } from "../domain/finance-repository.interface";

export interface GetFinancialSummaryInput {
  tenantId: string;
  from?: Date;
  to?: Date;
  currency?: string;
}

export class GetFinancialSummaryUseCase {
  constructor(private readonly financeRepository: IFinanceRepository) {}

  async execute(input: GetFinancialSummaryInput): Promise<FinancialSummary> {
    return this.financeRepository.getFinancialSummary(
      input.tenantId,
      input.from,
      input.to,
      input.currency ?? "COP"
    );
  }
}
