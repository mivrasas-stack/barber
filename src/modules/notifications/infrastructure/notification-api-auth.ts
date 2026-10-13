import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  validateSessionWithDb,
  type SessionPayload,
} from "@/infrastructure/auth/session";
import { ResolveWorkspacesUseCase } from "@/modules/tenancy/application/resolve-workspaces.usecase";
import { UnauthenticatedError } from "@/shared/errors/app-error";

export async function requireNotificationSession(
  request: NextRequest
): Promise<SessionPayload> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) throw new UnauthenticatedError();

  const session = await validateSessionWithDb(token);
  if (!session) throw new UnauthenticatedError("Session invalid or expired");
  return session;
}

export async function assertNotificationTenantAccess(
  userId: string,
  tenantId: string,
  isPlatformAdmin: boolean
): Promise<void> {
  if (isPlatformAdmin) return;
  await new ResolveWorkspacesUseCase().validateAccess(userId, tenantId);
}
