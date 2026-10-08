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
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleModuleRepository } from "@/modules/modules/infrastructure/drizzle-module.repository";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { ModuleEntitlementResolver } from "@/modules/modules/application/module-entitlement-resolver";
import { UnauthenticatedError, ForbiddenError } from "@/shared/errors/app-error";
import { PaymentIntent } from "../domain/payment-intent";
import { Refund } from "../domain/refund";

export interface AuthorizePaymentOptions {
  requiredModule?: string;
  requiredPermission?: string;
  targetTenantId?: string;
}

export interface PaymentAuthorization {
  session: {
    userId: string;
    token: string;
    email: string;
    isPlatformAdmin: boolean;
  };
  userId: string;
  tenantId: string;
  membershipId: string;
  roleName: string;
  hasPermission(code: string): boolean;
  assertPaymentAccess(payment: PaymentIntent): void;
  assertRefundAccess(refund: Refund): void;
  sanitizePaymentResponse(payment: any): any;
}

export async function authorizePaymentRequest(
  request: NextRequest,
  options?: AuthorizePaymentOptions
): Promise<PaymentAuthorization> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    throw new UnauthenticatedError("Unauthorized: Missing session token");
  }

  const session = await validateSessionWithDb(token);
  if (!session) {
    throw new UnauthenticatedError("Session invalid or expired");
  }

  const tenantId =
    options?.targetTenantId ||
    request.nextUrl.searchParams.get("tenantId") ||
    request.headers.get("x-tenant-id") ||
    request.cookies.get("barber_active_workspace")?.value;

  if (!tenantId) {
    throw new ForbiddenError("Missing tenant context for payment operation");
  }

  // Verify membership in tenant
  const [membership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.userId, session.userId),
        eq(memberships.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!membership && !session.isPlatformAdmin) {
    throw new ForbiddenError("Forbidden: You are not an active member of this workspace");
  }

  // Load permissions for this membership
  let permissionCodes: string[] = [];
  let roleName = "MEMBER";

  if (membership) {
    const memRoles = await db
      .select({
        roleId: membershipRoles.roleId,
        roleName: roles.name,
      })
      .from(membershipRoles)
      .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
      .where(eq(membershipRoles.membershipId, membership.id));

    if (memRoles.length > 0) {
      roleName = memRoles[0].roleName;
      const roleIds = memRoles.map((r) => r.roleId);

      const permRows = await db
        .select({ code: permissions.code })
        .from(rolePermissions)
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(inArray(rolePermissions.roleId, roleIds));

      permissionCodes = permRows.map((p) => p.code);
    }
  }

  const hasPermission = (code: string): boolean => {
    if (session.isPlatformAdmin) return true;
    if (roleName === "OWNER") return true;
    return permissionCodes.includes(code);
  };

  // Module Entitlement validation
  if (options?.requiredModule) {
    const moduleRepo = new DrizzleModuleRepository();
    const subRepo = new DrizzleSubscriptionRepository();
    const entitlementResolver = new ModuleEntitlementResolver(moduleRepo, subRepo);
    await entitlementResolver.assertTenantModuleEnabled(tenantId, options.requiredModule);
  }

  // RBAC Permission validation
  if (options?.requiredPermission && !hasPermission(options.requiredPermission)) {
    throw new ForbiddenError(
      `PERMISSION_DENIED: Role ${roleName} does not have required permission '${options.requiredPermission}'`
    );
  }

  const assertPaymentAccess = (payment: PaymentIntent): void => {
    if (session.isPlatformAdmin) return;
    if (payment.collectorTenantId !== tenantId) {
      throw new ForbiddenError("TENANT_SCOPE_DENIED: Payment intent belongs to another tenant");
    }
  };

  const assertRefundAccess = (refund: Refund): void => {
    if (session.isPlatformAdmin) return;
    if (refund.collectorTenantId !== tenantId) {
      throw new ForbiddenError("TENANT_SCOPE_DENIED: Refund belongs to another tenant");
    }
  };

  const sanitizePaymentResponse = (payment: any): any => {
    const sanitized = { ...payment };
    // Redact internal secrets, raw webhook tokens, or private metadata
    if (sanitized.metadata?.privateKey) delete sanitized.metadata.privateKey;
    if (sanitized.metadata?.secret) delete sanitized.metadata.secret;
    return sanitized;
  };

  return {
    session: {
      userId: session.userId,
      token,
      email: session.email,
      isPlatformAdmin: session.isPlatformAdmin,
    },
    userId: session.userId,
    tenantId,
    membershipId: membership?.id ?? "platform-admin",
    roleName,
    hasPermission,
    assertPaymentAccess,
    assertRefundAccess,
    sanitizePaymentResponse,
  };
}
