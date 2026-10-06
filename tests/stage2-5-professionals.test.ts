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
import { customerRelationships } from "@/infrastructure/database/schema/professionals";
import { appointments } from "@/infrastructure/database/schema/appointments";
import { ConflictError, NotFoundError, ForbiddenError, ValidationError } from "@/shared/errors/app-error";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";

describe("Barber Paradise v2 - Stage 2.5: Independent Professionals, Solo Workspaces & Affiliations Tests", () => {
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
    profRepo
  );

  const testSuffix = crypto.randomUUID().slice(0, 8);

  // Test data variables
  let carlosUserId: string;
  let carlosProfileId: string;
  let carlosSoloTenantId: string;
  let carlosSoloStaffId: string;
  let carlosSoloServiceId: string;

  let hostATenantId: string;
  let hostALoc1Id: string;
  let hostALoc2Id: string;
  let hostAOwnerUserId: string;

  let hostBTenantId: string;
  let hostBLoc1Id: string;
  let hostBOwnerUserId: string;

  let customerUserId: string;

  beforeAll(async () => {
    // 1. Create Host A Barbershop
    const hostA = await tenantRepo.create({
      name: `Host Barbershop A ${testSuffix}`,
      slug: `host-a-${testSuffix}`,
      defaultCurrency: "COP",
      defaultTimezone: "America/Bogota",
    });
    hostATenantId = hostA.id;

    const [locA1] = await db
      .insert(locations)
      .values({
        tenantId: hostATenantId,
        slug: `host-a-loc-1-${testSuffix}`,
        name: `Host A - Sede Norte`,
        address: "Calle 100 # 15-20, Bogotá",
        timezone: "America/Bogota",
        currency: "COP",
      })
      .returning();
    hostALoc1Id = locA1.id;

    const [locA2] = await db
      .insert(locations)
      .values({
        tenantId: hostATenantId,
        slug: `host-a-loc-2-${testSuffix}`,
        name: `Host A - Sede Sur`,
        address: "Calle 30 # 10-15, Bogotá",
        timezone: "America/Bogota",
        currency: "COP",
      })
      .returning();
    hostALoc2Id = locA2.id;

    const hostAOwner = await userRepo.create({
      email: `host.owner.${testSuffix}@barber.dev`,
      name: `Owner Host A`,
      passwordHash: "test_hash",
    });
    hostAOwnerUserId = hostAOwner.id;

    // Grant OWNER role in Host A
    const [membershipA] = await db
      .insert(memberships)
      .values({
        tenantId: hostATenantId,
        userId: hostAOwnerUserId,
        status: "ACTIVE",
      })
      .returning();

    const [ownerRole] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.name, "OWNER"), isNull(roles.tenantId)))
      .limit(1);

    if (ownerRole) {
      await db.insert(membershipRoles).values({
        membershipId: membershipA.id,
        roleId: ownerRole.id,
      });
    }

    // 2. Create Host B Barbershop (for cross-host concurrency test)
    const hostB = await tenantRepo.create({
      name: `Host Barbershop B ${testSuffix}`,
      slug: `host-b-${testSuffix}`,
      defaultCurrency: "COP",
      defaultTimezone: "America/Bogota",
    });
    hostBTenantId = hostB.id;

    const hostBOwner = await userRepo.create({
      email: `host.b.owner.${testSuffix}@barber.dev`,
      name: `Owner Host B`,
      passwordHash: "test_hash",
    });
    hostBOwnerUserId = hostBOwner.id;

    const [membershipB] = await db
      .insert(memberships)
      .values({
        tenantId: hostBTenantId,
        userId: hostBOwnerUserId,
        status: "ACTIVE",
      })
      .returning();

    if (ownerRole) {
      await db.insert(membershipRoles).values({
        membershipId: membershipB.id,
        roleId: ownerRole.id,
      });
    }

    const [locB1] = await db
      .insert(locations)
      .values({
        tenantId: hostBTenantId,
        slug: `host-b-loc-1-${testSuffix}`,
        name: `Host B - Sede Chapinero`,
        address: "Carrera 7 # 60-10, Bogotá",
        timezone: "America/Bogota",
        currency: "COP",
      })
      .returning();
    hostBLoc1Id = locB1.id;

    // 3. Create Customer User
    const customer = await userRepo.create({
      email: `client.${testSuffix}@test.com`,
      name: `Test Client ${testSuffix}`,
      passwordHash: "test_hash",
    });
    customerUserId = customer.id;
  });

  afterAll(async () => {
    // Teardown / cleanup if necessary
  });

  // =========================================================================
  // 1. ATOMIC PROVISIONING & SELF-REGISTRATION
  // =========================================================================
  describe("1. Professional Self-Registration & Atomic Provisioning", () => {
    it("should provision user, profile, solo tenant, owner membership, staff, and subscription in one transaction", async () => {
      const email = `carlos.${testSuffix}@barber.dev`;
      const slug = `carlos-${testSuffix}`;

      const result = await provisionUseCase.execute({
        email,
        name: "Carlos Mendoza",
        password: "SecretPassword123!",
        displayName: "Carlos 'The Barber' Mendoza",
        professionalSlug: slug,
        workspaceName: `Carlos Barber Studio ${testSuffix}`,
        planCode: "SOLO_PRO",
        bio: "Master barber & educator with 8 years experience.",
        yearsExperience: 8,
        instagram: "@carlosbarber",
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.profile).toBeDefined();
      expect(result.profile.professionalSlug).toBe(slug);
      expect(result.tenant).toBeDefined();
      expect(result.tenant.tenantType).toBe("SOLO_PROFESSIONAL");
      expect(result.membership).toBeDefined();
      expect(result.membership.role).toBe("OWNER");
      expect(result.staff).toBeDefined();
      expect(result.staff.displayName).toBe("Carlos 'The Barber' Mendoza");
      expect(result.subscription).toBeDefined();
      expect(["ACTIVE", "TRIALING"]).toContain(result.subscription.status);

      // Verify trial calculation (14 days)
      const trialEnds = new Date(result.subscription.trialEndsAt!);
      const now = new Date();
      const diffDays = Math.round((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(14);

      // Save for subsequent tests
      carlosUserId = result.user.id;
      carlosProfileId = result.profile.id;
      carlosSoloTenantId = result.tenant.id;
      carlosSoloStaffId = result.staff.id;

      // Create a service in Carlos's solo workspace
      const service = await serviceRepo.create({
        tenantId: carlosSoloTenantId,
        name: "Corte de Autor Carlos",
        slug: `corte-autor-${testSuffix}`,
        durationMinutes: 45,
        priceMinor: 4500000,
        currency: "COP",
      });
      carlosSoloServiceId = service.id;
    });

    it("should prevent duplicate registration by email", async () => {
      const email = `carlos.${testSuffix}@barber.dev`;
      await expect(
        provisionUseCase.execute({
          email,
          displayName: "Carlos Duplicate",
          professionalSlug: `carlos-dup-${testSuffix}`,
          password: "password123",
        })
      ).rejects.toThrow(ConflictError);
    });

    it("should prevent duplicate registration by professionalSlug", async () => {
      const slug = `carlos-${testSuffix}`;
      await expect(
        provisionUseCase.execute({
          email: `carlos.other.${testSuffix}@barber.dev`,
          displayName: "Carlos Other",
          professionalSlug: slug,
          password: "password123",
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  // =========================================================================
  // 2. SUBSCRIPTIONS, MODULE ENTITLEMENTS & DEPENDENCY TREE
  // =========================================================================
  describe("2. Module Entitlements, Admin Overrides & Dependency Tree", () => {
    it("should resolve effective modules for SOLO_PRO plan", async () => {
      const effective = await moduleResolver.resolveEffectiveModules(carlosSoloTenantId);
      expect(effective.length).toBeGreaterThan(0);

      // Core dashboard must be enabled
      const dashboard = effective.find((m) => m.module.code === "core.dashboard");
      expect(dashboard).toBeDefined();
      expect(dashboard?.isEnabled).toBe(true);

      // Calendar must be enabled
      const calendar = effective.find((m) => m.module.code === "scheduling.calendar");
      expect(calendar).toBeDefined();
      expect(calendar?.isEnabled).toBe(true);
      expect(calendar?.source).toBe("PLAN");
    });

    it("should allow Platform Admin to override a module with FORCE_DISABLED", async () => {
      const effectiveBefore = await moduleResolver.resolveEffectiveModules(carlosSoloTenantId);
      const targetMod = effectiveBefore.find((m) => m.module.code === "analytics.overview");
      expect(targetMod).toBeDefined();

      // Set admin override
      await moduleRepo.setTenantOverride(
        carlosSoloTenantId,
        targetMod!.module.id,
        "FORCE_DISABLED",
        "Disabled for test",
        carlosUserId
      );

      const effectiveAfter = await moduleResolver.resolveEffectiveModules(carlosSoloTenantId);
      const afterMod = effectiveAfter.find((m) => m.module.code === "analytics.overview");
      expect(afterMod?.isEnabled).toBe(false);
      expect(afterMod?.source).toBe("DISABLED_BY_ADMIN");

      // Clean up override
      await moduleRepo.removeTenantOverride(carlosSoloTenantId, targetMod!.module.id);
      const restored = await moduleResolver.resolveEffectiveModules(carlosSoloTenantId);
      const restoredMod = restored.find((m) => m.module.code === "analytics.overview");
      expect(restoredMod?.isEnabled).toBe(true);
      expect(restoredMod?.source).toBe("PLAN");
    });

    it("should enforce module dependency tree (disabling parent disables dependent with DEPENDENCY_MISSING)", async () => {
      // Find scheduling.calendar and scheduling.appointments
      const effective = await moduleResolver.resolveEffectiveModules(carlosSoloTenantId);
      const calMod = effective.find((m) => m.module.code === "scheduling.calendar");
      const apptMod = effective.find((m) => m.module.code === "scheduling.appointments");

      expect(calMod).toBeDefined();
      expect(apptMod).toBeDefined();

      // Force disable calendar
      await moduleRepo.setTenantOverride(
        carlosSoloTenantId,
        calMod!.module.id,
        "FORCE_DISABLED",
        "Disabling parent calendar",
        carlosUserId
      );

      const effectiveAfter = await moduleResolver.resolveEffectiveModules(carlosSoloTenantId);
      const afterAppt = effectiveAfter.find((m) => m.module.code === "scheduling.appointments");
      expect(afterAppt?.isEnabled).toBe(false);
      expect(afterAppt?.source).toBe("DEPENDENCY_MISSING");

      // Clean up
      await moduleRepo.removeTenantOverride(carlosSoloTenantId, calMod!.module.id);
    });
  });

  // =========================================================================
  // 3. WORKSPACE CONTEXT RESOLUTION & SWITCHING
  // =========================================================================
  describe("3. Workspace Context Resolution & Safe Context Switching", () => {
    it("should resolve Carlos's authorized solo workspace as OWNER", async () => {
      const workspaces = await resolveWorkspacesUseCase.execute(carlosUserId);
      expect(workspaces.length).toBeGreaterThanOrEqual(1);

      const solo = workspaces.find((w) => w.id === carlosSoloTenantId);
      expect(solo).toBeDefined();
      expect(solo?.type).toBe("SOLO_PROFESSIONAL");
      expect(solo?.role).toBe("OWNER");
      expect(solo?.isOwner).toBe(true);
    });

    it("should allow validating access to authorized workspace and deny unauthorized workspace", async () => {
      const access = await resolveWorkspacesUseCase.validateAccess(carlosUserId, carlosSoloTenantId);
      expect(access.id).toBe(carlosSoloTenantId);

      // Attempting to access an unauthorized tenant throws ForbiddenError
      await expect(
        resolveWorkspacesUseCase.validateAccess(carlosUserId, hostATenantId)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // =========================================================================
  // 4. AFFILIATIONS LIFECYCLE & LOCATION SCOPING
  // =========================================================================
  describe("4. Professional Affiliation Lifecycle & Location Scoping", () => {
    let affiliationId: string;

    it("should allow requesting an affiliation from Solo Workspace to Host A", async () => {
      const affil = await manageAffilUseCase.requestAffiliation({
        professionalWorkspaceTenantId: carlosSoloTenantId,
        hostTenantId: hostATenantId,
        relationshipType: "CHAIR_RENTAL",
        requestedByUserId: carlosUserId,
      });

      expect(affil).toBeDefined();
      expect(affil.status).toBe("REQUESTED");
      affiliationId = affil.id;
    });

    it("should allow Host A to approve affiliation scoping only Location A1", async () => {
      const approved = await manageAffilUseCase.approveAffiliation({
        affiliationId,
        approvedByUserId: hostAOwnerUserId,
        locationIds: [hostALoc1Id], // Only Sede Norte!
      });

      expect(approved.status).toBe("ACTIVE");

      // Check location authorization
      const isLoc1Allowed = await affilRepo.isLocationAuthorized(affiliationId, hostALoc1Id);
      expect(isLoc1Allowed).toBe(true);

      const isLoc2Allowed = await affilRepo.isLocationAuthorized(affiliationId, hostALoc2Id);
      expect(isLoc2Allowed).toBe(false);
    });

    it("should now include Host A in Carlos's resolved workspaces as AFFILIATED_PROFESSIONAL", async () => {
      const workspaces = await resolveWorkspacesUseCase.execute(carlosUserId);
      const hostAWorkspace = workspaces.find((w) => w.id === hostATenantId);

      expect(hostAWorkspace).toBeDefined();
      expect(hostAWorkspace?.role).toBe("AFFILIATED_PROFESSIONAL");
      expect(hostAWorkspace?.relationship).toBe("AFFILIATED_PROFESSIONAL");
    });
  });

  // =========================================================================
  // 5. CROSS-TENANT BOOKING WITH AFFILIATION (CASE B)
  // =========================================================================
  describe("5. Cross-Tenant Booking Execution (Case B)", () => {
    it("should successfully book Case B appointment at authorized Host A Location 1", async () => {
      const tomorrow10am = new Date();
      tomorrow10am.setDate(tomorrow10am.getDate() + 2);
      tomorrow10am.setHours(10, 0, 0, 0);

      const result = await createAppointmentUseCase.execute({
        tenantId: carlosSoloTenantId,   // Commercial owner: Carlos Solo Workspace
        locationId: hostALoc1Id,       // Physical location: Host A Sede Norte
        staffId: carlosSoloStaffId,    // Staff executing service: Carlos
        serviceIds: [carlosSoloServiceId],
        customerUserId,
        customerName: "Juan Pérez",
        startsAt: tomorrow10am,
      });

      expect(result.appointment).toBeDefined();
      expect(result.appointment.appointment.tenantId).toBe(carlosSoloTenantId);
      expect(result.appointment.appointment.locationId).toBe(hostALoc1Id);
      expect(result.appointment.appointment.staffId).toBe(carlosSoloStaffId);
      expect(result.appointment.appointment.status).toBe("CONFIRMED");

      // Verify customer relationship was recorded for Carlos's solo workspace
      const [rel] = await db
        .select()
        .from(customerRelationships)
        .where(
          and(
            eq(customerRelationships.tenantId, carlosSoloTenantId),
            eq(customerRelationships.customerUserId, customerUserId)
          )
        )
        .limit(1);

      expect(rel).toBeDefined();
      expect(rel.status).toBe("ACTIVE");
    });

    it("should reject booking at Host A Location 2 because it is not scoped in affiliation", async () => {
      const tomorrow11am = new Date();
      tomorrow11am.setDate(tomorrow11am.getDate() + 2);
      tomorrow11am.setHours(11, 0, 0, 0);

      await expect(
        createAppointmentUseCase.execute({
          tenantId: carlosSoloTenantId,
          locationId: hostALoc2Id, // Unauthorized location!
          staffId: carlosSoloStaffId,
          serviceIds: [carlosSoloServiceId],
          customerUserId,
          customerName: "Juan Pérez",
          startsAt: tomorrow11am,
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("should reject cross-tenant booking when NO affiliation exists", async () => {
      const tomorrow12pm = new Date();
      tomorrow12pm.setDate(tomorrow12pm.getDate() + 2);
      tomorrow12pm.setHours(12, 0, 0, 0);

      // Host B has no affiliation with Carlos yet
      await expect(
        createAppointmentUseCase.execute({
          tenantId: carlosSoloTenantId,
          locationId: hostBLoc1Id, // Host B location!
          staffId: carlosSoloStaffId,
          serviceIds: [carlosSoloServiceId],
          customerUserId,
          customerName: "Juan Pérez",
          startsAt: tomorrow12pm,
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // =========================================================================
  // 6. CROSS-HOST CONCURRENCY & DOUBLE-BOOKING STRESS TEST (50 PETICIONES)
  // =========================================================================
  describe("6. Cross-Host Double-Booking Concurrency Stress Test (PostgreSQL GiST)", () => {
    it("should prevent double booking across different host locations under 50 simultaneous requests", async () => {
      // 1. Establish affiliation with Host B at Location B1 as well
      const affilB = await manageAffilUseCase.requestAffiliation({
        professionalWorkspaceTenantId: carlosSoloTenantId,
        hostTenantId: hostBTenantId,
        relationshipType: "COMMISSION",
        requestedByUserId: carlosUserId,
      });

      await manageAffilUseCase.approveAffiliation({
        affiliationId: affilB.id,
        approvedByUserId: hostBOwnerUserId,
        locationIds: [hostBLoc1Id],
      });

      // 2. Target EXACT same time slot: 3 days from now at 15:00:00 UTC
      const conflictSlot = new Date();
      conflictSlot.setDate(conflictSlot.getDate() + 3);
      conflictSlot.setHours(15, 0, 0, 0);

      const TOTAL_CONCURRENT = 50;
      const promises: Promise<any>[] = [];

      // 25 attempts at Host A (Loc A1) and 25 attempts at Host B (Loc B1)
      for (let i = 0; i < TOTAL_CONCURRENT; i++) {
        const targetLocationId = i % 2 === 0 ? hostALoc1Id : hostBLoc1Id;
        promises.push(
          createAppointmentUseCase.execute({
            tenantId: carlosSoloTenantId,
            locationId: targetLocationId,
            staffId: carlosSoloStaffId,
            serviceIds: [carlosSoloServiceId],
            customerUserId,
            customerName: `Concurrent Client ${i}`,
            startsAt: conflictSlot,
          })
        );
      }

      const results = await Promise.allSettled(promises);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      // EXACTLY ONE must succeed!
      expect(fulfilled.length).toBe(1);

      // EXACTLY 49 must fail due to double-booking prevention!
      expect(rejected.length).toBe(TOTAL_CONCURRENT - 1);

      // Verify in DB that only 1 record exists for that staff at that time
      const bookedAppts = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.staffId, carlosSoloStaffId),
            eq(appointments.startsAt, conflictSlot)
          )
        );

      expect(bookedAppts.length).toBe(1);
    });
  });

  // =========================================================================
  // 7. AFFILIATION SUSPENSION & TENANT DATA ISOLATION
  // =========================================================================
  describe("7. Affiliation Suspension & Data Isolation", () => {
    it("should deny new bookings when affiliation is suspended without affecting historical data", async () => {
      // Find Host A affiliation
      const affilA = await affilRepo.findActiveAffiliation(carlosSoloTenantId, hostATenantId);
      expect(affilA).toBeDefined();

      // Suspend Host A affiliation
      await manageAffilUseCase.suspendAffiliation({
        affiliationId: affilA!.id,
        actorUserId: hostAOwnerUserId,
      });

      // Attempting to book at Host A now fails
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      futureDate.setHours(11, 0, 0, 0);

      await expect(
        createAppointmentUseCase.execute({
          tenantId: carlosSoloTenantId,
          locationId: hostALoc1Id,
          staffId: carlosSoloStaffId,
          serviceIds: [carlosSoloServiceId],
          customerUserId,
          customerName: "Juan Pérez",
          startsAt: futureDate,
        })
      ).rejects.toThrow(ForbiddenError);

      // Verify Carlos's solo workspace and past appointments still exist and are owned by Carlos
      const soloAppts = await appointmentRepo.list({ tenantId: carlosSoloTenantId });
      expect(soloAppts.length).toBeGreaterThan(0);
    });

    it("should maintain strict data isolation between host tenants", async () => {
      // Host A appointments query
      const hostAAppts = await appointmentRepo.list({ tenantId: hostATenantId });
      // Carlos's solo workspace appointments query
      const carlosAppts = await appointmentRepo.list({ tenantId: carlosSoloTenantId });

      // Host A must not see Carlos's commercial appointments as its own tenant appointments
      for (const a of hostAAppts) {
        expect(a.appointment.tenantId).toBe(hostATenantId);
      }

      // Carlos's appointments belong to Carlos's solo tenant
      for (const a of carlosAppts) {
        expect(a.appointment.tenantId).toBe(carlosSoloTenantId);
      }
    });
  });
});
