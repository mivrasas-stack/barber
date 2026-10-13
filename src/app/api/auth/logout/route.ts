import { NextRequest, NextResponse } from "next/server";
import { revokeSession, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      await revokeSession(token);
    } catch (err) {
      // Fail closed: don't report a successful revocation when storage failed.
      console.error("Session revocation failed", err instanceof Error ? err.name : "unknown");
      return NextResponse.json(
        { error: "No se pudo cerrar la sesión. Inténtalo nuevamente." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { headers: { "Cache-Control": "no-store" } },
  );

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });

  return response;
}
