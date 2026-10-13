import type { WebSocket } from "ws";
import crypto from "crypto";
import type { RealtimeSession } from "../auth/realtime-authenticator";
import type { ServerMessage } from "../protocol/types";
import { RealtimeCloseCodes } from "../protocol/types";

export interface RealtimeSocketOptions {
  id?: string;
  socket: WebSocket;
  clientIp?: string;
  maxSubscriptions?: number;
  maxBufferBytes?: number;
  onSlowConsumer?: (socket: RealtimeSocket) => void;
}

export class RealtimeSocket {
  readonly id: string;
  readonly socket: WebSocket;
  readonly clientIp: string;
  readonly connectedAt: Date;
  readonly maxSubscriptions: number;
  readonly maxBufferBytes: number;

  private _session: RealtimeSession | null = null;
  private _subscriptions: Set<string> = new Set();
  private _isAlive = true;
  private _lastHeartbeatAt: Date;
  private _authTimer: NodeJS.Timeout | null = null;
  private _onSlowConsumer?: (socket: RealtimeSocket) => void;

  constructor(options: RealtimeSocketOptions) {
    this.id = options.id || crypto.randomUUID();
    this.socket = options.socket;
    this.clientIp = options.clientIp || "unknown";
    this.connectedAt = new Date();
    this._lastHeartbeatAt = new Date();
    this.maxSubscriptions = options.maxSubscriptions ?? 50;
    this.maxBufferBytes = options.maxBufferBytes ?? 1024 * 1024; // 1 MB
    this._onSlowConsumer = options.onSlowConsumer;
  }

  get session(): RealtimeSession | null {
    return this._session;
  }

  get isAuthenticated(): boolean {
    return this._session !== null;
  }

  get isAlive(): boolean {
    return this._isAlive;
  }

  set isAlive(value: boolean) {
    this._isAlive = value;
  }

  get lastHeartbeatAt(): Date {
    return this._lastHeartbeatAt;
  }

  get subscriptions(): ReadonlySet<string> {
    return this._subscriptions;
  }

  setSession(session: RealtimeSession): void {
    this._session = session;
    this.clearAuthTimeout();
  }

  touchHeartbeat(): void {
    this._isAlive = true;
    this._lastHeartbeatAt = new Date();
  }

  startAuthTimeout(ms: number, onTimeout: () => void): void {
    this.clearAuthTimeout();
    this._authTimer = setTimeout(() => {
      onTimeout();
    }, ms);
  }

  clearAuthTimeout(): void {
    if (this._authTimer) {
      clearTimeout(this._authTimer);
      this._authTimer = null;
    }
  }

  addSubscription(topic: string): boolean {
    if (this._subscriptions.size >= this.maxSubscriptions) {
      return false;
    }
    this._subscriptions.add(topic);
    return true;
  }

  removeSubscription(topic: string): boolean {
    return this._subscriptions.delete(topic);
  }

  hasSubscription(topic: string): boolean {
    return this._subscriptions.has(topic);
  }

  clearSubscriptions(): void {
    this._subscriptions.clear();
  }

  send(message: ServerMessage): boolean {
    if (this.socket.readyState !== 1) { // 1 = OPEN
      return false;
    }

    // Backpressure: slow consumer defense
    if (this.socket.bufferedAmount > this.maxBufferBytes) {
      if (this._onSlowConsumer) {
        this._onSlowConsumer(this);
      }
      this.close(
        RealtimeCloseCodes.POLICY_VIOLATION,
        "Disconnecting slow consumer: buffer threshold exceeded"
      );
      return false;
    }

    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  close(code: number = RealtimeCloseCodes.NORMAL_CLOSURE, reason?: string): void {
    this.clearAuthTimeout();
    if (this.socket.readyState === 1 || this.socket.readyState === 0) {
      try {
        // ws bounds close reason string to 123 bytes UTF-8
        const safeReason = reason ? reason.slice(0, 100) : undefined;
        this.socket.close(code, safeReason);
      } catch {
        this.socket.terminate();
      }
    }
  }

  terminate(): void {
    this.clearAuthTimeout();
    try {
      this.socket.terminate();
    } catch {
      // Ignore
    }
  }
}
