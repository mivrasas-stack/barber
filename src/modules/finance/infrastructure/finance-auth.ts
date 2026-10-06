import { NextRequest } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { ResolveWorkspacesUseCase } from "@/modules/tenancy/application/resolve-workspaces.usecase";
import { DrizzleModuleRepository } from "@/modules/modules/infrastructure/drizzle-module.repository";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { ModuleEntitlementResolver } from "@/modules/modules/application/module-entitlement-resolver";
import { UnauthenticatedError, ForbiddenError } from "@/shared/errors/app-error";

export async function authorizeFinanceRequest(
  request: NextRequest,
  options?: {
    requiredModule?: string;
    targetTenantId?: string;
  }
) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    throw new UnauthenticatedError("Unauthorized: Missing session token");
  }

  const session = await validateSessionWithDb(token);
  if (!session) {
    throw new UnauthenticatedError("Session invalid or expired");
  }

  // Resolve tenantId
  let tenantId =
    options?.targetTenantId ||
    request.nextUrl.searchParams.get("tenantId") ||
    request.headers.get("x-tenant-id") ||
    request.cookies.get("barber_active_workspace")?.value;

  if (!tenantId) {
    throw new ForbiddenError("Missing tenant context. Select an active workspace.");
  }

  // Validate user has membership or authorized affiliation in this tenant
  const workspaceResolver = new ResolveWorkspacesUseCase();
  const workspace = await workspaceResolver.validateAccess(session.userId, tenantId);

  // Validate module entitlement if required
  if (options?.requiredModule) {
    const moduleRepo = new DrizzleModuleRepository();
    const subRepo = new DrizzleSubscriptionRepository();
    const entitlementResolver = new ModuleEntitlementResolver(moduleRepo, subRepo);
    await entitlementResolver.assertTenantModuleEnabled(tenantId, options.requiredModule);
  }

  return {
    session,
    workspace,
    tenantId,
  };
}
