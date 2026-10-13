import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { SESSION_COOKIE_NAME, validateSessionWithDb } from "@/infrastructure/auth/session";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { membershipRoles, roles } from "@/infrastructure/database/schema/roles";
import { ResolveWorkspacesUseCase } from "@/modules/tenancy/application/resolve-workspaces.usecase";

export type ProtectedPortal = "BUSINESS" | "BARBER";

/** Second, DB-backed layer behind the edge JWT check. Never trust route or cookie alone. */
export async function requirePortalWorkspace(portal: ProtectedPortal) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? await validateSessionWithDb(sessionToken) : null;
  if (!session) redirect("/login?error=session_expired");

  const workspaceId = cookieStore.get("barber_active_workspace")?.value;
  const rows = await db.select({
    tenantId: memberships.tenantId,
    type: tenants.tenantType,
    role: roles.name,
  })
    .from(memberships)
    .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
    .innerJoin(membershipRoles, eq(membershipRoles.membershipId, memberships.id))
    .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
    .where(and(
      eq(memberships.userId, session.userId),
      eq(memberships.status, "ACTIVE"),
      eq(tenants.status, "ACTIVE")
    ));

  // Affiliated SOLO professionals can access their allowed barber workspace
  // through the existing affiliation resolver, never the BUSINESS owner area.
  const affiliations = portal === "BARBER"
    ? await new ResolveWorkspacesUseCase().execute(session.userId)
    : [];
  const allowed = rows.filter((row) =>
    portal === "BUSINESS"
      ? row.type === "BUSINESS" && ["OWNER", "MANAGER"].includes(row.role)
      : ["EMPLOYEE", "MANAGER", "OWNER"].includes(row.role)
  );
  const allowedIds = new Set(allowed.map((row) => row.tenantId));
  if (portal === "BARBER") {
    for (const a of affiliations) {
      if (a.role === "AFFILIATED_PROFESSIONAL") allowedIds.add(a.id);
    }
  }
  // A workspace cookie must never cause authorization to fall back to some
  // other tenant if it explicitly specifies an inaccessible workspace.
  if (workspaceId && !allowedIds.has(workspaceId)) {
    redirect("/portal?error=workspace_access_denied");
  }
  if (allowedIds.size === 0) redirect("/portal?error=role_required");
  return { session, workspaceId: workspaceId || [...allowedIds][0] };
}
