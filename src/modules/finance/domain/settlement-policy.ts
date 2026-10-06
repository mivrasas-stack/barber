import { Money } from "./money";

export type SettlementModel = "CHAIR_RENTAL" | "COMMISSION" | "HYBRID";

export type CollectorParty = "COLLECTED_BY_PROFESSIONAL" | "COLLECTED_BY_HOST" | "DIRECT";

export interface ServiceCalculationInput {
  serviceGrossMinor: bigint;
  tipMinor?: bigint;
  currency: string;
  settlementModel?: SettlementModel | null;
  commissionBasisPoints?: number | null; // e.g. 2000 = 20%
  collectorParty: CollectorParty;
  fixedRentAmountMinor?: bigint | null;
}

export interface ServiceFinancialBreakdown {
  currency: string;
  grossServiceAmount: Money;
  tipAmount: Money;
  totalCollected: Money;
  commissionBasisPoints: number;
  hostCommissionAmount: Money;
  professionalServiceShare: Money;
  professionalTotalShare: Money; // serviceShare + tip
  collectorParty: CollectorParty;
  hostNetReceivable: Money; // Amount Host is owed by Professional (if professional collected)
  professionalNetReceivable: Money; // Amount Professional is owed by Host (if host collected)
}

export class SettlementPolicy {
  /**
   * Calculates deterministic breakdown for an appointment service according to affiliation terms.
   */
  static calculateServiceBreakdown(input: ServiceCalculationInput): ServiceFinancialBreakdown {
    const currency = input.currency.toUpperCase();
    const grossServiceAmount = Money.fromMinor(input.serviceGrossMinor, currency);
    const tipAmount = Money.fromMinor(input.tipMinor ?? BigInt(0), currency);
    const totalCollected = grossServiceAmount.plus(tipAmount);

    let commissionBasisPoints = 0;
    let hostCommissionAmount = Money.zero(currency);
    let professionalServiceShare = grossServiceAmount;

    // Determine model
    const model = input.settlementModel ?? "COMMISSION";

    if (model === "COMMISSION" || model === "HYBRID") {
      commissionBasisPoints = Math.max(0, Math.min(10000, input.commissionBasisPoints ?? 0));
      if (commissionBasisPoints > 0) {
        hostCommissionAmount = grossServiceAmount.multiplyBasisPoints(commissionBasisPoints);
        professionalServiceShare = grossServiceAmount.minus(hostCommissionAmount);
      }
    } else if (model === "CHAIR_RENTAL") {
      // In chair rental, commission on services is 0. 100% goes to the professional.
      commissionBasisPoints = 0;
      hostCommissionAmount = Money.zero(currency);
      professionalServiceShare = grossServiceAmount;
    }

    const professionalTotalShare = professionalServiceShare.plus(tipAmount);

    let hostNetReceivable = Money.zero(currency);
    let professionalNetReceivable = Money.zero(currency);

    if (input.collectorParty === "COLLECTED_BY_HOST") {
      // Host holds all cash. Host owes Professional their share + tips.
      professionalNetReceivable = professionalTotalShare;
    } else if (input.collectorParty === "COLLECTED_BY_PROFESSIONAL") {
      // Professional holds all cash. Professional owes Host the commission.
      hostNetReceivable = hostCommissionAmount;
    }

    return {
      currency,
      grossServiceAmount,
      tipAmount,
      totalCollected,
      commissionBasisPoints,
      hostCommissionAmount,
      professionalServiceShare,
      professionalTotalShare,
      collectorParty: input.collectorParty,
      hostNetReceivable,
      professionalNetReceivable,
    };
  }
}
