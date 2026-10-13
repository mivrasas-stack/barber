import { env } from "@/shared/config/env";
import type { RateLimitPolicy } from "./rate-limiter.interface";

export const DEFAULT_RATE_LIMIT_POLICIES: Record<string, RateLimitPolicy> = {
  "customer.qr.register": {
    name: "customer.qr.register",
    capacity: 5,
    refillRatePerSec: 0.01,
    cost: 1,
    failClosed: true,
  },
  "auth.login": {
    name: "auth.login",
    capacity: 5,
    refillRatePerSec: 0.2, // 1 token every 5 seconds
    cost: 1,
    failClosed: env.RATE_LIMIT_FAIL_CLOSED,
  },
  "appointment.create": {
    name: "appointment.create",
    capacity: 10,
    refillRatePerSec: 1.0, // 1 token per second
    cost: 1,
    failClosed: false, // Fail open to preserve business availability
  },
  "pos.checkout": {
    name: "pos.checkout",
    capacity: 20,
    refillRatePerSec: 5.0, // 5 tokens per second
    cost: 1,
    failClosed: false, // In-store POS transactions fail open with degraded telemetry
  },
  "payment.intent": {
    name: "payment.intent",
    capacity: 10,
    refillRatePerSec: 1.0, // 1 token per second
    cost: 1,
    failClosed: false, // Fail open; PostgreSQL idempotency prevents duplicate intents
  },
  "admin.billing.run": {
    name: "admin.billing.run",
    capacity: 2,
    refillRatePerSec: 0.033, // 1 token per 30 seconds
    cost: 1,
    failClosed: false,
  },
};

const policyRegistry = new Map<string, RateLimitPolicy>(
  Object.entries(DEFAULT_RATE_LIMIT_POLICIES)
);

export function getRateLimitPolicy(name: string): RateLimitPolicy {
  const policy = policyRegistry.get(name);
  if (!policy) {
    throw new Error(`Rate limit policy "${name}" not found in registry`);
  }
  return policy;
}

export function registerRateLimitPolicy(policy: RateLimitPolicy): void {
  policyRegistry.set(policy.name, policy);
}
