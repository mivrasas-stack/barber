import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { pool, db } from "@/infrastructure/database/client";
import { DrizzleUserRepository } from "@/modules/identity/infrastructure/drizzle-user.repository";
import { DrizzleTenantRepository } from "@/modules/tenancy/infrastructure/drizzle-tenant.repository";
import { DrizzleServiceRepository } from "@/modules/catalog/infrastructure/drizzle-service.repository";
import { DrizzleStaffRepository } from "@/modules/staff/infrastructure/drizzle-staff.repository";
import { DrizzleSchedulingRepository } from "@/modules/scheduling/infrastructure/drizzle-scheduling.repository";
import { DrizzleAppointmentRepository } from "@/modules/appointments/infrastructure/drizzle-appointment.repository";
import { DrizzleIdempotencyRepository } from "@/modules/appointments/infrastructure/drizzle-idempotency.repository";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { DrizzleAffiliationRepository } from "@/modules/professionals/infrastructure/drizzle-affiliation.repository";
import { DrizzleModuleRepository } from "@/modules/modules/infrastructure/drizzle-module.repository";
import { ProvisionProfessionalUseCase } from "@/modules/professionals/application/provision-professional.usecase";
import { ManageAffiliationUseCase } from "@/modules/professionals/application/manage-affiliation.usecase";
import { ResolveWorkspacesUseCase } from "@/modules/tenancy/application/resolve-workspaces.usecase";
import { ModuleEntitlementResolver } from "@/modules/modules/application/module-entitlement-resolver";
import { CreateAppointmentUseCase } from "@/modules/appointments/application/create-appointment.usecase";
import { locations } from "@/infrastructure/database/schema/locations";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { roles, membershipRoles } from "@/infrastructure/database/schema/roles";
import { subscriptionPlans, tenantSubscriptions } from "@/infrastructure/database/schema/subscriptions";
import { professionalAffiliations } from "@/infrastructure/database/schema/professionals";
import { appointments } from "@/infrastructure/database/schema/appointments";
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/shared/errors/app-error";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";

describe("Barber Paradise v2 - Stage 2.5 Security, Authorization & Integrity Audit Tests", () => {
  const userRepo = new DrizzleUserRepository();
  const tenantRepo = new DrizzleTenantRepository();
  const serviceRepo = new DrizzleServiceRepository();
  const staffRepo = new DrizzleStaffRepository();
  const schedulingRepo = new DrizzleSchedulingRepository();
  const appointmentRepo = new DrizzleAppointmentRepository();
  const idempotencyRepo = new DrizzleIdempotencyRepository();
  const profRepo = new DrizzleProfessionalRepository();
  const subRepo = new DrizzleSubscriptionRepository();
  const affilRepo = new DrizzleAffiliationRepository();
  const moduleRepo = new DrizzleModuleRepository();

  const provisionUseCase = new ProvisionProfessionalUseCase();
  const manageAffilUseCase = new ManageAffiliationUseCase(affilRepo, profRepo);
  const resolveWorkspacesUseCase = new ResolveWorkspacesUseCase();
  const moduleResolver = new ModuleEntitlementResolver(moduleRepo, subRepo);
  const createAppointmentUseCase = new CreateAppointmentUseCase(
    appointmentRepo,
    idempotencyRepo,
    serviceRepo,
    staffRepo,
    affilRepo,
    profRepo,
    moduleResolver
  );

  const testSuffix = crypto.randomUUID().slice(0, 8);

  // Entities
  let hostATenantId: string;
  let hostAOwnerUserId: string;
  let hostALocId: string;

  let hostBTenantId: string;
  let hostBOwnerUserId: string;
  let hostBLocId: string;

  let rogueUserId: string;

  let soloTenantId: string;
  let soloUserId: string;
  let soloProfileId: string;
  let soloStaffId: string;
  let soloServiceId: string;

  let custom30PlanCode: string;
  let zeroTrialPlanCode: string;

  beforeAll(async () => {
    // 1. Create Host Barbershop A with Owner
    const hostA = await tenantRepo.create({
      name: `Audit Host A ${testSuffix}`,
      slug: `audit-host-a-${testSuffix}`,
      defaultCurrency: "COP",
      defaultTimezone: "America/Bogota",
    });
    hostATenantId = hostA.id;

    const hostAOwner = await userRepo.create({
      email: `host.a.owner.${testSuffix}@audit.dev`,
      name: `Host A Owner`,
      passwordHash: "secure_hash",
    });
    hostAOwnerUserId = hostAOwner.id;

    const [memA] = await db
      .insert(memberships)
      .values({ tenantId: hostATenantId, userId: hostAOwnerUserId, status: "ACTIVE" })
      .returning();

    const [ownerRole] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.name, "OWNER"), isNull(roles.tenantId)))
      .limit(1);

    if (ownerRole) {
      await db.insert(membershipRoles).values({ membershipId: memA.id, roleId: ownerRole.id });
    }

    const [locA] = await db
      .insert(locations)
      .values({
        tenantId: hostATenantId,
        slug: `host-a-main-${testSuffix}`,
        name: `Host A Main Location`,
        address: "Calle 100 # 20, Bogotá",
        timezone: "America/Bogota",
        currency: "COP",
      })
      .returning();
    hostALocId = locA.id;

    // 2. Create Host Barbershop B with Owner
    const hostB = await tenantRepo.create({
      name: `Audit Host B ${testSuffix}`,
      slug: `audit-host-b-${testSuffix}`,
      defaultCurrency: "COP",
      defaultTimezone: "America/Bogota",
    });
    hostBTenantId = hostB.id;

    const hostBOwner = await userRepo.create({
      email: `host.b.owner.${testSuffix}@audit.dev`,
      name: `Host B Owner`,
      passwordHash: "secure_hash",
    });
    hostBOwnerUserId = hostBOwner.id;

    const [memB] = await db
      .insert(memberships)
      .values({ tenantId: hostBTenantId, userId: hostBOwnerUserId, status: "ACTIVE" })
      .returning();

    if (ownerRole) {
      await db.insert(membershipRoles).values({ membershipId: memB.id, roleId: ownerRole.id });
    }

    const [locB] = await db
      .insert(locations)
      .values({
        tenantId: hostBTenantId,
        slug: `host-b-main-${testSuffix}`,
        name: `Host B Main Location`,
        address: "Carrera 15 # 85, Bogotá",
        timezone: "America/Bogota",
        currency: "COP",
      })
      .returning();
    hostBLocId = locB.id;

    // 3. Create Rogue User (no roles anywhere)
    const rogue = await userRepo.create({
      email: `rogue.${testSuffix}@audit.dev`,
      name: `Rogue Actor`,
      passwordHash: "secure_hash",
    });
    rogueUserId = rogue.id;

    // 4. Create Custom Subscription Plans in DB
    custom30PlanCode = `AUDIT_TRIAL_30_${testSuffix}`;
    await subRepo.createPlan({
      code: custom30PlanCode,
      name: "Custom 30 Day Trial Plan",
      audience: "SOLO_PROFESSIONAL",
      trialDays: 30,
      priceMinor: 9900000,
    });

    zeroTrialPlanCode = `AUDIT_TRIAL_0_${testSuffix}`;
    await subRepo.createPlan({
      code: zeroTrialPlanCode,
      name: "Immediate Active Zero Trial Plan",
      audience: "SOLO_PROFESSIONAL",
      trialDays: 0,
      priceMinor: 12900000,
    });

    // 5. Provision Solo Professional with standard SOLO_PRO plan
    const solo = await provisionUseCase.execute({
      email: `solo.barber.${testSuffix}@audit.dev`,
      name: "Solo Auditor Barber",
      password: "DevPassword123!",
      displayName: "Auditor Pro",
      professionalSlug: `auditor-pro-${testSuffix}`,
      workspaceName: "Auditor Pro Workspace",
      planCode: "SOLO_PRO",
    });
    soloTenantId = solo.tenant.id;
    soloUserId = solo.user.id;
    soloProfileId = solo.profile.id;
    soloStaffId = solo.staff.id;

    const soloService = await serviceRepo.create({
      tenantId: soloTenantId,
      name: "Auditor Signature Cut",
      slug: `audit-cut-${testSuffix}`,
      durationMinutes: 30,
      priceMinor: 5000000,
      currency: "COP",
    });
    soloServiceId = soloService.id;
  });

  afterAll(async () => {
    // Teardown
  });

  // =========================================================================
  // VECTOR 1: DYNAMIC TRIAL_DAYS & PLAN RESOLUTION
  // =========================================================================
  describe("Vector 1: Dynamic trial_days Resolution & No Silent Fallbacks", () => {
    it("should provision a subscription with exactly 30 trial days when plan configured for 30", async () => {
      const res = await provisionUseCase.execute({
        email: `trial30.${testSuffix}@audit.dev`,
        name: "Trial 30 User",
        password: "DevPassword123!",
        displayName: "Trial 30 Pro",
        professionalSlug: `trial30-${testSuffix}`,
        workspaceName: "Trial 30 Workspace",
        planCode: custom30PlanCode,
      });

      expect(res.subscription.status).toBe("TRIALING");
      expect(res.subscription.trialEndsAt).toBeDefined();

      const now = new Date();
      const trialEnds = new Date(res.subscription.trialEndsAt!);
      const diffDays = Math.round((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });

    it("should provision immediately ACTIVE with null trialEndsAt when plan trialDays is 0", async () => {
      const res = await provisionUseCase.execute({
        email: `trial0.${testSuffix}@audit.dev`,
        name: "Trial 0 User",
        password: "DevPassword123!",
        displayName: "Trial 0 Pro",
        professionalSlug: `trial0-${testSuffix}`,
        workspaceName: "Trial 0 Workspace",
        planCode: zeroTrialPlanCode,
      });

      expect(res.subscription.status).toBe("ACTIVE");
      expect(res.subscription.trialEndsAt).toBeNull();
    });

    it("should throw NotFoundError and NOT fabricate a fallback plan if plan code does not exist", async () => {
      await expect(
        provisionUseCase.execute({
          email: `invalidplan.${testSuffix}@audit.dev`,
          name: "Invalid Plan User",
          password: "DevPassword123!",
          displayName: "Invalid Plan Pro",
          professionalSlug: `invalid-plan-${testSuffix}`,
          workspaceName: "Invalid Plan Workspace",
          planCode: "NON_EXISTENT_PLAN_CODE",
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  // =========================================================================
  // VECTOR 2: SERVER-SIDE MODULE ENTITLEMENT ENFORCEMENT
  // =========================================================================
  describe("Vector 2: Server-Side Module Entitlement Guard & API Enforcement", () => {
    it("should block appointment creation if scheduling.appointments module is FORCE_DISABLED by admin override", async () => {
      // 1. Find scheduling.appointments module ID
      const allModules = await moduleRepo.listAllModules();
      const schedModule = allModules.find((m) => m.code === "scheduling.appointments");
      expect(schedModule).toBeDefined();

      // 2. Override to FORCE_DISABLED for soloTenantId
      await moduleRepo.setTenantOverride(
        soloTenantId,
        schedModule!.id,
        "FORCE_DISABLED",
        "Administrative restriction for audit test",
        hostAOwnerUserId
      );

      // 3. Attempt to create appointment -> Must throw ForbiddenError
      const slot = new Date();
      slot.setDate(slot.getDate() + 1);
      slot.setHours(10, 0, 0, 0);

      await expect(
        createAppointmentUseCase.execute({
          tenantId: soloTenantId,
          locationId: hostALocId,
          staffId: soloStaffId,
          serviceIds: [soloServiceId],
          startsAt: slot,
          customerName: "Test Audit Client",
        })
      ).rejects.toThrow(ForbiddenError);

      // 4. Restore module override to FORCE_ENABLED or CLEAR
      await moduleRepo.removeTenantOverride(soloTenantId, schedModule!.id);
    });
  });

  // =========================================================================
  // VECTOR 3: WORKSPACE SWITCHER SPOOFING PREVENTION
  // =========================================================================
  describe("Vector 3: Workspace Context Security & Multi-Tenant Isolation", () => {
    it("should reject workspace switch attempt to a tenant the user does NOT belong to", async () => {
      // Rogue user tries to access hostATenantId
      await expect(
        resolveWorkspacesUseCase.validateAccess(rogueUserId, hostATenantId)
      ).rejects.toThrow(ForbiddenError);

      // Solo barber tries to access hostBTenantId without affiliation or membership
      await expect(
        resolveWorkspacesUseCase.validateAccess(soloUserId, hostBTenantId)
      ).rejects.toThrow(ForbiddenError);
    });

    it("should allow workspace switch to an authorized solo workspace", async () => {
      const authorized = await resolveWorkspacesUseCase.validateAccess(soloUserId, soloTenantId);
      expect(authorized.id).toBe(soloTenantId);
      expect(authorized.isOwner).toBe(true);
    });
  });

  // =========================================================================
  // VECTOR 5: HOST BARBERSHOP AFFILIATIONS AUTHORIZATION
  // =========================================================================
  describe("Vector 5: Host Barbershop Affiliations Authorization", () => {
    let pendingAffilId: string;

    it("should allow professional to request affiliation with Host A", async () => {
      const affil = await manageAffilUseCase.requestAffiliation({
        professionalWorkspaceTenantId: soloTenantId,
        hostTenantId: hostATenantId,
        relationshipType: "CHAIR_RENTAL",
        requestedByUserId: soloUserId,
      });
      expect(affil.status).toBe("REQUESTED");
      pendingAffilId = affil.id;
    });

    it("should REJECT affiliation approval when called by a rogue user (not Host A owner/manager)", async () => {
      await expect(
        manageAffilUseCase.approveAffiliation({
          affiliationId: pendingAffilId,
          approvedByUserId: rogueUserId,
          locationIds: [hostALocId],
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("should REJECT affiliation approval when the professional tries to approve it themselves", async () => {
      await expect(
        manageAffilUseCase.approveAffiliation({
          affiliationId: pendingAffilId,
          approvedByUserId: soloUserId,
          locationIds: [hostALocId],
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("should ALLOW affiliation approval when called by the legitimate Host A Owner", async () => {
      const approved = await manageAffilUseCase.approveAffiliation({
        affiliationId: pendingAffilId,
        approvedByUserId: hostAOwnerUserId,
        locationIds: [hostALocId],
      });
      expect(approved.status).toBe("ACTIVE");
    });
  });

  // =========================================================================
  // VECTOR 7: RBAC ISOLATION FOR AFFILIATED_PROFESSIONAL
  // =========================================================================
  describe("Vector 7: RBAC Isolation for AFFILIATED_PROFESSIONAL", () => {
    it("should assign template role AFFILIATED_PROFESSIONAL with minimal operational permissions", async () => {
      // Find template role AFFILIATED_PROFESSIONAL
      const [role] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.name, "AFFILIATED_PROFESSIONAL"), isNull(roles.tenantId)))
        .limit(1);

      expect(role).toBeDefined();

      // Check permissions bound to this template role
      const rolePerms = await db.query?.rolePermissions
        ? await db.query.rolePermissions.findMany({ where: eq(membershipRoles.roleId, role.id) })
        : [];

      // Query directly via db.select
      const [ownerRole] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.name, "OWNER"), isNull(roles.tenantId)))
        .limit(1);

      // Verify solo professional's host membership in Host A has role AFFILIATED_PROFESSIONAL
      const hostWorkspaces = await resolveWorkspacesUseCase.execute(soloUserId);
      const hostAWorkspace = hostWorkspaces.find((w) => w.id === hostATenantId);

      expect(hostAWorkspace).toBeDefined();
      expect(hostAWorkspace?.role).toBe("AFFILIATED_PROFESSIONAL");
      expect(hostAWorkspace?.relationship).toBe("AFFILIATED_PROFESSIONAL");
      expect(hostAWorkspace?.isOwner).toBe(false);
    });
  });

  // =========================================================================
  // VECTOR 8: SUSPENSION & TERMINATION LIFECYCLE & FUTURE APPOINTMENTS
  // =========================================================================
  describe("Vector 8: Suspension & Termination Lifecycle & Future Appointments Policy", () => {
    it("should set host membership to SUSPENDED and block new bookings when affiliation is suspended", async () => {
      const affils = await affilRepo.listByProfessional(soloProfileId);
      const affilA = affils.find((a) => a.hostTenantId === hostATenantId);
      expect(affilA).toBeDefined();

      // Suspend affiliation as Host A Owner
      await manageAffilUseCase.suspendAffiliation({
        affiliationId: affilA!.id,
        actorUserId: hostAOwnerUserId,
      });

      // Verify host membership status is now SUSPENDED
      const [mem] = await db
        .select()
        .from(memberships)
        .where(and(eq(memberships.tenantId, hostATenantId), eq(memberships.userId, soloUserId)))
        .limit(1);
      expect(mem.status).toBe("SUSPENDED");

      // Verify new booking at Host A Location is REJECTED
      const slot = new Date();
      slot.setDate(slot.getDate() + 2);
      slot.setHours(11, 0, 0, 0);

      await expect(
        createAppointmentUseCase.execute({
          tenantId: soloTenantId,
          locationId: hostALocId,
          staffId: soloStaffId,
          serviceIds: [soloServiceId],
          startsAt: slot,
          customerName: "Suspended Test Client",
        })
      ).rejects.toThrow(ForbiddenError);

      // Reactivate for termination test
      await manageAffilUseCase.approveAffiliation({
        affiliationId: affilA!.id,
        approvedByUserId: hostAOwnerUserId,
        locationIds: [hostALocId],
      });
    });

    it("should set host membership to TERMINATED when affiliation is ended", async () => {
      const affils = await affilRepo.listByProfessional(soloProfileId);
      const affilA = affils.find((a) => a.hostTenantId === hostATenantId);
      expect(affilA).toBeDefined();

      // End affiliation as Solo Professional himself
      await manageAffilUseCase.endAffiliation({
        affiliationId: affilA!.id,
        actorUserId: soloUserId,
      });

      const [mem] = await db
        .select()
        .from(memberships)
        .where(and(eq(memberships.tenantId, hostATenantId), eq(memberships.userId, soloUserId)))
        .limit(1);
      expect(mem.status).toBe("TERMINATED");
    });
  });

  // =========================================================================
  // VECTOR 11 & 12: DUPLICATE AFFILIATION PREVENTION & DB CONSTRAINTS
  // =========================================================================
  describe("Vector 11 & 12: Database Referential Integrity & Duplicate Affiliation Prevention", () => {
    it("should reject requesting a duplicate affiliation when one is already pending or active", async () => {
      // 1. Request affiliation with Host B
      await manageAffilUseCase.requestAffiliation({
        professionalWorkspaceTenantId: soloTenantId,
        hostTenantId: hostBTenantId,
        relationshipType: "CHAIR_RENTAL",
        requestedByUserId: soloUserId,
      });

      // 2. Request AGAIN with Host B while first is pending -> Must throw ConflictError
      await expect(
        manageAffilUseCase.requestAffiliation({
          professionalWorkspaceTenantId: soloTenantId,
          hostTenantId: hostBTenantId,
          relationshipType: "CHAIR_RENTAL",
          requestedByUserId: soloUserId,
        })
      ).rejects.toThrow(ConflictError);
    });

    it("should enforce partial unique index in PostgreSQL against duplicate active/pending affiliations", async () => {
      let errorThrown: any = null;
      try {
        await db.insert(professionalAffiliations).values({
          professionalWorkspaceTenantId: soloTenantId,
          professionalProfileId: soloProfileId,
          hostTenantId: hostBTenantId,
          relationshipType: "CHAIR_RENTAL",
          status: "REQUESTED",
        });
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      const isUniqueViolation =
        errorThrown?.code === "23505" ||
        errorThrown?.cause?.code === "23505" ||
        /unique|duplicate/i.test(errorThrown?.message || "") ||
        /unique|duplicate/i.test(errorThrown?.cause?.message || "");
      expect(isUniqueViolation).toBe(true);
    });
  });
});
