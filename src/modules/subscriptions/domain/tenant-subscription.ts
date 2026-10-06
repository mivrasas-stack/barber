export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "SUSPENDED"
  | "CANCELLED"
  | "PENDING_PAYMENT";

export interface TenantSubscriptionProps {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  startsAt: Date;
  trialEndsAt?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class TenantSubscription {
  constructor(private readonly props: TenantSubscriptionProps) {}

  get id(): string { return this.props.id; }
  get tenantId(): string { return this.props.tenantId; }
  get planId(): string { return this.props.planId; }
  get status(): SubscriptionStatus { return this.props.status; }
  get startsAt(): Date { return this.props.startsAt; }
  get trialEndsAt(): Date | null | undefined { return this.props.trialEndsAt; }
  get currentPeriodStart(): Date | null | undefined { return this.props.currentPeriodStart; }
  get currentPeriodEnd(): Date | null | undefined { return this.props.currentPeriodEnd; }
  get cancelAtPeriodEnd(): boolean { return this.props.cancelAtPeriodEnd; }

  get isOperational(): boolean {
    return this.props.status === "TRIALING" || this.props.status === "ACTIVE";
  }
}
