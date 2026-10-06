import { ValidationError } from "@/shared/errors/app-error";

export type AffiliationRelationshipType =
  | "CHAIR_RENTAL"
  | "COMMISSION"
  | "HYBRID"
  | "CONTRACTOR"
  | "GUEST";

export type AffiliationStatus =
  | "REQUESTED"
  | "INVITED"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED"
  | "ENDED";

export interface ProfessionalAffiliationProps {
  id: string;
  professionalWorkspaceTenantId: string;
  professionalProfileId: string;
  hostTenantId: string;
  relationshipType: AffiliationRelationshipType;
  status: AffiliationStatus;
  startsAt: Date;
  endsAt?: Date | null;
  requestedByUserId?: string | null;
  approvedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ALLOWED_AFFILIATION_TRANSITIONS: Record<AffiliationStatus, AffiliationStatus[]> = {
  REQUESTED: ["ACTIVE", "REJECTED", "ENDED"],
  INVITED: ["ACTIVE", "REJECTED", "ENDED"],
  ACTIVE: ["SUSPENDED", "ENDED"],
  SUSPENDED: ["ACTIVE", "ENDED"],
  REJECTED: [],
  ENDED: [],
};

export class ProfessionalAffiliation {
  constructor(private readonly props: ProfessionalAffiliationProps) {}

  get id(): string { return this.props.id; }
  get professionalWorkspaceTenantId(): string { return this.props.professionalWorkspaceTenantId; }
  get professionalProfileId(): string { return this.props.professionalProfileId; }
  get hostTenantId(): string { return this.props.hostTenantId; }
  get relationshipType(): AffiliationRelationshipType { return this.props.relationshipType; }
  get status(): AffiliationStatus { return this.props.status; }
  get startsAt(): Date { return this.props.startsAt; }
  get endsAt(): Date | null | undefined { return this.props.endsAt; }
  get requestedByUserId(): string | null | undefined { return this.props.requestedByUserId; }
  get approvedByUserId(): string | null | undefined { return this.props.approvedByUserId; }

  get isActive(): boolean {
    return this.props.status === "ACTIVE";
  }

  canTransitionTo(targetStatus: AffiliationStatus): boolean {
    return ALLOWED_AFFILIATION_TRANSITIONS[this.status]?.includes(targetStatus) ?? false;
  }

  assertCanTransitionTo(targetStatus: AffiliationStatus): void {
    if (!this.canTransitionTo(targetStatus)) {
      throw new ValidationError(
        `Invalid affiliation transition from '${this.status}' to '${targetStatus}'`
      );
    }
  }
}

export interface AffiliationLocationScope {
  id: string;
  affiliationId: string;
  locationId: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface AffiliationTerms {
  id: string;
  affiliationId: string;
  settlementModel: string;
  commissionBasisPoints?: number | null;
  fixedRentAmountMinor?: number | null;
  currency: string;
  settlementFrequency?: string | null;
  effectiveFrom: Date;
  effectiveUntil?: Date | null;
}

export interface ProfessionalLocationService {
  id: string;
  affiliationId: string;
  locationId: string;
  serviceId: string;
  priceOverrideMinor?: number | null;
  durationOverrideMinutes?: number | null;
  isActive: boolean;
}
