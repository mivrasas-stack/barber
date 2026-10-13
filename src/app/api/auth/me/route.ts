import { NextRequest, NextResponse } from "next/server";
import { validateSessionWithDb, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await validateSessionWithDb(token);
  if (!session) {
    return NextResponse.json({ error: "Session invalid or expired" }, { status: 401 });
  }

  const targetTenantId = request.nextUrl.searchParams.get("tenantId") || undefined;
  const authRepo = new DrizzleAuthorizationRepository();
  const context = await authRepo.getAuthorizationContext(session.userId, targetTenantId);

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      isPlatformAdmin: session.isPlatformAdmin,
    },
    activeTenantId: context?.activeTenantId ?? null,
    activeRoles: context?.activeRoles ?? [],
    activePermissions: context?.activePermissions ?? [],
    memberships: context?.memberships ?? [],
  }, {headers:{"Cache-Control":"private, no-store"}});
}
