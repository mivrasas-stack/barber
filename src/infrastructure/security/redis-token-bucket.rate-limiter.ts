import crypto from "crypto";
import type Redis from "ioredis";
import { env } from "@/shared/config/env";
import { sanitizeAndBoundError } from "../outbox/outbox-sanitizer";
import { getRedisProducerClient } from "../redis/redis-connection-factory";
import { JsonRedisLogger, type RedisLogger } from "../redis/redis-logger";
import type {
  ConsumeOptions,
  RateLimiter,
  RateLimitPolicy,
  RateLimitResult,
} from "./rate-limiter.interface";
import { getRateLimitPolicy } from "./rate-limiter.policies";

const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRatePerSec = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])
local nowMs = tonumber(ARGV[4])

if not nowMs or nowMs == 0 then
  local time = redis.call('TIME')
  nowMs = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
end

local data = redis.call('HMGET', key, 'tokens', 'lastRefillMs')
local tokens = tonumber(data[1])
local lastRefillMs = tonumber(data[2])

if not tokens or not lastRefillMs then
  tokens = capacity
  lastRefillMs = nowMs
else
  local elapsedMs = math.max(0, nowMs - lastRefillMs)
  if elapsedMs > 0 and refillRatePerSec > 0 then
    local tokensToAdd = (elapsedMs / 1000.0) * refillRatePerSec
    tokens = math.min(capacity, tokens + tokensToAdd)
    lastRefillMs = nowMs
  end
end

local allowed = 0
local remaining = 0
local retryAfterMs = 0

if tokens >= cost then
  allowed = 1
  tokens = tokens - cost
  remaining = math.floor(tokens)
  retryAfterMs = 0
else
  allowed = 0
  remaining = math.floor(tokens)
  local deficit = cost - tokens
  if refillRatePerSec > 0 then
    retryAfterMs = math.ceil((deficit / refillRatePerSec) * 1000)
  else
    retryAfterMs = 3600000
  end
end

local ttlSec = 60
if refillRatePerSec > 0 then
  local timeToFullSec = math.ceil(capacity / refillRatePerSec)
  ttlSec = math.max(60, timeToFullSec * 2)
end

redis.call('HMSET', key, 'tokens', tostring(tokens), 'lastRefillMs', tostring(lastRefillMs))
redis.call('EXPIRE', key, ttlSec)

return { allowed, tostring(tokens), tostring(remaining), retryAfterMs, ttlSec }
`;

export interface RedisTokenBucketRateLimiterOptions {
  client?: Redis;
  prefix?: string;
  logger?: RedisLogger;
}

export class RedisTokenBucketRateLimiter implements RateLimiter {
  private readonly client: Redis;
  private readonly prefix: string;
  private readonly logger: RedisLogger;

  constructor(options: RedisTokenBucketRateLimiterOptions = {}) {
    this.client = options.client || getRedisProducerClient();
    this.prefix = options.prefix || env.RATE_LIMIT_PREFIX;
    this.logger = options.logger || new JsonRedisLogger();
  }

  /**
   * Deterministically normalizes and hashes sensitive identifiers with SHA-256,
   * guaranteeing that no raw IPs, emails, or credentials exist in Redis keys.
   */
  static hashIdentity(rawIdentity: string): string {
    const normalized = (rawIdentity || "").trim().toLowerCase();
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  async consume(
    policyInput: string | RateLimitPolicy,
    rawIdentity: string,
    options: ConsumeOptions = {}
  ): Promise<RateLimitResult> {
    const policy: RateLimitPolicy =
      typeof policyInput === "string"
        ? getRateLimitPolicy(policyInput)
        : policyInput;

    const hashedIdentity = RedisTokenBucketRateLimiter.hashIdentity(rawIdentity);
    const key = `${this.prefix}:${policy.name}:${hashedIdentity}`;
    const cost = options.cost ?? policy.cost ?? 1;
    const nowMs = options.nowMs ?? 0;

    try {
      const res = (await this.client.eval(
        TOKEN_BUCKET_LUA,
        1,
        key,
        policy.capacity,
        policy.refillRatePerSec,
        cost,
        nowMs
      )) as [number, string, string, number, number];

      const allowed = res[0] === 1;
      const remaining = parseInt(res[2], 10);
      const retryAfterMs = Number(res[3]);
      const currentNow = nowMs > 0 ? nowMs : Date.now();
      const resetAt = new Date(currentNow + retryAfterMs);

      if (!allowed) {
        this.logger.warn("rate_limit_rejected", {
          policy: policy.name,
          hashedIdentity,
          remaining,
          retryAfterMs,
        });
      }

      return {
        allowed,
        remaining,
        retryAfterMs,
        resetAt,
        degraded: false,
      };
    } catch (err: unknown) {
      const sanitizedError = sanitizeAndBoundError(err);
      this.logger.warn("rate_limit_degraded", {
        policy: policy.name,
        hashedIdentity,
        error: sanitizedError,
        failClosed: policy.failClosed ?? false,
      });

      // Execute policy outage behavior: fail-closed or fail-open
      const failClosed = policy.failClosed ?? false;
      if (failClosed) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: 5000,
          resetAt: new Date(Date.now() + 5000),
          degraded: true,
          error: sanitizedError,
        };
      }

      // Default: Fail-open for business availability
      return {
        allowed: true,
        remaining: 1,
        retryAfterMs: 0,
        resetAt: new Date(),
        degraded: true,
        error: sanitizedError,
      };
    }
  }
}
