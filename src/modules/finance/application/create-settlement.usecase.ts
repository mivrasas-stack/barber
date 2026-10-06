import { IFinanceRepository } from "../domain/finance-repository.interface";
import { Settlement, SettlementType } from "../domain/settlement";
import { Money } from "../domain/money";

export interface CreateSettlementInput {
  fromTenantId: string;
  toTenantId: string;
  affiliationId?: string | null;
  amountMinor: bigint | number;
  currency?: string;
  settlementType?: SettlementType;
  reference?: string | null;
  notes?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  actorUserId: string;
}

export class CreateSettlementUseCase {
  constructor(private readonly financeRepository: IFinanceRepository) {}

  async execute(input: CreateSettlementInput): Promise<Settlement> {
    const currency = (input.currency ?? "COP").toUpperCase();
    const amount = Money.fromMinor(BigInt(input.amountMinor), currency);

    const settlement = new Settlement({
      fromTenantId: input.fromTenantId,
      toTenantId: input.toTenantId,
      affiliationId: input.affiliationId,
      currency,
      amount,
      status: "CONFIRMED",
      settlementType: input.settlementType ?? "MANUAL",
      reference: input.reference,
      notes: input.notes,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      createdByUserId: input.actorUserId,
    });

    return this.financeRepository.createSettlement(settlement);
  }
}
