import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  memberships,
  membershipRoles,
  roles,
  rolePermissions,
  permissions,
  tenants,
} from "@/infrastructure/database/schema";
import { validateSessionWithDb, SESSION_COOKIE_NAME, SessionPayload } from "@/infrastructure/auth/session";
import { UnauthenticatedError, ForbiddenError } from "@/shared/errors/app-error";

export interface SubscriptionAuthorization {
  session: SessionPayload & { token: string };
  userId: string;
  tenantId: string;
  membershipId?: string;
  roleName?: string;
  isOwnerOrAdmin: boolean;
}

export async function authorizeSubscriptionRequest(
  request: NextRequest,
  options?: { requireOwnerOrAdmin?: boolean; targetTenantId?: string }
): Promise<SubscriptionAuthorization> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    throw new UnauthenticatedError("Unauthorized: Missing session token");
  }

  const session = await validateSessionWithDb(token);
  if (!session) {
    throw new UnauthenticatedError("Session invalid or expired");
  }

  const sessionWithToken = { ...session, token };

  const tenantId =
    options?.targetTenantId ||
    request.nextUrl.searchParams.get("tenantId") ||
    request.headers.get("x-tenant-id");

  if (!tenantId) {
    // If user has a membership, find first active tenant
    const userMemberships = await db
      .select({ tenantId: memberships.tenantId })
      .from(memberships)
      .where(and(eq(memberships.userId, session.userId), eq(memberships.status, "ACTIVE")))
      .limit(1);

    if (userMemberships.length > 0) {
      return {
        session: sessionWithToken,
        userId: session.userId,
        tenantId: userMemberships[0].tenantId,
        isOwnerOrAdmin: true,
      };
    }

    if (session.isPlatformAdmin) {
      return {
        session: sessionWithToken,
        userId: session.userId,
        tenantId: "",
        isOwnerOrAdmin: true,
      };
    }

    throw new ForbiddenError("Tenant ID could not be identified for request");
  }

  // If platform admin, grant access directly
  if (session.isPlatformAdmin) {
    return {
      session: sessionWithToken,
      userId: session.userId,
      tenantId,
      isOwnerOrAdmin: true,
    };
  }

  // Check membership in the target tenant
  const [membership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, session.userId),
        eq(memberships.tenantId, tenantId),
        eq(memberships.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!membership) {
    throw new ForbiddenError("No active membership found in this workspace");
  }

  // Check roles (OWNER, ADMIN, or SOLO_PROFESSIONAL)
  const userRoles = await db
    .select({ name: roles.name })
    .from(membershipRoles)
    .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
    .where(eq(membershipRoles.membershipId, membership.id));

  const roleNames = userRoles.map((r) => r.name.toUpperCase());
  const isOwnerOrAdmin =
    roleNames.includes("OWNER") ||
    roleNames.includes("ADMIN") ||
    roleNames.includes("SOLO_PROFESSIONAL") ||
    roleNames.includes("BARBER");

  if (options?.requireOwnerOrAdmin && !isOwnerOrAdmin) {
    throw new ForbiddenError("Only workspace owners or managers can manage billing & subscriptions");
  }

  return {
    session: sessionWithToken,
    userId: session.userId,
    tenantId,
    membershipId: membership.id,
    roleName: roleNames[0] ?? "MEMBER",
    isOwnerOrAdmin,
  };
}
