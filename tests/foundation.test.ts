import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { DrizzleUserRepository } from "@/modules/identity/infrastructure/drizzle-user.repository";
import { DrizzleTenantRepository } from "@/modules/tenancy/infrastructure/drizzle-tenant.repository";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";
import { PasswordHasher } from "@/modules/identity/infrastructure/password-hasher";
import { createSession, validateSessionWithDb, revokeSession } from "@/infrastructure/auth/session";
import { pool } from "@/infrastructure/database/client";
import { ConflictError } from "@/shared/errors/app-error";
import crypto from "crypto";

describe("Barber Paradise v2 - Stage 0 & 1 Foundation Tests", () => {
  const userRepo = new DrizzleUserRepository();
  const tenantRepo = new DrizzleTenantRepository();
  const authRepo = new DrizzleAuthorizationRepository();

  const testSuffix = crypto.randomUUID().slice(0, 8);
  const testEmail1 = `test.owner.${testSuffix}@example.com`;
  const testEmail2 = `test.employee.${testSuffix}@example.com`;

  let user1Id: string;
  let user2Id: string;
  let tenantAId: string;
  let tenantBId: string;

  beforeAll(async () => {
    // Hash password check
    const hash = await PasswordHasher.hash("SecurePass123!");
    expect(await PasswordHasher.compare("SecurePass123!", hash)).toBe(true);
    expect(await PasswordHasher.compare("WrongPass", hash)).toBe(false);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("1. Identity & User Repository", () => {
    it("should create user with email normalization and prevent duplicates", async () => {
      const user = await userRepo.create({
        email: `  ${testEmail1.toUpperCase()}  `,
        name: "Test Owner",
        passwordHash: await PasswordHasher.hash("Pass123!"),
      });

      expect(user.id).toBeDefined();
      expect(user.emailNormalized).toBe(testEmail1.toLowerCase());
      expect(user.isActive).toBe(true);
      user1Id = user.id;

      // Duplicate email attempt must throw ConflictError
      await expect(
        userRepo.create({
          email: testEmail1.toLowerCase(),
          name: "Duplicate User",
        })
      ).rejects.toThrow(ConflictError);
    });

    it("should find user by normalized email and by ID", async () => {
      const foundByEmail = await userRepo.findByEmail(testEmail1);
      expect(foundByEmail).not.toBeNull();
      expect(foundByEmail?.id).toBe(user1Id);

      const foundById = await userRepo.findById(user1Id);
      expect(foundById).not.toBeNull();
      expect(foundById?.emailNormalized).toBe(testEmail1);
    });
  });

  describe("2. Tenancy & Locations", () => {
    it("should create tenants with unique slugs and locations", async () => {
      const tenantA = await tenantRepo.create({
        name: `Tenant Alpha ${testSuffix}`,
        slug: `tenant-alpha-${testSuffix}`,
        defaultCurrency: "COP",
        defaultTimezone: "America/Bogota",
      });
      tenantAId = tenantA.id;
      expect(tenantA.slug).toBe(`tenant-alpha-${testSuffix}`);

      const tenantB = await tenantRepo.create({
        name: `Tenant Beta ${testSuffix}`,
        slug: `tenant-beta-${testSuffix}`,
        defaultCurrency: "USD",
        defaultTimezone: "America/New_York",
      });
      tenantBId = tenantB.id;

      // Duplicate tenant slug must throw ConflictError
      await expect(
        tenantRepo.create({
          name: "Duplicate Tenant",
          slug: `tenant-alpha-${testSuffix}`,
        })
      ).rejects.toThrow(ConflictError);

      // Create locations
      const loc1 = await tenantRepo.createLocation({
        tenantId: tenantAId,
        name: "Location Sede Norte",
        slug: "sede-norte",
      });
      expect(loc1.tenantId).toBe(tenantAId);

      const locations = await tenantRepo.getLocations(tenantAId);
      expect(locations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("3. Multi-Tenancy & Membership Uniqueness", () => {
    it("should allow a user to have memberships across multiple tenants", async () => {
      // User 1 is OWNER in Tenant A
      const memA = await authRepo.createMembership({
        tenantId: tenantAId,
        userId: user1Id,
        roleNames: ["OWNER"],
      });
      expect(memA).toBeDefined();

      // User 1 is also EMPLOYEE in Tenant B (Multi-tenant support without duplicate users!)
      const memB = await authRepo.createMembership({
        tenantId: tenantBId,
        userId: user1Id,
        roleNames: ["EMPLOYEE"],
      });
      expect(memB).toBeDefined();

      // Duplicate membership within SAME tenant must be rejected
      await expect(
        authRepo.createMembership({
          tenantId: tenantAId,
          userId: user1Id,
          roleNames: ["MANAGER"],
        })
      ).rejects.toThrow(ConflictError);
    });

    it("should enforce cross-tenant isolation and role-specific permissions", async () => {
      // Create User 2 who only belongs to Tenant B
      const user2 = await userRepo.create({
        email: testEmail2,
        name: "Test Employee Only",
      });
      user2Id = user2.id;

      await authRepo.createMembership({
        tenantId: tenantBId,
        userId: user2Id,
        roleNames: ["EMPLOYEE"],
      });

      // Context for User 2 targeting Tenant A (must NOT have access or active roles in Tenant A!)
      const contextUser2InA = await authRepo.getAuthorizationContext(user2Id, tenantAId);
      expect(contextUser2InA).not.toBeNull();
      expect(contextUser2InA?.activeTenantId).toBeNull(); // Cross-tenant isolation verified!
      expect(contextUser2InA?.hasRole("OWNER")).toBe(false);
      expect(contextUser2InA?.hasPermission("tenant.manage")).toBe(false);

      // Context for User 2 targeting Tenant B (their own tenant)
      const contextUser2InB = await authRepo.getAuthorizationContext(user2Id, tenantBId);
      expect(contextUser2InB?.activeTenantId).toBe(tenantBId);
      expect(contextUser2InB?.hasRole("EMPLOYEE")).toBe(true);
      expect(contextUser2InB?.hasPermission("appointments.read")).toBe(true);
      expect(contextUser2InB?.hasPermission("tenant.manage")).toBe(false); // Employees cannot manage tenant

      // Context for User 1 in Tenant A (Owner) vs Tenant B (Employee)
      const contextUser1InA = await authRepo.getAuthorizationContext(user1Id, tenantAId);
      expect(contextUser1InA?.isOwner()).toBe(true);
      expect(contextUser1InA?.hasPermission("tenant.manage")).toBe(true);

      const contextUser1InB = await authRepo.getAuthorizationContext(user1Id, tenantBId);
      expect(contextUser1InB?.isOwner()).toBe(false);
      expect(contextUser1InB?.isEmployee()).toBe(true);
      expect(contextUser1InB?.hasPermission("tenant.manage")).toBe(false);
    });
  });

  describe("4. Platform Admin Access", () => {
    it("should give global access to Platform Administrator", async () => {
      const admin = await userRepo.create({
        email: `platform.admin.${testSuffix}@example.com`,
        name: "Platform SuperAdmin",
        isPlatformAdmin: true,
      });

      const context = await authRepo.getAuthorizationContext(admin.id);
      expect(context?.isPlatformAdmin).toBe(true);
      expect(context?.hasPermission("any.arbitrary.permission")).toBe(true);
      expect(context?.hasRole("PLATFORM_ADMIN")).toBe(true);
    });
  });

  describe("5. Session Security & Revocation", () => {
    it("should create, validate and revoke database sessions", async () => {
      const { token } = await createSession(
        {
          id: user1Id,
          email: testEmail1,
          name: "Test Owner",
          isPlatformAdmin: false,
        },
        { ipAddress: "127.0.0.1", userAgent: "Vitest Agent" }
      );

      // Valid session
      const valid = await validateSessionWithDb(token);
      expect(valid).not.toBeNull();
      expect(valid?.userId).toBe(user1Id);

      // Revoke session
      await revokeSession(token);

      // Subsequent validation must fail
      const revoked = await validateSessionWithDb(token);
      expect(revoked).toBeNull();
    });
  });
});
