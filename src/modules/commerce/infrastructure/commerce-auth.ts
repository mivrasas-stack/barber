import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  memberships,
  membershipRoles,
  roles,
  rolePermissions,
  permissions,
  modules,
  locations,
  professionalAffiliations,
  professionalAffiliationLocations,
  professionalProfiles,
  products,
  productVariants,
} from "@/infrastructure/database/schema";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleModuleRepository } from "@/modules/modules/infrastructure/drizzle-module.repository";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { ModuleEntitlementResolver } from "@/modules/modules/application/module-entitlement-resolver";
import { UnauthenticatedError, ForbiddenError } from "@/shared/errors/app-error";

export interface AuthorizeCommerceOptions {
  requiredModule?: string;
  requiredPermission?: string;
  targetTenantId?: string;
}

export interface CommerceAuthorization {
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
  actorOwnerTenantId: string;
  authorizedLocationIds: string[];
  isAffiliated: boolean;
  hasPermission(code: string): boolean;
  assertLocationAccess(locationId: string): void;
  assertProductVariantOwnership(variantId: string): Promise<void>;
  getAllowedSellerTenantIds(locationId?: string): Promise<string[]>;
  assertOrderAccess(order: any): void;
  canViewCosts(): boolean;
}

export async function authorizeCommerceRequest(
  request: NextRequest,
  options?: AuthorizeCommerceOptions
): Promise<CommerceAuthorization> {
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
    throw new ForbiddenError("Missing tenant context. Select an active workspace.");
  }

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

  if (!membership) {
    throw new ForbiddenError("Access denied: Not an active member of this workspace");
  }

  const roleBindings = await db
    .select({
      roleId: roles.id,
      roleName: roles.name,
      permissionCode: permissions.code,
    })
    .from(membershipRoles)
    .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(membershipRoles.membershipId, membership.id));

  const grantedPermissions = new Set<string>();
  const roleNames = new Set<string>();
  for (const r of roleBindings) {
    roleNames.add(r.roleName);
    if (r.permissionCode) {
      grantedPermissions.add(r.permissionCode);
    }
  }

  const roleName = Array.from(roleNames)[0] || "MEMBER";
  const isOwner = roleNames.has("OWNER") || session.isPlatformAdmin;
  const isAffiliated = roleNames.has("AFFILIATED_PROFESSIONAL");

  function hasPermission(code: string): boolean {
    if (isOwner) return true;
    return grantedPermissions.has(code);
  }

  if (options?.requiredModule) {
    const [mod] = await db
      .select()
      .from(modules)
      .where(eq(modules.code, options.requiredModule))
      .limit(1);

    if (!mod || mod.status !== "AVAILABLE") {
      throw new Error(`MODULE_NOT_ENTITLED: Module ${options.requiredModule} is not available`);
    }

    const moduleRepo = new DrizzleModuleRepository();
    const subRepo = new DrizzleSubscriptionRepository();
    const entitlementResolver = new ModuleEntitlementResolver(moduleRepo, subRepo);
    await entitlementResolver.assertTenantModuleEnabled(tenantId, options.requiredModule);
  }

  if (options?.requiredPermission && !hasPermission(options.requiredPermission)) {
    throw new Error(
      `PERMISSION_DENIED: Role ${roleName} does not have required permission ${options.requiredPermission}`
    );
  }

  let actorOwnerTenantId = tenantId;
  let authorizedLocationIds: string[] = [];

  if (isAffiliated) {
    const [affiliation] = await db
      .select({
        id: professionalAffiliations.id,
        professionalWorkspaceTenantId:
          professionalAffiliations.professionalWorkspaceTenantId,
        status: professionalAffiliations.status,
      })
      .from(professionalAffiliations)
      .innerJoin(
        professionalProfiles,
        eq(
          professionalAffiliations.professionalProfileId,
          professionalProfiles.id
        )
      )
      .where(
        and(
          eq(professionalAffiliations.hostTenantId, tenantId),
          eq(professionalProfiles.userId, session.userId)
        )
      )
      .limit(1);

    if (!affiliation || affiliation.status !== "ACTIVE") {
      throw new Error("AFFILIATION_REQUIRED: Active host affiliation required");
    }

    actorOwnerTenantId = affiliation.professionalWorkspaceTenantId;

    const affLocs = await db
      .select({ locationId: professionalAffiliationLocations.locationId })
      .from(professionalAffiliationLocations)
      .where(
        and(
          eq(professionalAffiliationLocations.affiliationId, affiliation.id),
          eq(professionalAffiliationLocations.status, "ACTIVE")
        )
      );

    authorizedLocationIds = affLocs.map((l) => l.locationId);
  } else {
    const hostLocs = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.tenantId, tenantId));
    authorizedLocationIds = hostLocs.map((l) => l.id);
  }

  return {
    session: {
      userId: session.userId,
      token,
      email: session.email,
      isPlatformAdmin: session.isPlatformAdmin,
    },
    userId: session.userId,
    tenantId,
    membershipId: membership.id,
    roleName,
    actorOwnerTenantId,
    authorizedLocationIds,
    isAffiliated,
    hasPermission,
    assertLocationAccess(locationId: string) {
      if (!authorizedLocationIds.includes(locationId)) {
        throw new Error(`LOCATION_SCOPE_DENIED: Access to location ${locationId} is not authorized`);
      }
    },
    async assertProductVariantOwnership(variantId: string) {
      const [v] = await db
        .select({ ownerTenantId: products.ownerTenantId })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(eq(productVariants.id, variantId))
        .limit(1);

      if (!v || v.ownerTenantId !== actorOwnerTenantId) {
        throw new Error(
          `OWNER_SCOPE_DENIED: You do not own product variant ${variantId}`
        );
      }
    },
    async getAllowedSellerTenantIds(_locationId?: string) {
      if (isAffiliated) {
        return [actorOwnerTenantId];
      }
      return [tenantId];
    },
    assertOrderAccess(order: any) {
      if (isAffiliated) {
        const items = order.items || [];
        const hasOwnItem = items.some(
          (i: any) => i.sellerTenantId === actorOwnerTenantId
        );
        const isOrderCreator = order.createdByUserId === session.userId;
        if (!hasOwnItem && !isOrderCreator) {
          throw new Error("SELLER_SCOPE_DENIED: Cannot access foreign order");
        }
      }
    },
    canViewCosts() {
      if (isAffiliated) return false;
      return (
        hasPermission("inventory.cost.read") ||
        hasPermission("finance.read") ||
        hasPermission("products.manage") ||
        hasPermission("inventory.manage")
      );
    },
  };
}
