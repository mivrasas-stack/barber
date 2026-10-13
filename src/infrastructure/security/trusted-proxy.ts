import { env } from "@/shared/config/env";

export interface TrustedProxyOptions {
  trustedProxyCount?: number;
}

/**
 * Safely extracts client IP address accounting for trusted reverse proxy depth,
 * preventing spoofed X-Forwarded-For headers from bypassing IP-based rate limiting.
 */
export function extractClientIp(
  request:
    | Request
    | {
        headers:
          | Headers
          | Record<string, string | string[] | undefined>
          | { get(name: string): string | null };
      },
  options: TrustedProxyOptions = {}
): string {
  const trustedProxyCount =
    options.trustedProxyCount !== undefined
      ? options.trustedProxyCount
      : env.TRUSTED_PROXY_COUNT;

  let xForwardedFor: string | null = null;
  let xRealIp: string | null = null;

  if ("headers" in request) {
    const h = request.headers;
    if (typeof (h as any).get === "function") {
      xForwardedFor = (h as any).get("x-forwarded-for");
      xRealIp = (h as any).get("x-real-ip");
    } else {
      const raw = h as Record<string, string | string[] | undefined>;
      const xffVal = raw["x-forwarded-for"] || raw["X-Forwarded-For"];
      xForwardedFor = Array.isArray(xffVal) ? xffVal.join(",") : xffVal || null;
      const xriVal = raw["x-real-ip"] || raw["X-Real-IP"];
      xRealIp = Array.isArray(xriVal) ? xriVal[0] : xriVal || null;
    }
  }

  // If no trusted proxy is configured, headers from the network cannot be trusted
  if (trustedProxyCount <= 0) {
    return "127.0.0.1";
  }

  if (xForwardedFor && xForwardedFor.trim().length > 0) {
    const ips = xForwardedFor
      .split(",")
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0);

    if (ips.length > 0) {
      // The client IP sits immediately before the trusted proxy hops
      const targetIndex = Math.max(0, ips.length - trustedProxyCount);
      return ips[targetIndex] || "127.0.0.1";
    }
  }

  if (xRealIp && xRealIp.trim().length > 0) {
    return xRealIp.trim();
  }

  return "127.0.0.1";
}
