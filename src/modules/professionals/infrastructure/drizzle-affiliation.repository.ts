import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  professionalAffiliations,
  professionalAffiliationLocations,
  professionalAffiliationTerms,
  professionalLocationServices,
  ProfessionalAffiliationRow,
  ProfessionalAffiliationLocationRow,
  ProfessionalAffiliationTermRow,
  ProfessionalLocationServiceRow,
} from "@/infrastructure/database/schema/professionals";
import {
  ProfessionalAffiliation,
  AffiliationLocationScope,
  AffiliationTerms,
  ProfessionalLocationService,
  AffiliationStatus,
} from "../domain/professional-affiliation";
import {
  AffiliationRepository,
  CreateAffiliationInput,
} from "../domain/affiliation-repository.interface";
import { NotFoundError } from "@/shared/errors/app-error";

export class DrizzleAffiliationRepository implements AffiliationRepository {
  private toAffiliationDomain(row: ProfessionalAffiliationRow): ProfessionalAffiliation {
    return new ProfessionalAffiliation({
      id: row.id,
      professionalWorkspaceTenantId: row.professionalWorkspaceTenantId,
      professionalProfileId: row.professionalProfileId,
      hostTenantId: row.hostTenantId,
      relationshipType: row.relationshipType as any,
      status: row.status as any,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      requestedByUserId: row.requestedByUserId,
      approvedByUserId: row.approvedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toLocationScopeDomain(row: ProfessionalAffiliationLocationRow): AffiliationLocationScope {
    return {
      id: row.id,
      affiliationId: row.affiliationId,
      locationId: row.locationId,
      status: row.status as any,
    };
  }

  private toTermsDomain(row: ProfessionalAffiliationTermRow): AffiliationTerms {
    return {
      id: row.id,
      affiliationId: row.affiliationId,
      settlementModel: row.settlementModel,
      commissionBasisPoints: row.commissionBasisPoints,
      fixedRentAmountMinor: row.fixedRentAmountMinor,
      currency: row.currency,
      settlementFrequency: row.settlementFrequency,
      effectiveFrom: row.effectiveFrom,
      effectiveUntil: row.effectiveUntil,
    };
  }

  private toLocationServiceDomain(row: ProfessionalLocationServiceRow): ProfessionalLocationService {
    return {
      id: row.id,
      affiliationId: row.affiliationId,
      locationId: row.locationId,
      serviceId: row.serviceId,
      priceOverrideMinor: row.priceOverrideMinor,
      durationOverrideMinutes: row.durationOverrideMinutes,
      isActive: row.isActive,
    };
  }

  async findById(id: string): Promise<ProfessionalAffiliation | null> {
    const rows = await db
      .select()
      .from(professionalAffiliations)
      .where(eq(professionalAffiliations.id, id))
      .limit(1);
    if (!rows[0]) return null;
    return this.toAffiliationDomain(rows[0]);
  }

  async findActiveAffiliation(
    profWorkspaceTenantId: string,
    hostTenantId: string
  ): Promise<ProfessionalAffiliation | null> {
    const rows = await db
      .select()
      .from(professionalAffiliations)
      .where(
        and(
          eq(professionalAffiliations.professionalWorkspaceTenantId, profWorkspaceTenantId),
          eq(professionalAffiliations.hostTenantId, hostTenantId),
          eq(professionalAffiliations.status, "ACTIVE")
        )
      )
      .limit(1);
    if (!rows[0]) return null;
    return this.toAffiliationDomain(rows[0]);
  }

  async listByProfessional(professionalProfileId: string): Promise<ProfessionalAffiliation[]> {
    const rows = await db
      .select()
      .from(professionalAffiliations)
      .where(eq(professionalAffiliations.professionalProfileId, professionalProfileId));
    return rows.map((r) => this.toAffiliationDomain(r));
  }

  async listByHostTenant(hostTenantId: string): Promise<ProfessionalAffiliation[]> {
    const rows = await db
      .select()
      .from(professionalAffiliations)
      .where(eq(professionalAffiliations.hostTenantId, hostTenantId));
    return rows.map((r) => this.toAffiliationDomain(r));
  }

  async create(input: CreateAffiliationInput): Promise<ProfessionalAffiliation> {
    const [row] = await db
      .insert(professionalAffiliations)
      .values({
        professionalWorkspaceTenantId: input.professionalWorkspaceTenantId,
        professionalProfileId: input.professionalProfileId,
        hostTenantId: input.hostTenantId,
        relationshipType: input.relationshipType ?? "CHAIR_RENTAL",
        status: input.status ?? "REQUESTED",
        requestedByUserId: input.requestedByUserId,
        approvedByUserId: input.approvedByUserId,
      })
      .returning();

    if (input.locationIds && input.locationIds.length > 0) {
      for (const locId of input.locationIds) {
        await db
          .insert(professionalAffiliationLocations)
          .values({
            affiliationId: row.id,
            locationId: locId,
            status: "ACTIVE",
          })
          .onConflictDoNothing();
      }
    }

    return this.toAffiliationDomain(row);
  }

  async updateStatus(
    id: string,
    status: AffiliationStatus,
    approvedByUserId?: string
  ): Promise<ProfessionalAffiliation> {
    const updates: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };
    if (approvedByUserId) {
      updates.approvedByUserId = approvedByUserId;
    }
    if (status === "ENDED") {
      updates.endsAt = new Date();
    }

    const [row] = await db
      .update(professionalAffiliations)
      .set(updates)
      .where(eq(professionalAffiliations.id, id))
      .returning();

    if (!row) throw new NotFoundError("Affiliation not found");
    return this.toAffiliationDomain(row);
  }

  async addLocationScope(affiliationId: string, locationId: string): Promise<void> {
    await db
      .insert(professionalAffiliationLocations)
      .values({
        affiliationId,
        locationId,
        status: "ACTIVE",
      })
      .onConflictDoUpdate({
        target: [
          professionalAffiliationLocations.affiliationId,
          professionalAffiliationLocations.locationId,
        ],
        set: { status: "ACTIVE" },
      });
  }

  async listLocationScopes(affiliationId: string): Promise<AffiliationLocationScope[]> {
    const rows = await db
      .select()
      .from(professionalAffiliationLocations)
      .where(
        and(
          eq(professionalAffiliationLocations.affiliationId, affiliationId),
          eq(professionalAffiliationLocations.status, "ACTIVE")
        )
      );
    return rows.map((r) => this.toLocationScopeDomain(r));
  }

  async isLocationAuthorized(affiliationId: string, locationId: string): Promise<boolean> {
    const rows = await db
      .select()
      .from(professionalAffiliationLocations)
      .where(
        and(
          eq(professionalAffiliationLocations.affiliationId, affiliationId),
          eq(professionalAffiliationLocations.locationId, locationId),
          eq(professionalAffiliationLocations.status, "ACTIVE")
        )
      )
      .limit(1);
    return !!rows[0];
  }

  async setTerms(
    affiliationId: string,
    terms: Omit<AffiliationTerms, "id" | "affiliationId">
  ): Promise<void> {
    await db
      .insert(professionalAffiliationTerms)
      .values({
        affiliationId,
        settlementModel: terms.settlementModel,
        commissionBasisPoints: terms.commissionBasisPoints,
        fixedRentAmountMinor: terms.fixedRentAmountMinor,
        currency: terms.currency,
        settlementFrequency: terms.settlementFrequency,
        effectiveFrom: terms.effectiveFrom,
        effectiveUntil: terms.effectiveUntil,
      })
      .onConflictDoUpdate({
        target: [professionalAffiliationTerms.affiliationId],
        set: {
          settlementModel: terms.settlementModel,
          commissionBasisPoints: terms.commissionBasisPoints,
          fixedRentAmountMinor: terms.fixedRentAmountMinor,
          currency: terms.currency,
          settlementFrequency: terms.settlementFrequency,
          effectiveFrom: terms.effectiveFrom,
          effectiveUntil: terms.effectiveUntil,
          updatedAt: new Date(),
        },
      });
  }

  async getTerms(affiliationId: string): Promise<AffiliationTerms | null> {
    const rows = await db
      .select()
      .from(professionalAffiliationTerms)
      .where(eq(professionalAffiliationTerms.affiliationId, affiliationId))
      .limit(1);
    if (!rows[0]) return null;
    return this.toTermsDomain(rows[0]);
  }

  async assignLocationService(service: Omit<ProfessionalLocationService, "id">): Promise<void> {
    await db
      .insert(professionalLocationServices)
      .values({
        affiliationId: service.affiliationId,
        locationId: service.locationId,
        serviceId: service.serviceId,
        priceOverrideMinor: service.priceOverrideMinor,
        durationOverrideMinutes: service.durationOverrideMinutes,
        isActive: service.isActive,
      })
      .onConflictDoUpdate({
        target: [
          professionalLocationServices.affiliationId,
          professionalLocationServices.locationId,
          professionalLocationServices.serviceId,
        ],
        set: {
          priceOverrideMinor: service.priceOverrideMinor,
          durationOverrideMinutes: service.durationOverrideMinutes,
          isActive: service.isActive,
          updatedAt: new Date(),
        },
      });
  }

  async listLocationServices(affiliationId: string): Promise<ProfessionalLocationService[]> {
    const rows = await db
      .select()
      .from(professionalLocationServices)
      .where(
        and(
          eq(professionalLocationServices.affiliationId, affiliationId),
          eq(professionalLocationServices.isActive, true)
        )
      );
    return rows.map((r) => this.toLocationServiceDomain(r));
  }
}
