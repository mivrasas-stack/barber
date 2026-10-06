import { Money } from "./money";

export type ExpenseStatus = "POSTED" | "REVERSED";

export interface ExpenseProps {
  id?: string;
  tenantId: string;
  categoryId?: string | null;
  description: string;
  amount: Money;
  incurredAt?: Date;
  status?: ExpenseStatus;
  vendorName?: string | null;
  receiptMediaId?: string | null;
  journalEntryId?: string | null;
  createdByUserId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Expense {
  readonly id?: string;
  readonly tenantId: string;
  readonly categoryId?: string | null;
  readonly description: string;
  readonly amount: Money;
  readonly incurredAt: Date;
  readonly status: ExpenseStatus;
  readonly vendorName?: string | null;
  readonly receiptMediaId?: string | null;
  readonly journalEntryId?: string | null;
  readonly createdByUserId?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: ExpenseProps) {
    if (props.amount.amountMinor <= BigInt(0)) {
      throw new Error("Expense amount must be greater than zero.");
    }

    this.id = props.id;
    this.tenantId = props.tenantId;
    this.categoryId = props.categoryId ?? null;
    this.description = props.description;
    this.amount = props.amount;
    this.incurredAt = props.incurredAt ?? new Date();
    this.status = props.status ?? "POSTED";
    this.vendorName = props.vendorName ?? null;
    this.receiptMediaId = props.receiptMediaId ?? null;
    this.journalEntryId = props.journalEntryId ?? null;
    this.createdByUserId = props.createdByUserId ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  isReversed(): boolean {
    return this.status === "REVERSED";
  }
}
