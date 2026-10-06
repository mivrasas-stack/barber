export interface StaffProfileProps {
  id: string;
  tenantId: string;
  membershipId: string;
  displayName: string;
  bio?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffServiceAssignment {
  id: string;
  staffId: string;
  serviceId: string;
  durationOverrideMinutes?: number | null;
  priceOverrideMinor?: number | null;
  isActive: boolean;
}

export interface StaffLocationAssignment {
  id: string;
  staffId: string;
  locationId: string;
  status: string;
}

export class StaffProfile {
  constructor(private readonly props: StaffProfileProps) {}

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get membershipId(): string {
    return this.props.membershipId;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get bio(): string | null | undefined {
    return this.props.bio;
  }

  get status(): string {
    return this.props.status;
  }

  get isActive(): boolean {
    return this.props.status === "ACTIVE";
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
