import { verifySessionToken, type SessionPayload } from "@/infrastructure/auth/session";
import { db } from "@/infrastructure/database/client";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { users } from "@/infrastructure/database/schema/users";
import { eq, and } from "drizzle-orm";
import type { RateLimiter } from "@/infrastructure/security/rate-limiter.interface";

export interface RealtimeSession {
  userId: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  sessionId: string;
  tenantIds: Set<string>;
}

export interface RealtimeAuthResult {
  ok: boolean;
  session?: RealtimeSession;
  error?: string;
  code?: string;
}

export interface RealtimeAuthenticator {
  authenticate(token: string, clientIp?: string): Promise<RealtimeAuthResult>;
}

export interface DatabaseRealtimeAuthenticatorOptions {
  rateLimiter?: RateLimiter;
  validateWithDb?: boolean;
}

export class DatabaseRealtimeAuthenticator implements RealtimeAuthenticator {
  private readonly rateLimiter?: RateLimiter;
  private readonly validateWithDb: boolean;

  constructor(options: DatabaseRealtimeAuthenticatorOptions = {}) {
    this.rateLimiter = options.rateLimiter;
    this.validateWithDb = options.validateWithDb ?? true;
  }

  async authenticate(token: string, clientIp?: string): Promise<RealtimeAuthResult> {
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return { ok: false, error: "Authentication token is required", code: "AUTH_REQUIRED" };
    }

    // Rate-limit check if rate limiter is attached
    if (this.rateLimiter && clientIp) {
      const rateLimitResult = await this.rateLimiter.consume(
        "auth.login",
        `rt_auth:${clientIp}`,
        { cost: 1 }
      );

      if (!rateLimitResult.allowed) {
        return {
          ok: false,
          error: "Authentication rate limit exceeded. Please wait before retrying.",
          code: "RATE_LIMIT_EXCEEDED",
        };
      }
    }

    try {
      const payload: SessionPayload | null = await verifySessionToken(token);
      if (!payload || !payload.userId) {
        return { ok: false, error: "Invalid or expired session token", code: "AUTH_FAILED" };
      }

      if (this.validateWithDb) {
        // Confirm user is active in DB
        const userRows = await db
          .select({ status: users.status, isPlatformAdmin: users.isPlatformAdmin })
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1);

        const user = userRows[0];
        if (!user || user.status !== "ACTIVE") {
          return { ok: false, error: "User is suspended or not found", code: "AUTH_FAILED" };
        }

        // Fetch user's active tenant memberships
        const memberRows = await db
          .select({ tenantId: memberships.tenantId })
          .from(memberships)
          .where(and(eq(memberships.userId, payload.userId), eq(memberships.status, "ACTIVE")));

        const tenantIds = new Set(memberRows.map((r) => r.tenantId));

        return {
          ok: true,
          session: {
            userId: payload.userId,
            email: payload.email,
            name: payload.name,
            isPlatformAdmin: Boolean(user.isPlatformAdmin ?? payload.isPlatformAdmin),
            sessionId: payload.sessionId,
            tenantIds,
          },
        };
      }

      // Offline / Fast validation mode without DB lookups
      return {
        ok: true,
        session: {
          userId: payload.userId,
          email: payload.email,
          name: payload.name,
          isPlatformAdmin: Boolean(payload.isPlatformAdmin),
          sessionId: payload.sessionId,
          tenantIds: new Set<string>(),
        },
      };
    } catch {
      return { ok: false, error: "Token verification failed", code: "AUTH_FAILED" };
    }
  }
}

/**
 * In-memory / Mock authenticator useful for standalone tests and isolated runs.
 */
export class MockRealtimeAuthenticator implements RealtimeAuthenticator {
  private users: Map<string, RealtimeSession> = new Map();
  private rateLimiter?: RateLimiter;

  constructor(rateLimiter?: RateLimiter) {
    this.rateLimiter = rateLimiter;
  }

  registerUser(token: string, session: RealtimeSession): void {
    this.users.set(token, session);
  }

  async authenticate(token: string, clientIp?: string): Promise<RealtimeAuthResult> {
    if (this.rateLimiter && clientIp) {
      const res = await this.rateLimiter.consume(
        "auth.login",
        `rt_auth:${clientIp}`,
        { cost: 1 }
      );
      if (!res.allowed) {
        return {
          ok: false,
          error: "Authentication rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
        };
      }
    }

    const session = this.users.get(token);
    if (!session) {
      return { ok: false, error: "Invalid or expired token", code: "AUTH_FAILED" };
    }

    return { ok: true, session };
  }
}
