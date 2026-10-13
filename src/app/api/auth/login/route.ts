import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DrizzleUserRepository } from "@/modules/identity/infrastructure/drizzle-user.repository";
import { AuthenticateUserUseCase } from "@/modules/identity/application/authenticate-user.usecase";
import { createSession, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";
import { ResolveWorkspacesUseCase } from "@/modules/tenancy/application/resolve-workspaces.usecase";
import { AppError } from "@/shared/errors/app-error";
import { checkRateLimit, extractClientIp } from "@/infrastructure/security";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const ipAddress = extractClientIp(request);
    const accountIdentifier = parsed.data.email.toLowerCase().trim();
    const rateLimit = await checkRateLimit("auth.login", `${ipAddress}:${accountIdentifier}`);
    if (!rateLimit.allowed && rateLimit.response) {
      return rateLimit.response;
    }

    const userRepo = new DrizzleUserRepository();
    const authUseCase = new AuthenticateUserUseCase(userRepo);

    const user = await authUseCase.execute({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    const userAgent = request.headers.get("user-agent") || undefined;

    const { token, expiresAt } = await createSession(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      { ipAddress, userAgent }
    );

    // Get authorization context to determine redirection role
    const authRepo = new DrizzleAuthorizationRepository();
    const authContext = await authRepo.getAuthorizationContext(user.id, parsed.data.tenantId);

    let defaultRedirect = "/customers";
    if (user.isPlatformAdmin) {
      defaultRedirect = "/admin";
    } else if (authContext?.isSoloProfessional()) {
      defaultRedirect = "/professional";
    } else if (authContext?.isOwner()) {
      defaultRedirect = "/business";
    } else if (authContext?.isEmployee()) {
      defaultRedirect = "/barber";
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      redirectUrl: defaultRedirect,
      activeRoles: authContext?.activeRoles ?? [],
      activeTenantId: authContext?.activeTenantId ?? null,
    });

    // Persist the validated tenant selection alongside the login session.
    // Without this, staff/QR/POS requests fail despite a successful login.
    const authorizedWorkspaces = await new ResolveWorkspacesUseCase().execute(user.id);
    const authorizedActiveId = authorizedWorkspaces.find(w=>w.id===authContext?.activeTenantId)?.id
      ?? (authorizedWorkspaces.length===1?authorizedWorkspaces[0].id:null);
    response.cookies.set("barber_active_workspace",authorizedActiveId||"",{
      httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",
      path:"/",maxAge:authorizedActiveId?30*24*60*60:0,
    });

    // Set secure, HttpOnly cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Login unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
