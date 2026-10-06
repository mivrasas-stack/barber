import { AffiliationRepository } from "../domain/affiliation-repository.interface";
import { ProfessionalRepository } from "../domain/professional-repository.interface";
import { DrizzleTenantRepository } from "@/modules/tenancy/infrastructure/drizzle-tenant.repository";
import { db } from "@/infrastructure/database/client";
import { users } from "@/infrastructure/database/schema/users";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { roles, membershipRoles } from "@/infrastructure/database/schema/roles";
import {
  professionalAffiliations,
  membershipLocationScopes,
} from "@/infrastructure/database/schema/professionals";
import { appointments } from "@/infrastructure/database/schema/appointments";
import { locations } from "@/infrastructure/database/schema/locations";
import { outboxEvents } from "@/infrastructure/database/schema/outbox";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from "@/shared/errors/app-error";
import { eq, and, inArray, isNull, gt } from "drizzle-orm";

export class ManageAffiliationUseCase {
  constructor(
    private readonly affiliationRepo: AffiliationRepository,
    private readonly professionalRepo: ProfessionalRepository
  ) {}

  private async assertHostAuthorized(actorUserId: string, hostTenantId: string): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, actorUserId)).limit(1);
    if (user?.isPlatformAdmin) return;

    const userMembership = await db
      .select({
        membership: memberships,
        role: roles,
      })
      .from(memberships)
      .innerJoin(membershipRoles, eq(memberships.id, membershipRoles.membershipId))
      .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
      .where(
        and(
          eq(memberships.tenantId, hostTenantId),
          eq(memberships.userId, actorUserId),
          eq(memberships.status, "ACTIVE")
        )
      );

    const isAuthorized = userMembership.some(
      (m) => m.role.name === "OWNER" || m.role.name === "MANAGER"
    );

    if (!isAuthorized) {
      throw new ForbiddenError(
        "HOST_AUTHORIZATION_REQUIRED: Only host shop OWNER or MANAGER can manage affiliations"
      );
    }
  }

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

    // Check for existing pending or active affiliation
    const existingActive = await db
      .select()
      .from(professionalAffiliations)
      .where(
        and(
          eq(
            professionalAffiliations.professionalWorkspaceTenantId,
            input.professionalWorkspaceTenantId
          ),
          eq(professionalAffiliations.hostTenantId, input.hostTenantId),
          inArray(professionalAffiliations.status, ["REQUESTED", "INVITED", "ACTIVE"])
        )
      )
      .limit(1);

    if (existingActive.length > 0) {
      throw new ConflictError(
        "An active or pending affiliation already exists between this workspace and the host barbershop"
      );
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

    // Strictly enforce host authorization (OWNER or MANAGER of host barbershop)
    await this.assertHostAuthorized(input.approvedByUserId, affiliation.hostTenantId);

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

    // Grant limited host membership and bind AFFILIATED_PROFESSIONAL role
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
      } else if (hostMembership.status !== "ACTIVE") {
        const [reিয়েctivated] = await db
          .update(memberships)
          .set({ status: "ACTIVE", updatedAt: new Date() })
          .where(eq(memberships.id, hostMembership.id))
          .returning();
        hostMembership = reিয়েctivated;
      }

      // Assign template role AFFILIATED_PROFESSIONAL to host membership
      const [affiliatedRole] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.name, "AFFILIATED_PROFESSIONAL"), isNull(roles.tenantId)))
        .limit(1);

      if (affiliatedRole) {
        await db
          .insert(membershipRoles)
          .values({
            membershipId: hostMembership.id,
            roleId: affiliatedRole.id,
          })
          .onConflictDoNothing();
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

    if (input.actorUserId) {
      await this.assertHostAuthorized(input.actorUserId, affiliation.hostTenantId);
    }

    affiliation.assertCanTransitionTo("SUSPENDED");

    const updated = await this.affiliationRepo.updateStatus(input.affiliationId, "SUSPENDED");

    // Deactivate host membership
    const profile = await this.professionalRepo.findById(affiliation.professionalProfileId);
    if (profile) {
      await db
        .update(memberships)
        .set({ status: "SUSPENDED", updatedAt: new Date() })
        .where(
          and(
            eq(memberships.tenantId, affiliation.hostTenantId),
            eq(memberships.userId, profile.userId)
          )
        );
    }

    // Policy: Future confirmed appointments preservation and audit
    const now = new Date();
    const futureAppts = await db
      .select({ id: appointments.id, startsAt: appointments.startsAt })
      .from(appointments)
      .innerJoin(locations, eq(appointments.locationId, locations.id))
      .where(
        and(
          eq(appointments.tenantId, affiliation.professionalWorkspaceTenantId),
          eq(locations.tenantId, affiliation.hostTenantId),
          gt(appointments.startsAt, now),
          inArray(appointments.status, ["CONFIRMED", "PENDING"])
        )
      );

    await db.insert(auditLogs).values({
      tenantId: affiliation.hostTenantId,
      actorUserId: input.actorUserId ?? null,
      action: "AFFILIATION_SUSPENDED",
      entityType: "AFFILIATION",
      entityId: affiliation.id,
      metadata: {
        affiliationId: affiliation.id,
        futureAppointmentsAffectedCount: futureAppts.length,
        affectedAppointmentIds: futureAppts.map((a) => a.id),
      },
    });

    await db.insert(outboxEvents).values({
      eventType: "professional.affiliation.suspended.v1",
      tenantId: affiliation.hostTenantId,
      aggregateId: affiliation.id,
      payload: {
        affiliationId: affiliation.id,
        status: "SUSPENDED",
        affectedAppointmentIds: futureAppts.map((a) => a.id),
      },
      status: "PENDING",
    });

    return updated;
  }

  async endAffiliation(input: { affiliationId: string; actorUserId?: string }) {
    const affiliation = await this.affiliationRepo.findById(input.affiliationId);
    if (!affiliation) throw new NotFoundError("Affiliation not found");

    if (input.actorUserId) {
      const [actor] = await db.select().from(users).where(eq(users.id, input.actorUserId)).limit(1);
      const isPlatformAdmin = actor?.isPlatformAdmin ?? false;

      const profile = await this.professionalRepo.findById(affiliation.professionalProfileId);
      const isProfessionalOwner = profile?.userId === input.actorUserId;

      // Allow either host OWNER/MANAGER, or the professional owner himself, or Platform Admin
      if (!isPlatformAdmin && !isProfessionalOwner) {
        await this.assertHostAuthorized(input.actorUserId, affiliation.hostTenantId);
      }
    }

    affiliation.assertCanTransitionTo("ENDED");

    const updated = await this.affiliationRepo.updateStatus(input.affiliationId, "ENDED");

    // Deactivate host membership
    const profile = await this.professionalRepo.findById(affiliation.professionalProfileId);
    if (profile) {
      await db
        .update(memberships)
        .set({ status: "TERMINATED", updatedAt: new Date() })
        .where(
          and(
            eq(memberships.tenantId, affiliation.hostTenantId),
            eq(memberships.userId, profile.userId)
          )
        );
    }

    // Policy: Future confirmed appointments preservation and audit
    const now = new Date();
    const futureAppts = await db
      .select({ id: appointments.id, startsAt: appointments.startsAt })
      .from(appointments)
      .innerJoin(locations, eq(appointments.locationId, locations.id))
      .where(
        and(
          eq(appointments.tenantId, affiliation.professionalWorkspaceTenantId),
          eq(locations.tenantId, affiliation.hostTenantId),
          gt(appointments.startsAt, now),
          inArray(appointments.status, ["CONFIRMED", "PENDING"])
        )
      );

    await db.insert(auditLogs).values({
      tenantId: affiliation.hostTenantId,
      actorUserId: input.actorUserId ?? null,
      action: "AFFILIATION_ENDED",
      entityType: "AFFILIATION",
      entityId: affiliation.id,
      metadata: {
        affiliationId: affiliation.id,
        futureAppointmentsAffectedCount: futureAppts.length,
        affectedAppointmentIds: futureAppts.map((a) => a.id),
      },
    });

    await db.insert(outboxEvents).values({
      eventType: "professional.affiliation.ended.v1",
      tenantId: affiliation.hostTenantId,
      aggregateId: affiliation.id,
      payload: {
        affiliationId: affiliation.id,
        status: "ENDED",
        affectedAppointmentIds: futureAppts.map((a) => a.id),
      },
      status: "PENDING",
    });

    return updated;
  }
}
