import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DrizzleUserRepository } from "@/modules/identity/infrastructure/drizzle-user.repository";
import { AuthenticateUserUseCase } from "@/modules/identity/application/authenticate-user.usecase";
import { createSession, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";
import { AppError } from "@/shared/errors/app-error";

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

    const userRepo = new DrizzleUserRepository();
    const authUseCase = new AuthenticateUserUseCase(userRepo);

    const user = await authUseCase.execute({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
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

    let defaultRedirect = "/clientes";
    if (user.isPlatformAdmin) {
      defaultRedirect = "/admin";
    } else if (authContext?.isOwner()) {
      defaultRedirect = "/barber/admin";
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
