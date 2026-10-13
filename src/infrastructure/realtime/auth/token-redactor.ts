import crypto from "crypto";

/**
 * Sanitizes and redacts authentication tokens and secrets before logging or emission.
 */
export function redactToken(token?: string | null): string {
  if (!token) return "[EMPTY]";
  if (token.length <= 8) return "[REDACTED]";
  const prefix = token.slice(0, 4);
  const suffix = token.slice(-4);
  const hash = crypto.createHash("sha256").update(token).digest("hex").slice(0, 8);
  return `${prefix}...${suffix}#${hash}`;
}

/**
 * Sanitizes arbitrary log context objects to recursively redact keys containing sensitive words.
 */
export function redactSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes("secret") || lowerKey.includes("password")) {
      result[key] = "[REDACTED]";
    } else if (
      lowerKey.includes("token") ||
      lowerKey.includes("authorization") ||
      lowerKey.includes("cookie")
    ) {
      result[key] = typeof value === "string" ? redactToken(value) : "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactSensitiveData(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}
