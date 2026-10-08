import { Money } from "./money";
import { JournalLine } from "./journal-line";
import {
  UnbalancedJournalEntryError,
  CurrencyMismatchError,
  JournalEntryAlreadyReversedError,
  InvalidJournalLineError,
} from "./finance-errors";

export type JournalEntryType =
  | "SERVICE_REVENUE"
  | "PRODUCT_SALE"
  | "EXPENSE"
  | "SETTLEMENT"
  | "CHAIR_RENT_OBLIGATION"
  | "ADJUSTMENT"
  | "REVERSAL";

export type JournalSourceType =
  | "APPOINTMENT"
  | "ORDER"
  | "EXPENSE"
  | "SETTLEMENT"
  | "ADJUSTMENT"
  | "REVERSAL";

export type JournalEntryStatus = "POSTED" | "REVERSED";

export interface JournalEntryProps {
  id?: string;
  tenantId: string;
  entryNumber: string;
  entryType: JournalEntryType;
  currency: string;
  sourceType: JournalSourceType;
  sourceId?: string | null;
  description: string;
  status?: JournalEntryStatus;
  occurredAt?: Date;
  postedAt?: Date;
  reversedEntryId?: string | null;
  reversalOfEntryId?: string | null;
  createdByUserId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  lines: JournalLine[];
}

export class JournalEntry {
  readonly id?: string;
  readonly tenantId: string;
  readonly entryNumber: string;
  readonly entryType: JournalEntryType;
  readonly currency: string;
  readonly sourceType: JournalSourceType;
  readonly sourceId?: string | null;
  readonly description: string;
  readonly status: JournalEntryStatus;
  readonly occurredAt: Date;
  readonly postedAt: Date;
  readonly reversedEntryId?: string | null;
  readonly reversalOfEntryId?: string | null;
  readonly createdByUserId?: string | null;
  readonly metadata?: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly lines: readonly JournalLine[];

  constructor(props: JournalEntryProps) {
    if (!props.lines || props.lines.length < 2) {
      throw new InvalidJournalLineError(
        "A journal entry must contain at least two journal lines (double-entry requirement)."
      );
    }

    const currency = props.currency.toUpperCase();

    let totalDebit = BigInt(0);
    let totalCredit = BigInt(0);

    for (const line of props.lines) {
      if (line.amount.currency !== currency) {
        throw new CurrencyMismatchError(currency, line.amount.currency);
      }

      if (line.direction === "DEBIT") {
        totalDebit += line.amount.amountMinor;
      } else if (line.direction === "CREDIT") {
        totalCredit += line.amount.amountMinor;
      } else {
        throw new InvalidJournalLineError(`Invalid direction ${(line as any).direction}`);
      }
    }

    if (totalDebit !== totalCredit) {
      throw new UnbalancedJournalEntryError(
        props.entryNumber,
        Money.fromMinor(totalDebit, currency).toFormattedString(),
        Money.fromMinor(totalCredit, currency).toFormattedString()
      );
    }

    this.id = props.id;
    this.tenantId = props.tenantId;
    this.entryNumber = props.entryNumber;
    this.entryType = props.entryType;
    this.currency = currency;
    this.sourceType = props.sourceType;
    this.sourceId = props.sourceId ?? null;
    this.description = props.description;
    this.status = props.status ?? "POSTED";
    this.occurredAt = props.occurredAt ?? new Date();
    this.postedAt = props.postedAt ?? new Date();
    this.reversedEntryId = props.reversedEntryId ?? null;
    this.reversalOfEntryId = props.reversalOfEntryId ?? null;
    this.createdByUserId = props.createdByUserId ?? null;
    this.metadata = props.metadata ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.lines = Object.freeze([...props.lines]);
  }

  isReversed(): boolean {
    return this.status === "REVERSED" || this.reversedEntryId !== null;
  }

  getTotalAmount(): Money {
    let debitSum = BigInt(0);
    for (const line of this.lines) {
      if (line.isDebit()) {
        debitSum += line.amount.amountMinor;
      }
    }
    return Money.fromMinor(debitSum, this.currency);
  }

  createReversal(
    reversalEntryNumber: string,
    actorUserId: string,
    reason: string
  ): JournalEntry {
    if (this.isReversed()) {
      throw new JournalEntryAlreadyReversedError(this.id || this.entryNumber);
    }

    const invertedLines = this.lines.map((line) => line.invertDirection());

    return new JournalEntry({
      tenantId: this.tenantId,
      entryNumber: reversalEntryNumber,
      entryType: "REVERSAL",
      currency: this.currency,
      sourceType: "REVERSAL",
      sourceId: this.id ?? null,
      reversalOfEntryId: this.id ?? null,
      description: `Reversal of entry ${this.entryNumber}: ${reason}`,
      status: "POSTED",
      occurredAt: new Date(),
      postedAt: new Date(),
      createdByUserId: actorUserId,
      metadata: {
        reversedOriginalEntryId: this.id,
        reversedOriginalEntryNumber: this.entryNumber,
        reason,
      },
      lines: invertedLines,
    });
  }
}
