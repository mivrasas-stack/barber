import { Money } from "./money";
import { InvalidJournalLineError } from "./finance-errors";

export type JournalDirection = "DEBIT" | "CREDIT";

export interface JournalLineProps {
  id?: string;
  journalEntryId?: string;
  financialAccountId: string;
  tenantId: string;
  direction: JournalDirection;
  amount: Money;
  memo?: string | null;
  createdAt?: Date;
}

export class JournalLine {
  readonly id?: string;
  readonly journalEntryId?: string;
  readonly financialAccountId: string;
  readonly tenantId: string;
  readonly direction: JournalDirection;
  readonly amount: Money;
  readonly memo?: string | null;
  readonly createdAt: Date;

  constructor(props: JournalLineProps) {
    if (props.amount.amountMinor <= BigInt(0)) {
      throw new InvalidJournalLineError("Journal line amount must be greater than zero.");
    }
    if (!props.financialAccountId) {
      throw new InvalidJournalLineError("Journal line must reference a financialAccountId.");
    }
    if (!props.tenantId) {
      throw new InvalidJournalLineError("Journal line must reference a tenantId.");
    }

    this.id = props.id;
    this.journalEntryId = props.journalEntryId;
    this.financialAccountId = props.financialAccountId;
    this.tenantId = props.tenantId;
    this.direction = props.direction;
    this.amount = props.amount;
    this.memo = props.memo ?? null;
    this.createdAt = props.createdAt ?? new Date();
  }

  isDebit(): boolean {
    return this.direction === "DEBIT";
  }

  isCredit(): boolean {
    return this.direction === "CREDIT";
  }

  invertDirection(): JournalLine {
    return new JournalLine({
      financialAccountId: this.financialAccountId,
      tenantId: this.tenantId,
      direction: this.direction === "DEBIT" ? "CREDIT" : "DEBIT",
      amount: this.amount,
      memo: this.memo ? `Reversal: ${this.memo}` : "Reversal",
    });
  }
}
