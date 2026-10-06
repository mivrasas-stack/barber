import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "barber_session";

function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET || "development_secret_key_minimum_32_characters_for_jwt_session";
  return new TextEncoder().encode(secret);
}

interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  sessionId: string;
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      isPlatformAdmin: Boolean(payload.isPlatformAdmin),
      sessionId: payload.sessionId as string,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPlatformAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isOwnerRoute = pathname === "/barber/admin" || pathname.startsWith("/barber/admin/");
  const isEmployeeRoute = pathname === "/barber" || pathname.startsWith("/barber/");
  const isCustomerRoute = pathname === "/clientes" || pathname.startsWith("/clientes/");
  const isPortalRoute = pathname === "/portal" || pathname.startsWith("/portal/");

  const isProtectedRoute =
    isPlatformAdminRoute || isOwnerRoute || isEmployeeRoute || isCustomerRoute || isPortalRoute;

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(sessionCookie);

  if (!payload) {
    // Cookie is invalid or expired
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    loginUrl.searchParams.set("error", "session_expired");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // PLATFORM ADMIN ROUTE PROTECTION (P0 Security Check)
  if (isPlatformAdminRoute) {
    if (!payload.isPlatformAdmin) {
      console.warn(`[Security] Unauthorized access attempt to /admin by user ${payload.email}`);
      const forbiddenUrl = new URL("/login", request.url);
      forbiddenUrl.searchParams.set("error", "forbidden_platform_admin_required");
      return NextResponse.redirect(forbiddenUrl);
    }
  }

  // Attach verified user context to request headers for downstream consumers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-is-admin", payload.isPlatformAdmin ? "1" : "0");

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/barber/:path*",
    "/clientes/:path*",
    "/portal/:path*",
  ],
};
