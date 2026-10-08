export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "GRACE_PERIOD"
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
  pastDueAt?: Date | null;
  graceEndsAt?: Date | null;
  suspendedAt?: Date | null;
  pendingPlanId?: string | null;
  pendingPlanEffectiveAt?: Date | null;
  paymentMethodToken?: string | null;
  paymentMethodBrand?: string | null;
  paymentMethodLast4?: string | null;
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
  get pastDueAt(): Date | null | undefined { return this.props.pastDueAt; }
  get graceEndsAt(): Date | null | undefined { return this.props.graceEndsAt; }
  get suspendedAt(): Date | null | undefined { return this.props.suspendedAt; }
  get pendingPlanId(): string | null | undefined { return this.props.pendingPlanId; }
  get pendingPlanEffectiveAt(): Date | null | undefined { return this.props.pendingPlanEffectiveAt; }
  get paymentMethodToken(): string | null | undefined { return this.props.paymentMethodToken; }
  get paymentMethodBrand(): string | null | undefined { return this.props.paymentMethodBrand; }
  get paymentMethodLast4(): string | null | undefined { return this.props.paymentMethodLast4; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  get isOperational(): boolean {
    return (
      this.props.status === "TRIALING" ||
      this.props.status === "ACTIVE" ||
      this.props.status === "PAST_DUE" ||
      this.props.status === "GRACE_PERIOD"
    );
  }

  get isTrialing(): boolean { return this.props.status === "TRIALING"; }
  get isActive(): boolean { return this.props.status === "ACTIVE"; }
  get isPastDue(): boolean { return this.props.status === "PAST_DUE"; }
  get isInGracePeriod(): boolean { return this.props.status === "GRACE_PERIOD"; }
  get isSuspended(): boolean { return this.props.status === "SUSPENDED"; }
  get isCancelled(): boolean { return this.props.status === "CANCELLED"; }
}
