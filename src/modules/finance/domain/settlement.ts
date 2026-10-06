import { Money } from "./money";
import { CrossTenantSettlementError } from "./finance-errors";

export type SettlementStatus = "DRAFT" | "PENDING" | "CONFIRMED" | "CANCELLED";

export type SettlementType = "MANUAL" | "COMMISSION" | "CHAIR_RENT" | "HYBRID";

export interface SettlementProps {
  id?: string;
  fromTenantId: string;
  toTenantId: string;
  affiliationId?: string | null;
  currency: string;
  amount: Money;
  status?: SettlementStatus;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  settlementType?: SettlementType;
  reference?: string | null;
  notes?: string | null;
  journalEntryId?: string | null;
  createdByUserId?: string | null;
  confirmedAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Settlement {
  readonly id?: string;
  readonly fromTenantId: string;
  readonly toTenantId: string;
  readonly affiliationId?: string | null;
  readonly currency: string;
  readonly amount: Money;
  readonly status: SettlementStatus;
  readonly periodStart?: Date | null;
  readonly periodEnd?: Date | null;
  readonly settlementType: SettlementType;
  readonly reference?: string | null;
  readonly notes?: string | null;
  readonly journalEntryId?: string | null;
  readonly createdByUserId?: string | null;
  readonly confirmedAt?: Date | null;
  readonly cancelledAt?: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: SettlementProps) {
    if (props.fromTenantId === props.toTenantId) {
      throw new CrossTenantSettlementError(
        "Settlement fromTenantId and toTenantId cannot be the same tenant."
      );
    }
    if (props.amount.amountMinor <= BigInt(0)) {
      throw new Error("Settlement amount must be greater than zero.");
    }
    if (props.amount.currency !== props.currency.toUpperCase()) {
      throw new Error(
        `Settlement currency mismatch: expected ${props.currency}, got ${props.amount.currency}`
      );
    }

    this.id = props.id;
    this.fromTenantId = props.fromTenantId;
    this.toTenantId = props.toTenantId;
    this.affiliationId = props.affiliationId ?? null;
    this.currency = props.currency.toUpperCase();
    this.amount = props.amount;
    this.status = props.status ?? "CONFIRMED";
    this.periodStart = props.periodStart ?? null;
    this.periodEnd = props.periodEnd ?? null;
    this.settlementType = props.settlementType ?? "MANUAL";
    this.reference = props.reference ?? null;
    this.notes = props.notes ?? null;
    this.journalEntryId = props.journalEntryId ?? null;
    this.createdByUserId = props.createdByUserId ?? null;
    this.confirmedAt = props.confirmedAt ?? (this.status === "CONFIRMED" ? new Date() : null);
    this.cancelledAt = props.cancelledAt ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  isConfirmed(): boolean {
    return this.status === "CONFIRMED";
  }

  isCancelled(): boolean {
    return this.status === "CANCELLED";
  }
}
