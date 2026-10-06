export type TenantId = string;
export type TenantStatus = "ACTIVE" | "SUSPENDED" | "CANCELLED";

export interface TenantProps {
  id: TenantId;
  slug: string;
  name: string;
  status: TenantStatus;
  defaultCurrency: string;
  defaultTimezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Tenant {
  constructor(private readonly props: TenantProps) {}

  get id(): TenantId {
    return this.props.id;
  }

  get slug(): string {
    return this.props.slug;
  }

  get name(): string {
    return this.props.name;
  }

  get status(): TenantStatus {
    return this.props.status;
  }

  get defaultCurrency(): string {
    return this.props.defaultCurrency;
  }

  get defaultTimezone(): string {
    return this.props.defaultTimezone;
  }

  get isActive(): boolean {
    return this.props.status === "ACTIVE";
  }
}
