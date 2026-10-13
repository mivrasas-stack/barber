/**
 * Outbox Diagnostics Sanitizer
 *
 * Centralized, deterministic sanitization and bounding for error messages,
 * ensuring no credentials, passwords, Bearer tokens, API keys, or PostgreSQL
 * credentials leak into logs or the database last_error column.
 */

export function sanitizeAndBoundError(error: unknown, maxLength = 4000): string {
  if (!error) return "Unknown error";

  const raw = error instanceof Error ? error.message : String(error);
  if (!raw.trim()) return "Unknown error";

  const sanitized = raw
    .replace(/(bearer\s+)["']?[^\s,;&"']+["']?/gi, "$1[REDACTED]")
    .replace(
      /(["']?(?:api[_-]?key|client[_-]?secret|auth[_-]?token|access[_-]?token|refresh[_-]?token|secret[_-]?key|secret|password|passwd|token)["']?)[=:\s]+["']?[^\s,;&"']+["']?/gi,
      "$1=[REDACTED]"
    )
    .replace(/postgres(?:ql)?:\/\/[^:]+:[^@]+@/gi, "postgresql://[REDACTED]@[REDACTED]/")
    .replace(/redis(?:s)?:\/\/(?:[^:]*:)?([^@]+)@/gi, "redis://[REDACTED]@");

  return sanitized.length <= maxLength ? sanitized : sanitized.slice(0, maxLength);
}
