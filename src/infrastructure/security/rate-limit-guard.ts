import { NextResponse } from "next/server";
import { RedisTokenBucketRateLimiter } from "./redis-token-bucket.rate-limiter";
import type { RateLimiter, RateLimitResult } from "./rate-limiter.interface";

// Global singleton rate limiter for route guards
declare global {
  var __barber_rate_limiter__: RateLimiter | undefined;
}

export function getDefaultRateLimiter(): RateLimiter {
  if (global.__barber_rate_limiter__) {
    return global.__barber_rate_limiter__;
  }
  const limiter = new RedisTokenBucketRateLimiter();
  global.__barber_rate_limiter__ = limiter;
  return limiter;
}

export interface RateLimitGuardResult {
  allowed: boolean;
  result: RateLimitResult;
  response?: NextResponse;
}

export async function checkRateLimit(
  policyName: string,
  identity: string,
  options: {
    cost?: number;
    nowMs?: number;
    limiter?: RateLimiter;
  } = {}
): Promise<RateLimitGuardResult> {
  const limiter = options.limiter || getDefaultRateLimiter();
  const result = await limiter.consume(policyName, identity, {
    cost: options.cost,
    nowMs: options.nowMs,
  });

  if (result.allowed) {
    return { allowed: true, result };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
  const response = NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfterSeconds.toString(),
      },
    }
  );

  return { allowed: false, result, response };
}
