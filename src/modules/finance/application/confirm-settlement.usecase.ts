import { IFinanceRepository } from "../domain/finance-repository.interface";
import { Settlement } from "../domain/settlement";

export interface ConfirmSettlementInput {
  settlementId: string;
  actorUserId: string;
}

export class ConfirmSettlementUseCase {
  constructor(private readonly financeRepository: IFinanceRepository) {}

  async execute(input: ConfirmSettlementInput): Promise<Settlement> {
    return this.financeRepository.confirmSettlement(
      input.settlementId,
      input.actorUserId
    );
  }
}
