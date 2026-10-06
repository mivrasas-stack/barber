import {
  ProfessionalProfile,
  ProfessionalWorkspace,
  CustomerRelationship,
} from "./professional-profile";

export interface CreateProfessionalProfileInput {
  userId: string;
  professionalSlug: string;
  displayName: string;
  bio?: string;
  avatarMediaId?: string;
  phonePublic?: string;
  instagram?: string;
  tiktok?: string;
  yearsExperience?: number;
  bookingEnabled?: boolean;
  profileVisibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
}

export interface ProfessionalRepository {
  findById(id: string): Promise<ProfessionalProfile | null>;
  findByUserId(userId: string): Promise<ProfessionalProfile | null>;
  findBySlug(slug: string): Promise<ProfessionalProfile | null>;
  createProfile(input: CreateProfessionalProfileInput): Promise<ProfessionalProfile>;
  updateProfile(id: string, updates: Partial<CreateProfessionalProfileInput>): Promise<ProfessionalProfile>;
  findWorkspaceByProfileId(profileId: string): Promise<ProfessionalWorkspace | null>;
  findWorkspaceByTenantId(tenantId: string): Promise<ProfessionalWorkspace | null>;
  createWorkspace(profileId: string, tenantId: string): Promise<ProfessionalWorkspace>;
  updateWorkspaceStatus(tenantId: string, status: "ACTIVE" | "SUSPENDED"): Promise<ProfessionalWorkspace>;
  listAllProfessionals(): Promise<{
    profile: ProfessionalProfile;
    workspace: ProfessionalWorkspace;
  }[]>;
  recordCustomerRelationship(
    tenantId: string,
    customerUserId: string,
    notes?: string
  ): Promise<CustomerRelationship>;
  listCustomerRelationships(tenantId: string): Promise<CustomerRelationship[]>;
}
