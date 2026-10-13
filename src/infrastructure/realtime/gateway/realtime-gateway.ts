import { WebSocketServer, type WebSocket } from "ws";
import type { IncomingMessage, Server as HttpServer } from "http";
import { RealtimeSocket } from "./realtime-socket";
import type { RealtimeAuthenticator } from "../auth/realtime-authenticator";
import type { TopicAuthorizer } from "../authorization/topic-authorizer";
import { parseClientMessage } from "../protocol/validation";
import {
  RealtimeCloseCodes,
  RealtimeErrorCodes,
  type ServerEventMessage,
  type ServerReadyMessage,
  type ServerSubscribedMessage,
  type ServerUnsubscribedMessage,
  type ServerErrorMessage,
  type ServerPongMessage,
} from "../protocol/types";
import { JsonRealtimeLogger, type RealtimeLogger } from "../telemetry/realtime-logger";
import { RealtimeMetrics } from "../telemetry/realtime-metrics";
import { env } from "@/shared/config/env";

export interface RealtimeGatewayOptions {
  server?: HttpServer;
  port?: number;
  authenticator: RealtimeAuthenticator;
  topicAuthorizer: TopicAuthorizer;
  allowedOrigins?: string[];
  heartbeatIntervalMs?: number;
  heartbeatTimeoutMs?: number;
  authTimeoutMs?: number;
  maxPayloadBytes?: number;
  maxSubscriptionsPerSocket?: number;
  logger?: RealtimeLogger;
  metrics?: RealtimeMetrics;
  onPresenceConnect?: (socket: RealtimeSocket) => Promise<void> | void;
  onPresenceHeartbeat?: (socket: RealtimeSocket) => Promise<void> | void;
  onPresenceDisconnect?: (socket: RealtimeSocket) => Promise<void> | void;
}

export class RealtimeGateway {
  readonly wss: WebSocketServer;
  private readonly authenticator: RealtimeAuthenticator;
  private readonly topicAuthorizer: TopicAuthorizer;
  private readonly allowedOrigins: string[];
  private readonly heartbeatIntervalMs: number;
  private readonly authTimeoutMs: number;
  private readonly maxPayloadBytes: number;
  private readonly maxSubscriptionsPerSocket: number;
  private readonly logger: RealtimeLogger;
  readonly metrics: RealtimeMetrics;

  private readonly onPresenceConnect?: (socket: RealtimeSocket) => Promise<void> | void;
  private readonly onPresenceHeartbeat?: (socket: RealtimeSocket) => Promise<void> | void;
  private readonly onPresenceDisconnect?: (socket: RealtimeSocket) => Promise<void> | void;

  private sockets: Map<string, RealtimeSocket> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isDraining = false;

  constructor(options: RealtimeGatewayOptions) {
    this.authenticator = options.authenticator;
    this.topicAuthorizer = options.topicAuthorizer;
    this.allowedOrigins =
      options.allowedOrigins ??
      (env.REALTIME_ALLOWED_ORIGINS
        ? env.REALTIME_ALLOWED_ORIGINS.split(",").map((o) => o.trim())
        : ["http://localhost:9002", "http://localhost:3000"]);
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? env.REALTIME_HEARTBEAT_INTERVAL_MS;
    this.authTimeoutMs = options.authTimeoutMs ?? env.REALTIME_AUTH_TIMEOUT_MS;
    this.maxPayloadBytes = options.maxPayloadBytes ?? env.REALTIME_MAX_PAYLOAD_BYTES;
    this.maxSubscriptionsPerSocket =
      options.maxSubscriptionsPerSocket ?? env.REALTIME_MAX_SUBSCRIPTIONS_PER_SOCKET;
    this.logger = options.logger ?? new JsonRealtimeLogger();
    this.metrics = options.metrics ?? new RealtimeMetrics();
    this.onPresenceConnect = options.onPresenceConnect;
    this.onPresenceHeartbeat = options.onPresenceHeartbeat;
    this.onPresenceDisconnect = options.onPresenceDisconnect;

    if (options.server) {
      this.wss = new WebSocketServer({
        noServer: true,
        maxPayload: this.maxPayloadBytes,
      });
      this.bindHttpUpgrade(options.server);
    } else {
      this.wss = new WebSocketServer({
        port: options.port ?? env.REALTIME_PORT,
        maxPayload: this.maxPayloadBytes,
        verifyClient: (info, callback) => {
          const originAllowed = this.validateOrigin(info.origin);
          callback(originAllowed, originAllowed ? undefined : 403, "Origin Forbidden");
        },
      });
    }

    this.setupWss();
    this.startHeartbeatMonitor();
  }

  private validateOrigin(origin?: string): boolean {
    if (env.NODE_ENV !== "production") {
      return true; // Allow all origins in test and development
    }
    if (!origin) {
      return false; // Require origin in production
    }
    return this.allowedOrigins.includes(origin);
  }

  private bindHttpUpgrade(server: HttpServer): void {
    server.on("upgrade", (request: IncomingMessage, socket, head) => {
      if (this.isDraining) {
        socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
        socket.destroy();
        return;
      }

      const origin = request.headers.origin as string | undefined;
      if (!this.validateOrigin(origin)) {
        this.logger.warn("realtime_upgrade_rejected_origin", { origin });
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit("connection", ws, request);
      });
    });
  }

  private setupWss(): void {
    this.wss.on("connection", (ws: WebSocket, req?: IncomingMessage) => {
      if (this.isDraining) {
        ws.close(RealtimeCloseCodes.SERVICE_RESTART, "Gateway draining");
        return;
      }

      const clientIp = this.extractClientIp(req);
      const rtSocket = new RealtimeSocket({
        socket: ws,
        clientIp,
        maxSubscriptions: this.maxSubscriptionsPerSocket,
        onSlowConsumer: (s) => {
          this.metrics.slowConsumerDisconnected();
          this.logger.warn("realtime_slow_consumer_disconnected", { socketId: s.id, clientIp });
        },
      });

      this.sockets.set(rtSocket.id, rtSocket);
      this.metrics.connectionOpened();
      this.logger.info("realtime_socket_connected", { socketId: rtSocket.id, clientIp });

      // Start auth timeout
      rtSocket.startAuthTimeout(this.authTimeoutMs, () => {
        if (!rtSocket.isAuthenticated) {
          this.metrics.authFailure();
          this.logger.warn("realtime_socket_auth_timeout", { socketId: rtSocket.id, clientIp });
          rtSocket.close(RealtimeCloseCodes.AUTH_TIMEOUT, "Authentication timeout");
        }
      });

      ws.on("message", async (data, isBinary) => {
        this.metrics.messageReceived();
        await this.handleClientMessage(rtSocket, data, isBinary);
      });

      ws.on("pong", () => {
        rtSocket.touchHeartbeat();
        if (this.onPresenceHeartbeat && rtSocket.isAuthenticated) {
          try {
            this.onPresenceHeartbeat(rtSocket);
          } catch {
            // Ignore presence errors to preserve socket liveness
          }
        }
      });

      ws.on("close", async (code, reason) => {
        await this.handleSocketClose(rtSocket, code, reason.toString());
      });

      ws.on("error", (err) => {
        this.logger.warn("realtime_socket_error", {
          socketId: rtSocket.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    });
  }

  private async handleClientMessage(
    rtSocket: RealtimeSocket,
    data: unknown,
    isBinary: boolean
  ): Promise<void> {
    if (isBinary) {
      const err: ServerErrorMessage = {
        type: "error",
        code: RealtimeErrorCodes.MALFORMED_MESSAGE,
        message: "Binary WebSocket frames are not supported. Use JSON text frames.",
      };
      rtSocket.send(err);
      return;
    }

    const parseResult = parseClientMessage(data, this.maxPayloadBytes);
    if (!parseResult.ok) {
      const err: ServerErrorMessage = {
        type: "error",
        code: parseResult.code,
        message: parseResult.error,
      };
      rtSocket.send(err);
      if (parseResult.closeCode) {
        rtSocket.close(parseResult.closeCode, parseResult.error);
      }
      return;
    }

    const msg = parseResult.message;
    switch (msg.type) {
      case "auth": {
        const authResult = await this.authenticator.authenticate(msg.token, rtSocket.clientIp);
        if (!authResult.ok || !authResult.session) {
          this.metrics.authFailure();
          this.logger.warn("realtime_auth_failed", {
            socketId: rtSocket.id,
            error: authResult.error,
            code: authResult.code,
          });
          const err: ServerErrorMessage = {
            type: "error",
            code: authResult.code || RealtimeErrorCodes.AUTH_FAILED,
            message: authResult.error || "Authentication failed",
          };
          rtSocket.send(err);
          return;
        }

        rtSocket.setSession(authResult.session);
        this.metrics.authSuccess();
        this.logger.info("realtime_auth_success", {
          socketId: rtSocket.id,
          userId: authResult.session.userId,
        });

        if (this.onPresenceConnect) {
          try {
            await this.onPresenceConnect(rtSocket);
          } catch (e) {
            this.logger.warn("realtime_presence_connect_failed", {
              socketId: rtSocket.id,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        const readyMsg: ServerReadyMessage = {
          type: "ready",
          session: {
            userId: authResult.session.userId,
            email: authResult.session.email,
            name: authResult.session.name,
            isPlatformAdmin: authResult.session.isPlatformAdmin,
          },
        };
        rtSocket.send(readyMsg);
        this.metrics.messageSent();
        break;
      }

      case "subscribe": {
        if (!rtSocket.session) {
          const err: ServerErrorMessage = {
            type: "error",
            code: RealtimeErrorCodes.AUTH_REQUIRED,
            message: "Must authenticate before subscribing to topics",
          };
          rtSocket.send(err);
          return;
        }

        const authzResult = await this.topicAuthorizer.authorize(
          rtSocket.session,
          msg.topic
        );

        if (!authzResult.allowed) {
          this.metrics.subscriptionDenied();
          this.logger.warn("realtime_subscription_denied", {
            socketId: rtSocket.id,
            userId: rtSocket.session.userId,
            topic: msg.topic,
            reason: authzResult.reason,
          });
          const err: ServerErrorMessage = {
            type: "error",
            code: authzResult.code || RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
            message: authzResult.reason || "Subscription denied",
          };
          rtSocket.send(err);
          return;
        }

        const added = rtSocket.addSubscription(msg.topic);
        if (!added) {
          const err: ServerErrorMessage = {
            type: "error",
            code: RealtimeErrorCodes.SUBSCRIPTION_LIMIT_EXCEEDED,
            message: `Maximum subscription limit (${this.maxSubscriptionsPerSocket}) reached`,
          };
          rtSocket.send(err);
          return;
        }

        this.metrics.subscriptionAdded();
        const subMsg: ServerSubscribedMessage = {
          type: "subscribed",
          topic: msg.topic,
        };
        rtSocket.send(subMsg);
        this.metrics.messageSent();
        break;
      }

      case "unsubscribe": {
        rtSocket.removeSubscription(msg.topic);
        this.metrics.subscriptionRemoved();
        const unsubMsg: ServerUnsubscribedMessage = {
          type: "unsubscribed",
          topic: msg.topic,
        };
        rtSocket.send(unsubMsg);
        this.metrics.messageSent();
        break;
      }

      case "ping": {
        rtSocket.touchHeartbeat();
        if (this.onPresenceHeartbeat && rtSocket.isAuthenticated) {
          try {
            await this.onPresenceHeartbeat(rtSocket);
          } catch {
            // Non-fatal
          }
        }
        const pongMsg: ServerPongMessage = {
          type: "pong",
          timestamp: msg.timestamp ?? Date.now(),
        };
        rtSocket.send(pongMsg);
        this.metrics.messageSent();
        break;
      }
    }
  }

  private async handleSocketClose(
    rtSocket: RealtimeSocket,
    code: number,
    reason: string
  ): Promise<void> {
    this.sockets.delete(rtSocket.id);
    this.metrics.connectionClosed();

    this.logger.info("realtime_socket_closed", {
      socketId: rtSocket.id,
      code,
      reason,
    });

    if (this.onPresenceDisconnect && rtSocket.isAuthenticated) {
      try {
        await this.onPresenceDisconnect(rtSocket);
      } catch (e) {
        this.logger.warn("realtime_presence_disconnect_failed", {
          socketId: rtSocket.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  /**
   * Delivers an event to all locally connected sockets subscribed to the topic.
   */
  deliverLocal(topic: string, event: ServerEventMessage): number {
    let deliveredCount = 0;
    for (const socket of this.sockets.values()) {
      if (socket.isAuthenticated && socket.hasSubscription(topic)) {
        const sent = socket.send(event);
        if (sent) {
          deliveredCount++;
          this.metrics.messageSent();
        }
      }
    }
    return deliveredCount;
  }

  private startHeartbeatMonitor(): void {
    if (this.heartbeatIntervalMs <= 0) return;

    this.heartbeatInterval = setInterval(() => {
      for (const socket of this.sockets.values()) {
        if (!socket.isAlive) {
          this.metrics.heartbeatTimeout();
          this.logger.warn("realtime_heartbeat_timeout", { socketId: socket.id });
          socket.terminate();
          continue;
        }

        socket.isAlive = false;
        try {
          socket.socket.ping();
        } catch {
          socket.terminate();
        }
      }
    }, this.heartbeatIntervalMs);
  }

  private extractClientIp(req?: IncomingMessage): string {
    if (!req) return "127.0.0.1";
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      const parts = forwarded.split(",").map((p) => p.trim());
      return parts[0] || "127.0.0.1";
    }
    return req.socket?.remoteAddress || "127.0.0.1";
  }

  getActiveSocketCount(): number {
    return this.sockets.size;
  }

  getSocket(id: string): RealtimeSocket | undefined {
    return this.sockets.get(id);
  }

  /**
   * Drains and gracefully shuts down the gateway.
   */
  async close(drainTimeoutMs = 5000): Promise<void> {
    this.isDraining = true;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Notify connected sockets to reconnect elsewhere
    for (const socket of this.sockets.values()) {
      socket.close(RealtimeCloseCodes.SERVICE_RESTART, "Gateway restarting");
    }

    const start = Date.now();
    while (this.sockets.size > 0 && Date.now() - start < drainTimeoutMs) {
      await new Promise((r) => setTimeout(r, 100));
    }

    // Force close any remaining sockets
    for (const socket of this.sockets.values()) {
      socket.terminate();
    }
    this.sockets.clear();

    await new Promise<void>((resolve) => {
      this.wss.close(() => resolve());
    });
  }
}
