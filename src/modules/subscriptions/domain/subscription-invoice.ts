export type InvoiceStatus = "DRAFT" | "OPEN" | "PAID" | "VOID" | "UNCOLLECTIBLE";
export type InvoiceLineType = "PLAN_CHARGE" | "DISCOUNT" | "TAX" | "ADJUSTMENT";

export interface SubscriptionInvoiceLineProps {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPriceMinor: bigint;
  amountMinor: bigint;
  lineType: InvoiceLineType;
  createdAt: Date;
}

export class SubscriptionInvoiceLine {
  constructor(private readonly props: SubscriptionInvoiceLineProps) {}

  get id(): string { return this.props.id; }
  get invoiceId(): string { return this.props.invoiceId; }
  get description(): string { return this.props.description; }
  get quantity(): number { return this.props.quantity; }
  get unitPriceMinor(): bigint { return this.props.unitPriceMinor; }
  get amountMinor(): bigint { return this.props.amountMinor; }
  get lineType(): InvoiceLineType { return this.props.lineType; }
  get createdAt(): Date { return this.props.createdAt; }
}

export interface SubscriptionInvoiceProps {
  id: string;
  tenantId: string;
  subscriptionId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string;
  subtotalMinor: bigint;
  discountMinor: bigint;
  taxMinor: bigint;
  totalMinor: bigint;
  periodStart: Date;
  periodEnd: Date;
  dueAt: Date;
  paidAt?: Date | null;
  voidedAt?: Date | null;
  planCodeSnapshot: string;
  planNameSnapshot: string;
  billingPeriodSnapshot: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  lines?: SubscriptionInvoiceLine[];
}

export class SubscriptionInvoice {
  constructor(private readonly props: SubscriptionInvoiceProps) {}

  get id(): string { return this.props.id; }
  get tenantId(): string { return this.props.tenantId; }
  get subscriptionId(): string { return this.props.subscriptionId; }
  get invoiceNumber(): string { return this.props.invoiceNumber; }
  get status(): InvoiceStatus { return this.props.status; }
  get currency(): string { return this.props.currency; }
  get subtotalMinor(): bigint { return this.props.subtotalMinor; }
  get discountMinor(): bigint { return this.props.discountMinor; }
  get taxMinor(): bigint { return this.props.taxMinor; }
  get totalMinor(): bigint { return this.props.totalMinor; }
  get periodStart(): Date { return this.props.periodStart; }
  get periodEnd(): Date { return this.props.periodEnd; }
  get dueAt(): Date { return this.props.dueAt; }
  get paidAt(): Date | null | undefined { return this.props.paidAt; }
  get voidedAt(): Date | null | undefined { return this.props.voidedAt; }
  get planCodeSnapshot(): string { return this.props.planCodeSnapshot; }
  get planNameSnapshot(): string { return this.props.planNameSnapshot; }
  get billingPeriodSnapshot(): string { return this.props.billingPeriodSnapshot; }
  get metadata(): Record<string, unknown> | null | undefined { return this.props.metadata; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get lines(): SubscriptionInvoiceLine[] { return this.props.lines ?? []; }

  get isOpen(): boolean { return this.props.status === "OPEN"; }
  get isPaid(): boolean { return this.props.status === "PAID"; }
  get isVoid(): boolean { return this.props.status === "VOID"; }

  canBePaid(): boolean {
    return this.props.status === "OPEN";
  }
}
