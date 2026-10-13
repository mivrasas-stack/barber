import { redactSensitiveData } from "../auth/token-redactor";

export interface RealtimeLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export class JsonRealtimeLogger implements RealtimeLogger {
  info(message: string, context?: Record<string, unknown>): void {
    const safeContext = context ? redactSensitiveData(context) : undefined;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        component: "realtime-gateway",
        message,
        ...(safeContext as object),
      })
    );
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const safeContext = context ? redactSensitiveData(context) : undefined;
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "WARN",
        component: "realtime-gateway",
        message,
        ...(safeContext as object),
      })
    );
  }

  error(message: string, context?: Record<string, unknown>): void {
    const safeContext = context ? redactSensitiveData(context) : undefined;
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        component: "realtime-gateway",
        message,
        ...(safeContext as object),
      })
    );
  }
}

export class SilentRealtimeLogger implements RealtimeLogger {
  info(): void {}
  warn(): void {}
  error(): void {}
}
