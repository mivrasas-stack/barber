export interface SubscriptionPlanProps {
  id: string;
  code: string;
  name: string;
  audience: "BUSINESS" | "SOLO_PROFESSIONAL" | "ALL";
  description?: string | null;
  status: "ACTIVE" | "ARCHIVED";
  billingPeriod: "MONTHLY" | "YEARLY";
  priceMinor?: number | null;
  currency: string;
  trialDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export class SubscriptionPlan {
  constructor(private readonly props: SubscriptionPlanProps) {}

  get id(): string { return this.props.id; }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get audience(): "BUSINESS" | "SOLO_PROFESSIONAL" | "ALL" { return this.props.audience; }
  get description(): string | null | undefined { return this.props.description; }
  get status(): "ACTIVE" | "ARCHIVED" { return this.props.status; }
  get billingPeriod(): "MONTHLY" | "YEARLY" { return this.props.billingPeriod; }
  get priceMinor(): number | null | undefined { return this.props.priceMinor; }
  get currency(): string { return this.props.currency; }
  get trialDays(): number { return this.props.trialDays; }
  get isActive(): boolean { return this.props.status === "ACTIVE"; }
}
