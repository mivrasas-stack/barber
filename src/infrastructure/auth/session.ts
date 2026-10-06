import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { sessions } from "@/infrastructure/database/schema/sessions";
import { users } from "@/infrastructure/database/schema/users";
import { env } from "@/shared/config/env";

export const SESSION_COOKIE_NAME = "barber_session";
const SESSION_EXPIRATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  sessionId: string;
}

function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  user: { id: string; email: string; name: string; isPlatformAdmin: boolean },
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_SECONDS * 1000);
  const sessionId = crypto.randomUUID();

  // Create signed JWT
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    isPlatformAdmin: user.isPlatformAdmin,
    sessionId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getJwtSecretKey());

  const tokenHash = hashToken(token);

  // Store in database
  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    tokenHash,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
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

export async function validateSessionWithDb(token: string): Promise<SessionPayload | null> {
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const tokenHash = hashToken(token);
  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      userStatus: users.status,
      isPlatformAdmin: users.isPlatformAdmin,
      userName: users.name,
      userEmail: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row || row.userStatus !== "ACTIVE") return null;

  return {
    userId: row.userId,
    email: row.userEmail,
    name: row.userName,
    isPlatformAdmin: row.isPlatformAdmin, // Always fresh from DB!
    sessionId: row.sessionId,
  };
}

export async function revokeSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, tokenHash));
}
