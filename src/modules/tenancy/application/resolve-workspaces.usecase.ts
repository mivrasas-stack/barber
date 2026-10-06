import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { membershipRoles, roles } from "@/infrastructure/database/schema/roles";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { professionalProfiles, professionalAffiliations } from "@/infrastructure/database/schema/professionals";
import { ForbiddenError, NotFoundError } from "@/shared/errors/app-error";

export interface WorkspaceContext {
  id: string;
  type: "BUSINESS" | "SOLO_PROFESSIONAL";
  name: string;
  slug: string;
  role: string;
  isOwner: boolean;
  relationship?: "OWNER" | "STAFF" | "AFFILIATED_PROFESSIONAL";
  affiliationId?: string;
}

export class ResolveWorkspacesUseCase {
  async execute(userId: string): Promise<WorkspaceContext[]> {
    const userMemberships = await db
      .select({
        membership: memberships,
        tenant: tenants,
      })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(and(eq(memberships.userId, userId), eq(memberships.status, "ACTIVE")));

    const resultsMap = new Map<string, WorkspaceContext>();

    for (const m of userMemberships) {
      // Find roles
      const userRoles = await db
        .select({ role: roles })
        .from(membershipRoles)
        .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
        .where(eq(membershipRoles.membershipId, m.membership.id));

      const primaryRole = userRoles[0]?.role.name || "MEMBER";
      const isOwner = primaryRole === "OWNER";

      resultsMap.set(m.tenant.id, {
        id: m.tenant.id,
        type: m.tenant.tenantType as "BUSINESS" | "SOLO_PROFESSIONAL",
        name: m.tenant.name,
        slug: m.tenant.slug,
        role: primaryRole,
        isOwner,
        relationship: isOwner ? "OWNER" : "STAFF",
      });
    }

    // Check if user has a professional profile with active affiliations
    const [profProfile] = await db
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.userId, userId))
      .limit(1);

    if (profProfile) {
      const affiliations = await db
        .select({
          affiliation: professionalAffiliations,
          hostTenant: tenants,
        })
        .from(professionalAffiliations)
        .innerJoin(tenants, eq(professionalAffiliations.hostTenantId, tenants.id))
        .where(
          and(
            eq(professionalAffiliations.professionalProfileId, profProfile.id),
            eq(professionalAffiliations.status, "ACTIVE")
          )
        );

      for (const a of affiliations) {
        const existing = resultsMap.get(a.hostTenant.id);
        if (existing) {
          existing.role = "AFFILIATED_PROFESSIONAL";
          existing.relationship = "AFFILIATED_PROFESSIONAL";
          existing.affiliationId = a.affiliation.id;
        } else {
          resultsMap.set(a.hostTenant.id, {
            id: a.hostTenant.id,
            type: "BUSINESS",
            name: a.hostTenant.name,
            slug: a.hostTenant.slug,
            role: "AFFILIATED_PROFESSIONAL",
            isOwner: false,
            relationship: "AFFILIATED_PROFESSIONAL",
            affiliationId: a.affiliation.id,
          });
        }
      }
    }

    return Array.from(resultsMap.values());
  }

  async validateAccess(userId: string, targetTenantId: string): Promise<WorkspaceContext> {
    const workspaces = await this.execute(userId);
    const found = workspaces.find((w) => w.id === targetTenantId);
    if (!found) {
      throw new ForbiddenError("WORKSPACE_ACCESS_DENIED: User is not authorized to access this workspace");
    }
    return found;
  }
}
