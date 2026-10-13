import { sanitizeAndBoundError } from "../outbox/outbox-sanitizer";

export type RedisLogLevel = "INFO" | "WARN" | "ERROR";

export interface RedisLogger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export class JsonRedisLogger implements RedisLogger {
  private write(
    level: RedisLogLevel,
    message: string,
    fields: Record<string, unknown> = {}
  ): void {
    // Sanitize any error fields or strings to prevent credential leakage
    const sanitizedFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === "string") {
        sanitizedFields[key] = sanitizeAndBoundError(value);
      } else if (value instanceof Error) {
        sanitizedFields[key] = sanitizeAndBoundError(value.message);
      } else {
        sanitizedFields[key] = value;
      }
    }

    const record = {
      timestamp: new Date().toISOString(),
      level,
      component: "redis-infrastructure",
      message,
      ...sanitizedFields,
    };

    const line = JSON.stringify(record);
    if (level === "ERROR") {
      console.error(line);
    } else if (level === "WARN") {
      console.warn(line);
    } else {
      console.info(line);
    }
  }

  info(message: string, fields?: Record<string, unknown>): void {
    this.write("INFO", message, fields);
  }

  warn(message: string, fields?: Record<string, unknown>): void {
    this.write("WARN", message, fields);
  }

  error(message: string, fields?: Record<string, unknown>): void {
    this.write("ERROR", message, fields);
  }
}

export class SilentRedisLogger implements RedisLogger {
  info(): void {}
  warn(): void {}
  error(): void {}
}
