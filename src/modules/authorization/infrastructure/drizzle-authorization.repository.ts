import { eq, and, inArray, isNull } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { users } from "@/infrastructure/database/schema/users";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { roles, membershipRoles } from "@/infrastructure/database/schema/roles";
import { permissions, rolePermissions } from "@/infrastructure/database/schema/permissions";
import {
  AuthorizationRepository,
  CreateMembershipInput,
} from "../domain/authorization-repository.interface";
import {
  AuthorizationContext,
  UserMembershipSummary,
} from "../domain/authorization-context";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";

export class DrizzleAuthorizationRepository implements AuthorizationRepository {
  async createMembership(input: CreateMembershipInput): Promise<string> {
    // 1. Check if membership already exists
    const existing = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.tenantId, input.tenantId), eq(memberships.userId, input.userId)))
      .limit(1);

    if (existing[0]) {
      throw new ConflictError("User already has a membership in this tenant");
    }

    // 2. Insert membership
    const [membership] = await db
      .insert(memberships)
      .values({
        tenantId: input.tenantId,
        userId: input.userId,
        status: "ACTIVE",
      })
      .returning();

    // 3. Attach roles
    for (const roleName of input.roleNames) {
      // Find role for this tenant or system default role (tenantId is null)
      let roleRow = (
        await db
          .select()
          .from(roles)
          .where(and(eq(roles.name, roleName.toUpperCase()), eq(roles.tenantId, input.tenantId)))
          .limit(1)
      )[0];

      if (!roleRow) {
        // Try system template role
        roleRow = (
          await db
            .select()
            .from(roles)
            .where(
              and(
                eq(roles.name, roleName.toUpperCase()),
                isNull(roles.tenantId)
              )
            )
            .limit(1)
        )[0];
      }

      if (!roleRow) {
        // Create role if it doesn't exist
        const [newRole] = await db
          .insert(roles)
          .values({
            tenantId: input.tenantId,
            name: roleName.toUpperCase(),
            description: `Role ${roleName}`,
          })
          .returning();
        roleRow = newRole;
      }

      await db.insert(membershipRoles).values({
        membershipId: membership.id,
        roleId: roleRow.id,
      });
    }

    return membership.id;
  }

  async getAuthorizationContext(
    userId: string,
    targetTenantId?: string
  ): Promise<AuthorizationContext | null> {
    // 1. Get user
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return null;

    // 2. Get user's memberships with tenant info
    const membershipRows = await db
      .select({
        membershipId: memberships.id,
        tenantId: memberships.tenantId,
        status: memberships.status,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        tenantType: tenants.tenantType,
      })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(eq(memberships.userId, userId));

    const membershipSummaries: UserMembershipSummary[] = [];
    const roleIdsByMembership = new Map<string, string[]>();

    for (const m of membershipRows) {
      // Get roles for this membership
      const roleRows = await db
        .select({ roleId: roles.id, roleName: roles.name })
        .from(membershipRoles)
        .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
        .where(eq(membershipRoles.membershipId, m.membershipId));

      roleIdsByMembership.set(
        m.membershipId,
        roleRows.map((r) => r.roleId)
      );

      membershipSummaries.push({
        membershipId: m.membershipId,
        tenantId: m.tenantId,
        tenantName: m.tenantName,
        tenantSlug: m.tenantSlug,
        tenantType: m.tenantType as "BUSINESS" | "SOLO_PROFESSIONAL",
        status: m.status,
        roles: roleRows.map((r) => r.roleName),
      });
    }

    // Determine active tenant
    let activeTenantId: string | null = null;
    let activeRoles: string[] = [];
    let activeRoleIds: string[] = [];
    let activePermissions: string[] = [];

    if (targetTenantId) {
      const activeMembership = membershipSummaries.find((m) => m.tenantId === targetTenantId);
      if (activeMembership && activeMembership.status === "ACTIVE") {
        activeTenantId = activeMembership.tenantId;
        activeRoles = activeMembership.roles;
        activeRoleIds = roleIdsByMembership.get(activeMembership.membershipId) ?? [];
      }
    } else if (membershipSummaries.length > 0) {
      // Default to first active membership
      const firstActive = membershipSummaries.find((m) => m.status === "ACTIVE");
      if (firstActive) {
        activeTenantId = firstActive.tenantId;
        activeRoles = firstActive.roles;
        activeRoleIds = roleIdsByMembership.get(firstActive.membershipId) ?? [];
      }
    }

    // Resolve permissions for active roles
    if (activeRoleIds.length > 0) {
        const permRows = await db
          .select({ code: permissions.code })
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(inArray(rolePermissions.roleId, activeRoleIds));

        activePermissions = Array.from(new Set(permRows.map((p) => p.code)));
    }

    return new AuthorizationContext({
      userId: user.id,
      email: user.email,
      name: user.name,
      isPlatformAdmin: user.isPlatformAdmin,
      memberships: membershipSummaries,
      activeTenantId,
      activeRoles,
      activePermissions,
    });
  }
}
