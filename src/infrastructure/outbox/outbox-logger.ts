export type OutboxLogLevel = "INFO" | "WARN" | "ERROR";

export interface OutboxLogger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export class JsonOutboxLogger implements OutboxLogger {
  private write(
    level: OutboxLogLevel,
    message: string,
    fields: Record<string, unknown> = {}
  ): void {
    const record = {
      timestamp: new Date().toISOString(),
      level,
      component: "outbox-worker",
      message,
      ...fields,
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

export class SilentOutboxLogger implements OutboxLogger {
  info(): void {}
  warn(): void {}
  error(): void {}
}
