export type NotificationLogLevel = "INFO" | "WARN" | "ERROR";

export interface NotificationLogger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export class JsonNotificationLogger implements NotificationLogger {
  private write(
    level: NotificationLogLevel,
    message: string,
    fields: Record<string, unknown> = {}
  ): void {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      component: "notification-worker",
      message,
      ...fields,
    });

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

export class SilentNotificationLogger implements NotificationLogger {
  info(): void {}
  warn(): void {}
  error(): void {}
}
