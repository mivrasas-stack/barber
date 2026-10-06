import {
  ProfessionalAffiliation,
  AffiliationLocationScope,
  AffiliationTerms,
  ProfessionalLocationService,
  AffiliationRelationshipType,
  AffiliationStatus,
} from "./professional-affiliation";

export interface CreateAffiliationInput {
  professionalWorkspaceTenantId: string;
  professionalProfileId: string;
  hostTenantId: string;
  relationshipType?: AffiliationRelationshipType;
  status?: AffiliationStatus;
  requestedByUserId?: string;
  approvedByUserId?: string;
  locationIds?: string[];
}

export interface AffiliationRepository {
  findById(id: string): Promise<ProfessionalAffiliation | null>;
  findActiveAffiliation(
    profWorkspaceTenantId: string,
    hostTenantId: string
  ): Promise<ProfessionalAffiliation | null>;
  listByProfessional(professionalProfileId: string): Promise<ProfessionalAffiliation[]>;
  listByHostTenant(hostTenantId: string): Promise<ProfessionalAffiliation[]>;
  create(input: CreateAffiliationInput): Promise<ProfessionalAffiliation>;
  updateStatus(
    id: string,
    status: AffiliationStatus,
    approvedByUserId?: string
  ): Promise<ProfessionalAffiliation>;
  addLocationScope(affiliationId: string, locationId: string): Promise<void>;
  listLocationScopes(affiliationId: string): Promise<AffiliationLocationScope[]>;
  isLocationAuthorized(affiliationId: string, locationId: string): Promise<boolean>;
  setTerms(
    affiliationId: string,
    terms: Omit<AffiliationTerms, "id" | "affiliationId">
  ): Promise<void>;
  getTerms(affiliationId: string): Promise<AffiliationTerms | null>;
  assignLocationService(service: Omit<ProfessionalLocationService, "id">): Promise<void>;
  listLocationServices(affiliationId: string): Promise<ProfessionalLocationService[]>;
}
