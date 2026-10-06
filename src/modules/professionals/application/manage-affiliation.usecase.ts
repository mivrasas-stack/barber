import { AffiliationRepository } from "../domain/affiliation-repository.interface";
import { ProfessionalRepository } from "../domain/professional-repository.interface";
import { DrizzleTenantRepository } from "@/modules/tenancy/infrastructure/drizzle-tenant.repository";
import { db } from "@/infrastructure/database/client";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { roles, membershipRoles } from "@/infrastructure/database/schema/roles";
import { membershipLocationScopes } from "@/infrastructure/database/schema/professionals";
import { outboxEvents } from "@/infrastructure/database/schema/outbox";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { NotFoundError, ValidationError, ForbiddenError } from "@/shared/errors/app-error";
import { eq, and } from "drizzle-orm";

export class ManageAffiliationUseCase {
  constructor(
    private readonly affiliationRepo: AffiliationRepository,
    private readonly professionalRepo: ProfessionalRepository
  ) {}

  async requestAffiliation(input: {
    professionalWorkspaceTenantId: string;
    hostTenantId: string;
    relationshipType?: any;
    locationIds?: string[];
    requestedByUserId?: string;
  }) {
    const workspace = await this.professionalRepo.findWorkspaceByTenantId(
      input.professionalWorkspaceTenantId
    );
    if (!workspace) {
      throw new NotFoundError("Professional workspace not found");
    }

    const tenantRepo = new DrizzleTenantRepository();
    const hostTenant = await tenantRepo.findById(input.hostTenantId);
    if (!hostTenant) {
      throw new NotFoundError("Host barbershop tenant not found");
    }

    const affiliation = await this.affiliationRepo.create({
      professionalWorkspaceTenantId: input.professionalWorkspaceTenantId,
      professionalProfileId: workspace.professionalProfileId,
      hostTenantId: input.hostTenantId,
      relationshipType: input.relationshipType ?? "CHAIR_RENTAL",
      status: "REQUESTED",
      requestedByUserId: input.requestedByUserId,
      locationIds: input.locationIds,
    });

    await db.insert(outboxEvents).values({
      eventType: "professional.affiliation.requested.v1",
      tenantId: input.hostTenantId,
      aggregateId: affiliation.id,
      payload: {
        affiliationId: affiliation.id,
        professionalWorkspaceTenantId: input.professionalWorkspaceTenantId,
        hostTenantId: input.hostTenantId,
      },
      status: "PENDING",
    });

    return affiliation;
  }

  async approveAffiliation(input: {
    affiliationId: string;
    approvedByUserId: string;
    locationIds?: string[];
  }) {
    const affiliation = await this.affiliationRepo.findById(input.affiliationId);
    if (!affiliation) throw new NotFoundError("Affiliation not found");

    affiliation.assertCanTransitionTo("ACTIVE");

    const updated = await this.affiliationRepo.updateStatus(
      input.affiliationId,
      "ACTIVE",
      input.approvedByUserId
    );

    if (input.locationIds && input.locationIds.length > 0) {
      for (const locId of input.locationIds) {
        await this.affiliationRepo.addLocationScope(affiliation.id, locId);
      }
    }

    // Grant limited host membership if needed
    const profile = await this.professionalRepo.findById(affiliation.professionalProfileId);
    if (profile) {
      // Find or create host membership
      let [hostMembership] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.tenantId, affiliation.hostTenantId),
            eq(memberships.userId, profile.userId)
          )
        )
        .limit(1);

      if (!hostMembership) {
        const [created] = await db
          .insert(memberships)
          .values({
            tenantId: affiliation.hostTenantId,
            userId: profile.userId,
            status: "ACTIVE",
          })
          .returning();
        hostMembership = created;
      }

      // Add location scopes
      const locScopes = await this.affiliationRepo.listLocationScopes(affiliation.id);
      for (const scope of locScopes) {
        await db
          .insert(membershipLocationScopes)
          .values({
            membershipId: hostMembership.id,
            locationId: scope.locationId,
          })
          .onConflictDoNothing();
      }
    }

    await db.insert(outboxEvents).values({
      eventType: "professional.affiliation.activated.v1",
      tenantId: affiliation.hostTenantId,
      aggregateId: affiliation.id,
      payload: {
        affiliationId: affiliation.id,
        status: "ACTIVE",
      },
      status: "PENDING",
    });

    return updated;
  }

  async suspendAffiliation(input: { affiliationId: string; actorUserId?: string }) {
    const affiliation = await this.affiliationRepo.findById(input.affiliationId);
    if (!affiliation) throw new NotFoundError("Affiliation not found");

    affiliation.assertCanTransitionTo("SUSPENDED");

    const updated = await this.affiliationRepo.updateStatus(input.affiliationId, "SUSPENDED");

    await db.insert(outboxEvents).values({
      eventType: "professional.affiliation.suspended.v1",
      tenantId: affiliation.hostTenantId,
      aggregateId: affiliation.id,
      payload: {
        affiliationId: affiliation.id,
        status: "SUSPENDED",
      },
      status: "PENDING",
    });

    return updated;
  }

  async endAffiliation(input: { affiliationId: string; actorUserId?: string }) {
    const affiliation = await this.affiliationRepo.findById(input.affiliationId);
    if (!affiliation) throw new NotFoundError("Affiliation not found");

    affiliation.assertCanTransitionTo("ENDED");

    const updated = await this.affiliationRepo.updateStatus(input.affiliationId, "ENDED");

    await db.insert(outboxEvents).values({
      eventType: "professional.affiliation.ended.v1",
      tenantId: affiliation.hostTenantId,
      aggregateId: affiliation.id,
      payload: {
        affiliationId: affiliation.id,
        status: "ENDED",
      },
      status: "PENDING",
    });

    return updated;
  }
}
