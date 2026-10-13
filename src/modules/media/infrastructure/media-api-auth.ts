import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  validateSessionWithDb,
  type SessionPayload,
} from "@/infrastructure/auth/session";
import { UnauthenticatedError } from "@/shared/errors/app-error";

export async function optionalMediaSession(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return validateSessionWithDb(token);
}

export async function requireMediaSession(
  request: NextRequest
): Promise<SessionPayload> {
  const session = await optionalMediaSession(request);
  if (!session) {
    throw new UnauthenticatedError("Session invalid, expired, or missing");
  }
  return session;
}
