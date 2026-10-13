export type MediaLogLevel = "INFO" | "WARN" | "ERROR";

export interface MediaLogger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export class JsonMediaLogger implements MediaLogger {
  private write(
    level: MediaLogLevel,
    message: string,
    fields: Record<string, unknown> = {}
  ): void {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      component: "media-processing-worker",
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

export class SilentMediaLogger implements MediaLogger {
  info(): void {}
  warn(): void {}
  error(): void {}
}
