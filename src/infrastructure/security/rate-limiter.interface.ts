export interface RateLimitPolicy {
  name: string;
  capacity: number;
  refillRatePerSec: number;
  cost?: number;
  failClosed?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  resetAt: Date;
  degraded: boolean;
  error?: string;
}

export interface ConsumeOptions {
  cost?: number;
  nowMs?: number;
}

export interface RateLimiter {
  consume(
    policy: string | RateLimitPolicy,
    identity: string,
    options?: ConsumeOptions
  ): Promise<RateLimitResult>;
}
