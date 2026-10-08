export interface SubscriptionStatusHistoryProps {
  id: string;
  subscriptionId: string;
  tenantId: string;
  fromStatus?: string | null;
  toStatus: string;
  reason?: string | null;
  source: string;
  actorUserId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export class SubscriptionStatusHistory {
  constructor(private readonly props: SubscriptionStatusHistoryProps) {}

  get id(): string { return this.props.id; }
  get subscriptionId(): string { return this.props.subscriptionId; }
  get tenantId(): string { return this.props.tenantId; }
  get fromStatus(): string | null | undefined { return this.props.fromStatus; }
  get toStatus(): string { return this.props.toStatus; }
  get reason(): string | null | undefined { return this.props.reason; }
  get source(): string { return this.props.source; }
  get actorUserId(): string | null | undefined { return this.props.actorUserId; }
  get metadata(): Record<string, unknown> | null | undefined { return this.props.metadata; }
  get createdAt(): Date { return this.props.createdAt; }
}
