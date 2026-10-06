import { NextRequest, NextResponse } from "next/server";
import { revokeSession, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      await revokeSession(token);
    } catch (err) {
      console.error("Error revoking session:", err);
    }
  }

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });

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
