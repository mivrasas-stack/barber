import type Redis from "ioredis";
import { getRedisProducerClient } from "@/infrastructure/redis/redis-connection-factory";
import { JsonRealtimeLogger, type RealtimeLogger } from "../telemetry/realtime-logger";
import { env } from "@/shared/config/env";
import type { RealtimeSocket } from "../gateway/realtime-socket";

export interface ConnectionPresence {
  connectionId: string;
  userId: string;
  tenantIds: string[];
  connectedAt: string;
  lastHeartbeatAt: string;
  clientIp: string;
  gatewayId: string;
}

export interface PresenceTracker {
  recordConnect(socket: RealtimeSocket): Promise<void>;
  recordHeartbeat(socket: RealtimeSocket): Promise<void>;
  recordDisconnect(socket: RealtimeSocket): Promise<void>;
  isUserOnline(tenantId: string, userId: string): Promise<boolean>;
  getConnection(connectionId: string): Promise<ConnectionPresence | null>;
  close?(): Promise<void>;
}

export interface RedisPresenceTrackerOptions {
  client?: Redis;
  ttlSeconds?: number;
  gatewayId?: string;
  logger?: RealtimeLogger;
}

export class RedisPresenceTracker implements PresenceTracker {
  private readonly client: Redis;
  private readonly ttlSeconds: number;
  private readonly gatewayId: string;
  private readonly logger: RealtimeLogger;

  constructor(options: RedisPresenceTrackerOptions = {}) {
    this.client = options.client ?? getRedisProducerClient();
    this.ttlSeconds = options.ttlSeconds ?? env.REALTIME_PRESENCE_TTL_SECONDS;
    this.gatewayId = options.gatewayId ?? `gw_${process.pid}_${Math.random().toString(36).substring(2, 7)}`;
    this.logger = options.logger ?? new JsonRealtimeLogger();
  }

  private connKey(connectionId: string): string {
    return `bp:presence:conn:${connectionId}`;
  }

  private userTenantKey(tenantId: string, userId: string): string {
    return `bp:presence:t:${tenantId}:${userId}`;
  }

  async recordConnect(socket: RealtimeSocket): Promise<void> {
    const session = socket.session;
    if (!session) return;

    try {
      const data: ConnectionPresence = {
        connectionId: socket.id,
        userId: session.userId,
        tenantIds: Array.from(session.tenantIds),
        connectedAt: socket.connectedAt.toISOString(),
        lastHeartbeatAt: socket.lastHeartbeatAt.toISOString(),
        clientIp: socket.clientIp,
        gatewayId: this.gatewayId,
      };

      const connKey = this.connKey(socket.id);
      await this.client.set(connKey, JSON.stringify(data), "EX", this.ttlSeconds);

      for (const tenantId of session.tenantIds) {
        const tKey = this.userTenantKey(tenantId, session.userId);
        await this.client.sadd(tKey, socket.id);
        await this.client.expire(tKey, this.ttlSeconds);
      }
    } catch (err: unknown) {
      this.logger.warn("realtime_presence_record_connect_failed", {
        socketId: socket.id,
        userId: session.userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async recordHeartbeat(socket: RealtimeSocket): Promise<void> {
    const session = socket.session;
    if (!session) return;

    try {
      const connKey = this.connKey(socket.id);
      await this.client.expire(connKey, this.ttlSeconds);

      for (const tenantId of session.tenantIds) {
        const tKey = this.userTenantKey(tenantId, session.userId);
        await this.client.expire(tKey, this.ttlSeconds);
      }
    } catch (err: unknown) {
      this.logger.warn("realtime_presence_record_heartbeat_failed", {
        socketId: socket.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async recordDisconnect(socket: RealtimeSocket): Promise<void> {
    const session = socket.session;
    if (!session) return;

    try {
      const connKey = this.connKey(socket.id);
      await this.client.del(connKey);

      for (const tenantId of session.tenantIds) {
        const tKey = this.userTenantKey(tenantId, session.userId);
        await this.client.srem(tKey, socket.id);
      }
    } catch (err: unknown) {
      this.logger.warn("realtime_presence_record_disconnect_failed", {
        socketId: socket.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async isUserOnline(tenantId: string, userId: string): Promise<boolean> {
    try {
      const tKey = this.userTenantKey(tenantId, userId);
      const count = await this.client.scard(tKey);
      return count > 0;
    } catch (err: unknown) {
      this.logger.warn("realtime_presence_is_online_failed", {
        tenantId,
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false; // Degrades safely
    }
  }

  async getConnection(connectionId: string): Promise<ConnectionPresence | null> {
    try {
      const connKey = this.connKey(connectionId);
      const raw = await this.client.get(connKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

/**
 * In-memory MockPresenceTracker for isolated tests
 */
export class MockPresenceTracker implements PresenceTracker {
  private connections: Map<string, ConnectionPresence> = new Map();
  private userTenants: Map<string, Set<string>> = new Map(); // key: `${tenantId}:${userId}` -> Set<connectionId>

  async recordConnect(socket: RealtimeSocket): Promise<void> {
    const session = socket.session;
    if (!session) return;

    const data: ConnectionPresence = {
      connectionId: socket.id,
      userId: session.userId,
      tenantIds: Array.from(session.tenantIds),
      connectedAt: socket.connectedAt.toISOString(),
      lastHeartbeatAt: socket.lastHeartbeatAt.toISOString(),
      clientIp: socket.clientIp,
      gatewayId: "mock_gw",
    };

    this.connections.set(socket.id, data);

    for (const tenantId of session.tenantIds) {
      const key = `${tenantId}:${session.userId}`;
      if (!this.userTenants.has(key)) {
        this.userTenants.set(key, new Set());
      }
      this.userTenants.get(key)!.add(socket.id);
    }
  }

  async recordHeartbeat(socket: RealtimeSocket): Promise<void> {
    const existing = this.connections.get(socket.id);
    if (existing) {
      existing.lastHeartbeatAt = new Date().toISOString();
    }
  }

  async recordDisconnect(socket: RealtimeSocket): Promise<void> {
    const existing = this.connections.get(socket.id);
    if (!existing) return;

    this.connections.delete(socket.id);

    for (const tenantId of existing.tenantIds) {
      const key = `${tenantId}:${existing.userId}`;
      const set = this.userTenants.get(key);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          this.userTenants.delete(key);
        }
      }
    }
  }

  async isUserOnline(tenantId: string, userId: string): Promise<boolean> {
    const key = `${tenantId}:${userId}`;
    const set = this.userTenants.get(key);
    return Boolean(set && set.size > 0);
  }

  async getConnection(connectionId: string): Promise<ConnectionPresence | null> {
    return this.connections.get(connectionId) || null;
  }
}
