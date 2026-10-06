import { TenantId } from "./tenant";

export type LocationId = string;

export interface LocationProps {
  id: LocationId;
  tenantId: TenantId;
  slug: string;
  name: string;
  address?: string | null;
  timezone: string;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Location {
  constructor(private readonly props: LocationProps) {}

  get id(): LocationId {
    return this.props.id;
  }

  get tenantId(): TenantId {
    return this.props.tenantId;
  }

  get slug(): string {
    return this.props.slug;
  }

  get name(): string {
    return this.props.name;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get currency(): string {
    return this.props.currency;
  }
}
