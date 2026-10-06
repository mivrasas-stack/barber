import { eq, and, desc } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  professionalProfiles,
  professionalWorkspaces,
  customerRelationships,
  ProfessionalProfileRow,
  ProfessionalWorkspaceRow,
  CustomerRelationshipRow,
} from "@/infrastructure/database/schema/professionals";
import {
  ProfessionalProfile,
  ProfessionalWorkspace,
  CustomerRelationship,
} from "../domain/professional-profile";
import {
  ProfessionalRepository,
  CreateProfessionalProfileInput,
} from "../domain/professional-repository.interface";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";

export class DrizzleProfessionalRepository implements ProfessionalRepository {
  private toProfileDomain(row: ProfessionalProfileRow): ProfessionalProfile {
    return new ProfessionalProfile({
      id: row.id,
      userId: row.userId,
      professionalSlug: row.professionalSlug,
      displayName: row.displayName,
      bio: row.bio,
      avatarMediaId: row.avatarMediaId,
      phonePublic: row.phonePublic,
      instagram: row.instagram,
      tiktok: row.tiktok,
      yearsExperience: row.yearsExperience,
      bookingEnabled: row.bookingEnabled,
      profileVisibility: row.profileVisibility as any,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toWorkspaceDomain(row: ProfessionalWorkspaceRow): ProfessionalWorkspace {
    return new ProfessionalWorkspace({
      id: row.id,
      professionalProfileId: row.professionalProfileId,
      tenantId: row.tenantId,
      status: row.status as any,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toCustomerRelDomain(row: CustomerRelationshipRow): CustomerRelationship {
    return new CustomerRelationship({
      id: row.id,
      tenantId: row.tenantId,
      customerUserId: row.customerUserId,
      status: row.status as any,
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findById(id: string): Promise<ProfessionalProfile | null> {
    const rows = await db
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.id, id))
      .limit(1);
    if (!rows[0]) return null;
    return this.toProfileDomain(rows[0]);
  }

  async findByUserId(userId: string): Promise<ProfessionalProfile | null> {
    const rows = await db
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.userId, userId))
      .limit(1);
    if (!rows[0]) return null;
    return this.toProfileDomain(rows[0]);
  }

  async findBySlug(slug: string): Promise<ProfessionalProfile | null> {
    const rows = await db
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.professionalSlug, slug.toLowerCase().trim()))
      .limit(1);
    if (!rows[0]) return null;
    return this.toProfileDomain(rows[0]);
  }

  async createProfile(input: CreateProfessionalProfileInput): Promise<ProfessionalProfile> {
    const existingUser = await this.findByUserId(input.userId);
    if (existingUser) {
      throw new ConflictError("Professional profile already exists for this user");
    }

    const existingSlug = await this.findBySlug(input.professionalSlug);
    if (existingSlug) {
      throw new ConflictError(`Professional slug '${input.professionalSlug}' is already taken`);
    }

    const [row] = await db
      .insert(professionalProfiles)
      .values({
        userId: input.userId,
        professionalSlug: input.professionalSlug.toLowerCase().trim(),
        displayName: input.displayName.trim(),
        bio: input.bio,
        avatarMediaId: input.avatarMediaId,
        phonePublic: input.phonePublic,
        instagram: input.instagram,
        tiktok: input.tiktok,
        yearsExperience: input.yearsExperience,
        bookingEnabled: input.bookingEnabled ?? true,
        profileVisibility: input.profileVisibility ?? "PUBLIC",
      })
      .returning();

    return this.toProfileDomain(row);
  }

  async updateProfile(
    id: string,
    updates: Partial<CreateProfessionalProfileInput>
  ): Promise<ProfessionalProfile> {
    const setObj: Record<string, any> = { updatedAt: new Date() };
    if (updates.displayName !== undefined) setObj.displayName = updates.displayName.trim();
    if (updates.bio !== undefined) setObj.bio = updates.bio;
    if (updates.avatarMediaId !== undefined) setObj.avatarMediaId = updates.avatarMediaId;
    if (updates.phonePublic !== undefined) setObj.phonePublic = updates.phonePublic;
    if (updates.instagram !== undefined) setObj.instagram = updates.instagram;
    if (updates.tiktok !== undefined) setObj.tiktok = updates.tiktok;
    if (updates.yearsExperience !== undefined) setObj.yearsExperience = updates.yearsExperience;
    if (updates.bookingEnabled !== undefined) setObj.bookingEnabled = updates.bookingEnabled;
    if (updates.profileVisibility !== undefined) setObj.profileVisibility = updates.profileVisibility;

    const [row] = await db
      .update(professionalProfiles)
      .set(setObj)
      .where(eq(professionalProfiles.id, id))
      .returning();

    if (!row) throw new NotFoundError("Professional profile not found");
    return this.toProfileDomain(row);
  }

  async findWorkspaceByProfileId(profileId: string): Promise<ProfessionalWorkspace | null> {
    const rows = await db
      .select()
      .from(professionalWorkspaces)
      .where(eq(professionalWorkspaces.professionalProfileId, profileId))
      .limit(1);
    if (!rows[0]) return null;
    return this.toWorkspaceDomain(rows[0]);
  }

  async findWorkspaceByTenantId(tenantId: string): Promise<ProfessionalWorkspace | null> {
    const rows = await db
      .select()
      .from(professionalWorkspaces)
      .where(eq(professionalWorkspaces.tenantId, tenantId))
      .limit(1);
    if (!rows[0]) return null;
    return this.toWorkspaceDomain(rows[0]);
  }

  async createWorkspace(profileId: string, tenantId: string): Promise<ProfessionalWorkspace> {
    const [row] = await db
      .insert(professionalWorkspaces)
      .values({
        professionalProfileId: profileId,
        tenantId,
        status: "ACTIVE",
      })
      .returning();
    return this.toWorkspaceDomain(row);
  }

  async updateWorkspaceStatus(
    tenantId: string,
    status: "ACTIVE" | "SUSPENDED"
  ): Promise<ProfessionalWorkspace> {
    const [row] = await db
      .update(professionalWorkspaces)
      .set({ status, updatedAt: new Date() })
      .where(eq(professionalWorkspaces.tenantId, tenantId))
      .returning();
    if (!row) throw new NotFoundError("Professional workspace not found");
    return this.toWorkspaceDomain(row);
  }

  async listAllProfessionals(): Promise<{
    profile: ProfessionalProfile;
    workspace: ProfessionalWorkspace;
  }[]> {
    const rows = await db
      .select({
        profile: professionalProfiles,
        workspace: professionalWorkspaces,
      })
      .from(professionalProfiles)
      .innerJoin(
        professionalWorkspaces,
        eq(professionalProfiles.id, professionalWorkspaces.professionalProfileId)
      )
      .orderBy(desc(professionalProfiles.createdAt));

    return rows.map((r) => ({
      profile: this.toProfileDomain(r.profile),
      workspace: this.toWorkspaceDomain(r.workspace),
    }));
  }

  async recordCustomerRelationship(
    tenantId: string,
    customerUserId: string,
    notes?: string
  ): Promise<CustomerRelationship> {
    const now = new Date();
    const [row] = await db
      .insert(customerRelationships)
      .values({
        tenantId,
        customerUserId,
        status: "ACTIVE",
        firstSeenAt: now,
        lastSeenAt: now,
        notes,
      })
      .onConflictDoUpdate({
        target: [customerRelationships.tenantId, customerRelationships.customerUserId],
        set: {
          lastSeenAt: now,
          status: "ACTIVE",
          updatedAt: now,
        },
      })
      .returning();
    return this.toCustomerRelDomain(row);
  }

  async listCustomerRelationships(tenantId: string): Promise<CustomerRelationship[]> {
    const rows = await db
      .select()
      .from(customerRelationships)
      .where(eq(customerRelationships.tenantId, tenantId))
      .orderBy(desc(customerRelationships.lastSeenAt));
    return rows.map((r) => this.toCustomerRelDomain(r));
  }
}
