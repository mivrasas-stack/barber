export interface ProfessionalProfileProps {
  id: string;
  userId: string;
  professionalSlug: string;
  displayName: string;
  bio?: string | null;
  avatarMediaId?: string | null;
  phonePublic?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  yearsExperience?: number | null;
  bookingEnabled: boolean;
  profileVisibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  createdAt: Date;
  updatedAt: Date;
}

export class ProfessionalProfile {
  constructor(private readonly props: ProfessionalProfileProps) {}

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get professionalSlug(): string { return this.props.professionalSlug; }
  get displayName(): string { return this.props.displayName; }
  get bio(): string | null | undefined { return this.props.bio; }
  get avatarMediaId(): string | null | undefined { return this.props.avatarMediaId; }
  get phonePublic(): string | null | undefined { return this.props.phonePublic; }
  get instagram(): string | null | undefined { return this.props.instagram; }
  get tiktok(): string | null | undefined { return this.props.tiktok; }
  get yearsExperience(): number | null | undefined { return this.props.yearsExperience; }
  get bookingEnabled(): boolean { return this.props.bookingEnabled; }
  get profileVisibility(): "PUBLIC" | "UNLISTED" | "PRIVATE" { return this.props.profileVisibility; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
}

export interface ProfessionalWorkspaceProps {
  id: string;
  professionalProfileId: string;
  tenantId: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: Date;
  updatedAt: Date;
}

export class ProfessionalWorkspace {
  constructor(private readonly props: ProfessionalWorkspaceProps) {}

  get id(): string { return this.props.id; }
  get professionalProfileId(): string { return this.props.professionalProfileId; }
  get tenantId(): string { return this.props.tenantId; }
  get status(): "ACTIVE" | "SUSPENDED" { return this.props.status; }
  get isActive(): boolean { return this.props.status === "ACTIVE"; }
}

export interface CustomerRelationshipProps {
  id: string;
  tenantId: string;
  customerUserId: string;
  status: "ACTIVE" | "INACTIVE";
  firstSeenAt: Date;
  lastSeenAt: Date;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomerRelationship {
  constructor(private readonly props: CustomerRelationshipProps) {}

  get id(): string { return this.props.id; }
  get tenantId(): string { return this.props.tenantId; }
  get customerUserId(): string { return this.props.customerUserId; }
  get status(): "ACTIVE" | "INACTIVE" { return this.props.status; }
  get firstSeenAt(): Date { return this.props.firstSeenAt; }
  get lastSeenAt(): Date { return this.props.lastSeenAt; }
  get notes(): string | null | undefined { return this.props.notes; }
}
