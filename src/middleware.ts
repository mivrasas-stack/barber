import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { shouldBlockUnverifiedLaunchRoute } from "@/shared/config/launch-safety";

const SESSION_COOKIE_NAME = "barber_session";

function getJwtSecretKey(): Uint8Array {
  const configured = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!configured || configured.length < 32)) {
    // Fail closed when the deployment omitted its signing key.
    throw new Error("AUTH_SECRET must be configured for production");
  }
  const secret =
    configured || "development_secret_key_minimum_32_characters_for_jwt_session";
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
  const isOwnerRoute = pathname === "/business" || pathname.startsWith("/business/");
  const isEmployeeRoute = pathname === "/barber" || pathname.startsWith("/barber/");
  const isProfessionalRoute = pathname === "/professional" || pathname.startsWith("/professional/");
  const isCustomerRoute = pathname === "/clientes" || pathname.startsWith("/clientes/");
  const isOfficialCustomerRoute = pathname === "/customers" || pathname.startsWith("/customers/");
  const isPortalRoute = pathname === "/portal" || pathname.startsWith("/portal/");

  const isProtectedRoute =
    isPlatformAdminRoute || isOwnerRoute || isEmployeeRoute || isProfessionalRoute || isCustomerRoute || isOfficialCustomerRoute || isPortalRoute;

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

  // Keep old customer URLs as legacy aliases; never expose duplicate demo portals in production.
  if (isCustomerRoute) {
    const legacyRoutes: Record<string,string> = {
      "/clientes": "/customers",
      "/clientes/appointments": "/customers/appointments",
      "/clientes/profile": "/customers/profile",
      "/clientes/services": "/customers/services",
      "/clientes/favoritos": "/customers/favoritos",
      "/clientes/products": "/customers/products",
      "/clientes/sala-espera": "/customers/sala-espera",
      "/clientes/resenas": "/customers/resenas",
    };
    const destination = legacyRoutes[pathname] || "/customers";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Restrict unfinished/demo pages in ALL environments. A fresh account
  // must never see synthetic data, whether on localhost or in production.
  if (shouldBlockUnverifiedLaunchRoute(pathname, process.env.NODE_ENV === "production")) {
    const unavailable = new URL("/feature-unavailable", request.url);
    return NextResponse.redirect(unavailable);
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
    "/business/:path*",
    "/barber/:path*",
    "/professional/:path*",
    "/clientes/:path*",
    "/customers/:path*",
    "/portal/:path*",
  ],
};
