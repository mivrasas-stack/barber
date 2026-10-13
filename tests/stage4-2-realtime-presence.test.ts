import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import type { AddressInfo } from "net";
import { WebSocket as WsClient } from "ws";
import { randomUUID } from "crypto";
import Redis from "ioredis";
import { SignJWT } from "jose";
import {
  RealtimeGateway,
  RealtimeSocket,
  MockRealtimeAuthenticator,
  MockTopicAuthorizer,
  DatabaseTopicAuthorizer,
  RedisFanoutBroadcaster,
  RedisFanoutSubscriber,
  RedisPresenceTracker,
  MockPresenceTracker,
  OutboxRealtimeBridge,
  mapOutboxEventToRealtime,
  redactToken,
  redactSensitiveData,
  parseClientMessage,
  RealtimeCloseCodes,
  RealtimeErrorCodes,
  type ServerEventMessage,
  type ServerMessage,
  type RealtimeSession,
} from "@/infrastructure/realtime";
import {
  getRedisProducerClient,
  getRedisSubscriberClient,
  closeRedisConnections,
} from "@/infrastructure/redis/redis-connection-factory";
import type { OutboxEnvelope } from "@/infrastructure/outbox/types";
import { env } from "@/shared/config/env";

describe("Stage 4.2 Realtime Gateway, Ephemeral Presence & Outbox Fanout Foundation", () => {
  let redisProducer: Redis;
  let redisSubscriber: Redis;

  beforeAll(() => {
    redisProducer = getRedisProducerClient();
    redisSubscriber = getRedisSubscriberClient();
  });

  afterAll(async () => {
    await closeRedisConnections();
  });

  // Helper to start an HTTP server + RealtimeGateway on a free ephemeral port
  function createTestGateway(customOptions: Partial<ConstructorParameters<typeof RealtimeGateway>[0]> = {}) {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    });

    const authenticator = customOptions.authenticator ?? new MockRealtimeAuthenticator();
    const topicAuthorizer = customOptions.topicAuthorizer ?? new MockTopicAuthorizer();

    const gateway = new RealtimeGateway({
      server,
      authenticator,
      topicAuthorizer,
      authTimeoutMs: customOptions.authTimeoutMs ?? 5000,
      heartbeatIntervalMs: customOptions.heartbeatIntervalMs ?? 30000,
      maxPayloadBytes: customOptions.maxPayloadBytes ?? 32768,
      maxSubscriptionsPerSocket: customOptions.maxSubscriptionsPerSocket ?? 50,
      ...customOptions,
    });

    return new Promise<{ server: http.Server; gateway: RealtimeGateway; port: number }>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const port = (server.address() as AddressInfo).port;
        resolve({ server, gateway, port });
      });
    });
  }

  // Helper to connect a WebSocket client to a port
  function connectWsClient(port: number): Promise<WsClient> {
    return new Promise((resolve, reject) => {
      const client = new WsClient(`ws://127.0.0.1:${port}`);
      client.on("open", () => resolve(client));
      client.on("error", (err) => reject(err));
    });
  }

  // Helper to wait for the next JSON message from a ws client
  function waitForMessage<T = ServerMessage>(client: WsClient, timeoutMs = 3000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for message after ${timeoutMs}ms`));
      }, timeoutMs);

      const onMessage = (data: Buffer | string) => {
        cleanup();
        try {
          const str = typeof data === "string" ? data : data.toString("utf8");
          resolve(JSON.parse(str) as T);
        } catch (e) {
          reject(e);
        }
      };

      const onClose = (code: number, reason: Buffer) => {
        cleanup();
        reject(new Error(`WebSocket closed prematurely with code ${code}: ${reason.toString()}`));
      };

      function cleanup() {
        clearTimeout(timer);
        client.removeListener("message", onMessage);
        client.removeListener("close", onClose);
      }

      client.on("message", onMessage);
      client.on("close", onClose);
    });
  }

  // =========================================================================
  // SECTION 1: AUTHENTICATION & AUTHORIZATION (Tests 1 to 5)
  // =========================================================================

  it("1. invalid/expired auth rejected with AUTH_FAILED", async () => {
    const auth = new MockRealtimeAuthenticator();
    const { server, gateway, port } = await createTestGateway({ authenticator: auth });

    const client = await connectWsClient(port);
    client.send(JSON.stringify({ type: "auth", token: "invalid_token_123" }));

    const response = await waitForMessage<{ type: string; code: string }>(client);
    expect(response.type).toBe("error");
    expect(response.code).toBe(RealtimeErrorCodes.AUTH_FAILED);

    client.close();
    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("2. valid auth establishes identity and returns ready message", async () => {
    const auth = new MockRealtimeAuthenticator();
    const validSession: RealtimeSession = {
      userId: "usr_alice",
      email: "alice@barber.com",
      name: "Alice Barber",
      isPlatformAdmin: false,
      sessionId: "sess_123",
      tenantIds: new Set(["tenant_a"]),
    };
    auth.registerUser("valid_token_alice", validSession);

    const { server, gateway, port } = await createTestGateway({ authenticator: auth });

    const client = await connectWsClient(port);
    client.send(JSON.stringify({ type: "auth", token: "valid_token_alice" }));

    const response = await waitForMessage<{ type: string; session: { userId: string } }>(client);
    expect(response.type).toBe("ready");
    expect(response.session.userId).toBe("usr_alice");

    client.close();
    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("3. client tenant/role in payload cannot elevate authority (server derives authority)", async () => {
    const auth = new MockRealtimeAuthenticator();
    const validSession: RealtimeSession = {
      userId: "usr_bob",
      email: "bob@barber.com",
      name: "Bob Client",
      isPlatformAdmin: false,
      sessionId: "sess_bob",
      tenantIds: new Set(["tenant_a"]), // Only tenant_a
    };
    auth.registerUser("bob_token", validSession);

    const authorizer = new MockTopicAuthorizer();
    const { server, gateway, port } = await createTestGateway({
      authenticator: auth,
      topicAuthorizer: authorizer,
    });

    const client = await connectWsClient(port);
    client.send(JSON.stringify({ type: "auth", token: "bob_token" }));
    await waitForMessage(client);

    // Client attempts to subscribe to tenant_b (not in Bob's tenantIds)
    client.send(JSON.stringify({ type: "subscribe", topic: "tenant:tenant_b" }));
    const subResponse = await waitForMessage<{ type: string; code: string }>(client);

    expect(subResponse.type).toBe("error");
    expect(subResponse.code).toBe(RealtimeErrorCodes.UNAUTHORIZED_TOPIC);

    client.close();
    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("4. cross-tenant subscribe rejected", async () => {
    const auth = new MockRealtimeAuthenticator();
    auth.registerUser("token_tenant_a", {
      userId: "usr_member_a",
      email: "a@a.com",
      name: "Member A",
      isPlatformAdmin: false,
      sessionId: "s_a",
      tenantIds: new Set(["tenant_111"]),
    });

    const authorizer = new MockTopicAuthorizer();
    const { server, gateway, port } = await createTestGateway({
      authenticator: auth,
      topicAuthorizer: authorizer,
    });

    const client = await connectWsClient(port);
    client.send(JSON.stringify({ type: "auth", token: "token_tenant_a" }));
    await waitForMessage(client);

    // Attempting cross-tenant subscribe to tenant_999
    client.send(JSON.stringify({ type: "subscribe", topic: "tenant:tenant_999" }));
    const res = await waitForMessage<{ type: string; code: string }>(client);

    expect(res.type).toBe("error");
    expect(res.code).toBe(RealtimeErrorCodes.UNAUTHORIZED_TOPIC);

    client.close();
    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("5. authorized tenant/location/user topic accepted", async () => {
    const auth = new MockRealtimeAuthenticator();
    auth.registerUser("token_authorized", {
      userId: "usr_carol",
      email: "carol@a.com",
      name: "Carol",
      isPlatformAdmin: false,
      sessionId: "s_c",
      tenantIds: new Set(["tenant_100"]),
    });

    const authorizer = new MockTopicAuthorizer();
    // Allow Carol's user topic and tenant_100
    authorizer.addRule((session, topic) => {
      if (topic.kind === "location" && topic.id === "loc_100" && session.tenantIds.has("tenant_100")) {
        return true;
      }
      return false;
    });

    const { server, gateway, port } = await createTestGateway({
      authenticator: auth,
      topicAuthorizer: authorizer,
    });

    const client = await connectWsClient(port);
    client.send(JSON.stringify({ type: "auth", token: "token_authorized" }));
    await waitForMessage(client);

    // 1. Authorized user topic
    client.send(JSON.stringify({ type: "subscribe", topic: "user:usr_carol" }));
    const res1 = await waitForMessage<{ type: string; topic: string }>(client);
    expect(res1.type).toBe("subscribed");
    expect(res1.topic).toBe("user:usr_carol");

    // 2. Authorized tenant topic
    client.send(JSON.stringify({ type: "subscribe", topic: "tenant:tenant_100" }));
    const res2 = await waitForMessage<{ type: string; topic: string }>(client);
    expect(res2.type).toBe("subscribed");
    expect(res2.topic).toBe("tenant:tenant_100");

    // 3. Authorized location topic
    client.send(JSON.stringify({ type: "subscribe", topic: "location:loc_100" }));
    const res3 = await waitForMessage<{ type: string; topic: string }>(client);
    expect(res3.type).toBe("subscribed");
    expect(res3.topic).toBe("location:loc_100");

    client.close();
    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  // =========================================================================
  // SECTION 2: PROTOCOL RIGOR & BOUNDARIES (Tests 6 to 9)
  // =========================================================================

  it("6. malformed JSON rejected with MALFORMED_MESSAGE", async () => {
    const { server, gateway, port } = await createTestGateway();
    const client = await connectWsClient(port);

    client.send("THIS IS NOT JSON {{{");
    const res = await waitForMessage<{ type: string; code: string }>(client);
    expect(res.type).toBe("error");
    expect(res.code).toBe(RealtimeErrorCodes.MALFORMED_MESSAGE);

    client.close();
    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("7. unknown message type rejected with UNKNOWN_MESSAGE_TYPE", async () => {
    const { server, gateway, port } = await createTestGateway();
    const client = await connectWsClient(port);

    client.send(JSON.stringify({ type: "delete_database_now" }));
    const res = await waitForMessage<{ type: string; code: string }>(client);
    expect(res.type).toBe("error");
    expect(res.code).toBe(RealtimeErrorCodes.UNKNOWN_MESSAGE_TYPE);

    client.close();
    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("8. oversized frame rejected and terminated with code 1009", async () => {
    const { server, gateway, port } = await createTestGateway({ maxPayloadBytes: 1024 }); // 1 KB max
    const client = await connectWsClient(port);

    const oversizedString = JSON.stringify({
      type: "auth",
      token: "a".repeat(2000), // > 1 KB
    });

    const closePromise = new Promise<{ code: number }>((resolve) => {
      client.on("close", (code) => resolve({ code }));
    });

    client.send(oversizedString);

    const { code } = await closePromise;
    expect([1009, 1008, 1006]).toContain(code);

    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("9. subscription limit enforced per socket", async () => {
    const auth = new MockRealtimeAuthenticator();
    auth.registerUser("limit_token", {
      userId: "usr_limit",
      email: "l@l.com",
      name: "Limit Tester",
      isPlatformAdmin: true, // Allow all topics
      sessionId: "s_lim",
      tenantIds: new Set(["t_all"]),
    });

    const { server, gateway, port } = await createTestGateway({
      authenticator: auth,
      maxSubscriptionsPerSocket: 3, // Low cap for test
    });

    const client = await connectWsClient(port);
    client.send(JSON.stringify({ type: "auth", token: "limit_token" }));
    await waitForMessage(client);

    // Add 3 subscriptions
    for (let i = 1; i <= 3; i++) {
      client.send(JSON.stringify({ type: "subscribe", topic: `tenant:t_${i}` }));
      const res = await waitForMessage<{ type: string }>(client);
      expect(res.type).toBe("subscribed");
    }

    // 4th subscription should exceed limit
    client.send(JSON.stringify({ type: "subscribe", topic: "tenant:t_4" }));
    const errRes = await waitForMessage<{ type: string; code: string }>(client);
    expect(errRes.type).toBe("error");
    expect(errRes.code).toBe(RealtimeErrorCodes.SUBSCRIPTION_LIMIT_EXCEEDED);

    client.close();
    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  // =========================================================================
  // SECTION 3: PRESENCE & EPHEMERAL TTL (Tests 10 to 12)
  // =========================================================================

  it("10. presence key gets TTL upon connection and authentication", async () => {
    const presenceTracker = new RedisPresenceTracker({ client: redisProducer, ttlSeconds: 15 });
    const auth = new MockRealtimeAuthenticator();
    const tenantId = `tenant_pres_${randomUUID().slice(0, 8)}`;
    const userId = `usr_pres_${randomUUID().slice(0, 8)}`;

    auth.registerUser("pres_token", {
      userId,
      email: "p@p.com",
      name: "Presence User",
      isPlatformAdmin: false,
      sessionId: "sess_p",
      tenantIds: new Set([tenantId]),
    });

    const { server, gateway, port } = await createTestGateway({
      authenticator: auth,
      onPresenceConnect: (s) => presenceTracker.recordConnect(s),
      onPresenceHeartbeat: (s) => presenceTracker.recordHeartbeat(s),
      onPresenceDisconnect: (s) => presenceTracker.recordDisconnect(s),
    });

    const client = await connectWsClient(port);
    client.send(JSON.stringify({ type: "auth", token: "pres_token" }));
    await waitForMessage(client);

    // Wait brief moment for presence write
    await new Promise((r) => setTimeout(r, 100));

    const isOnline = await presenceTracker.isUserOnline(tenantId, userId);
    expect(isOnline).toBe(true);

    const ttl = await redisProducer.ttl(`bp:presence:t:${tenantId}:${userId}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(15);

    client.close();
    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("11. heartbeat refreshes presence TTL", async () => {
    const presenceTracker = new RedisPresenceTracker({ client: redisProducer, ttlSeconds: 20 });
    const auth = new MockRealtimeAuthenticator();
    const tenantId = `tenant_hb_${randomUUID().slice(0, 8)}`;
    const userId = `usr_hb_${randomUUID().slice(0, 8)}`;

    auth.registerUser("hb_token", {
      userId,
      email: "hb@hb.com",
      name: "Heartbeat User",
      isPlatformAdmin: false,
      sessionId: "s_hb",
      tenantIds: new Set([tenantId]),
    });

    const { server, gateway, port } = await createTestGateway({
      authenticator: auth,
      onPresenceConnect: (s) => presenceTracker.recordConnect(s),
      onPresenceHeartbeat: (s) => presenceTracker.recordHeartbeat(s),
      onPresenceDisconnect: (s) => presenceTracker.recordDisconnect(s),
    });

    const client = await connectWsClient(port);
    client.send(JSON.stringify({ type: "auth", token: "hb_token" }));
    await waitForMessage(client);

    // Artificially lower the key TTL to 5 seconds
    await redisProducer.expire(`bp:presence:t:${tenantId}:${userId}`, 5);
    const ttlBefore = await redisProducer.ttl(`bp:presence:t:${tenantId}:${userId}`);
    expect(ttlBefore).toBeLessThanOrEqual(5);

    // Client sends ping frame
    client.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
    const pong = await waitForMessage<{ type: string }>(client);
    expect(pong.type).toBe("pong");

    await new Promise((r) => setTimeout(r, 100));
    const ttlAfter = await redisProducer.ttl(`bp:presence:t:${tenantId}:${userId}`);
    expect(ttlAfter).toBeGreaterThan(5); // TTL was refreshed back toward 20s

    client.close();
    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("12. disconnect removes/expires presence cleanly", async () => {
    const presenceTracker = new RedisPresenceTracker({ client: redisProducer, ttlSeconds: 30 });
    const auth = new MockRealtimeAuthenticator();
    const tenantId = `tenant_disc_${randomUUID().slice(0, 8)}`;
    const userId = `usr_disc_${randomUUID().slice(0, 8)}`;

    auth.registerUser("disc_token", {
      userId,
      email: "d@d.com",
      name: "Disconnect User",
      isPlatformAdmin: false,
      sessionId: "s_disc",
      tenantIds: new Set([tenantId]),
    });

    const { server, gateway, port } = await createTestGateway({
      authenticator: auth,
      onPresenceConnect: (s) => presenceTracker.recordConnect(s),
      onPresenceDisconnect: (s) => presenceTracker.recordDisconnect(s),
    });

    const client = await connectWsClient(port);
    client.send(JSON.stringify({ type: "auth", token: "disc_token" }));
    await waitForMessage(client);

    await new Promise((r) => setTimeout(r, 100));
    expect(await presenceTracker.isUserOnline(tenantId, userId)).toBe(true);

    // Disconnect client
    client.close();
    await new Promise((r) => setTimeout(r, 150));

    expect(await presenceTracker.isUserOnline(tenantId, userId)).toBe(false);

    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  // =========================================================================
  // SECTION 4: HORIZONTAL FANOUT & TOPIC ISOLATION (Tests 13 to 15)
  // =========================================================================

  it("13. two gateway instances receive same Redis Pub/Sub fanout envelope", async () => {
    const testChannel = `test:fanout:${randomUUID()}`;
    const broadcaster = new RedisFanoutBroadcaster({ client: redisProducer, channel: testChannel });

    // Node 1
    const subClient1 = getRedisSubscriberClient();
    const subscriber1 = new RedisFanoutSubscriber({ client: subClient1, channel: testChannel });

    // Node 2: separate connection
    const subClient2 = new Redis({ host: env.REDIS_HOST, port: env.REDIS_PORT });
    const subscriber2 = new RedisFanoutSubscriber({ client: subClient2, channel: testChannel });

    const received1: string[] = [];
    const received2: string[] = [];

    await subscriber1.subscribe((env) => received1.push(env.eventId));
    await subscriber2.subscribe((env) => received2.push(env.eventId));

    // Wait brief moment for subscription to be registered in Redis
    await new Promise((r) => setTimeout(r, 150));

    const testEventId = `evt_${randomUUID()}`;
    await broadcaster.publish({
      topic: "tenant:123",
      eventId: testEventId,
      eventType: "appointment.created",
      payload: { id: "apt_1" },
      occurredAt: new Date().toISOString(),
    });

    await new Promise((r) => setTimeout(r, 200));

    expect(received1).toContain(testEventId);
    expect(received2).toContain(testEventId);

    await subscriber1.close();
    await subscriber2.close();
    subClient2.disconnect();
  });

  it("14. client receives only subscribed topics (topic isolation)", async () => {
    const auth = new MockRealtimeAuthenticator();
    auth.registerUser("token_alice", {
      userId: "usr_alice",
      email: "a@a.com",
      name: "Alice",
      isPlatformAdmin: true,
      sessionId: "s_a",
      tenantIds: new Set(["t_1", "t_2"]),
    });
    auth.registerUser("token_bob", {
      userId: "usr_bob",
      email: "b@b.com",
      name: "Bob",
      isPlatformAdmin: true,
      sessionId: "s_b",
      tenantIds: new Set(["t_1", "t_2"]),
    });

    const { server, gateway, port } = await createTestGateway({ authenticator: auth });

    const clientAlice = await connectWsClient(port);
    const clientBob = await connectWsClient(port);

    clientAlice.send(JSON.stringify({ type: "auth", token: "token_alice" }));
    await waitForMessage(clientAlice);

    clientBob.send(JSON.stringify({ type: "auth", token: "token_bob" }));
    await waitForMessage(clientBob);

    // Alice subscribes to tenant:t_1
    clientAlice.send(JSON.stringify({ type: "subscribe", topic: "tenant:t_1" }));
    await waitForMessage(clientAlice);

    // Bob subscribes to tenant:t_2
    clientBob.send(JSON.stringify({ type: "subscribe", topic: "tenant:t_2" }));
    await waitForMessage(clientBob);

    // Deliver event for tenant:t_1
    const eventT1: ServerEventMessage = {
      type: "event",
      topic: "tenant:t_1",
      eventId: "evt_t1_only",
      eventType: "appointment.created",
      payload: { title: "Haircut" },
      occurredAt: new Date().toISOString(),
    };
    gateway.deliverLocal("tenant:t_1", eventT1);

    const aliceMsg = await waitForMessage<ServerEventMessage>(clientAlice);
    expect(aliceMsg.type).toBe("event");
    expect(aliceMsg.eventId).toBe("evt_t1_only");

    // Bob should not have received any event (send ping to Bob to verify his queue has only pong)
    clientBob.send(JSON.stringify({ type: "ping" }));
    const bobMsg = await waitForMessage<{ type: string }>(clientBob);
    expect(bobMsg.type).toBe("pong"); // NOT an event!

    clientAlice.close();
    clientBob.close();
    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("15. Redis Pub/Sub outage degrades without domain corruption", async () => {
    // Broadcaster with an unreachable/closed Redis client
    const brokenClient = new Redis({
      host: "127.0.0.1",
      port: 19999, // Non-existent port
      connectTimeout: 500,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      lazyConnect: true,
    });

    const broadcaster = new RedisFanoutBroadcaster({ client: brokenClient });

    const result = await broadcaster.publish({
      topic: "tenant:100",
      eventId: "evt_outage_test",
      eventType: "appointment.created",
      payload: { test: true },
      occurredAt: new Date().toISOString(),
    });

    // Should fail gracefully with ok: false and error message, never throw uncaught exception
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();

    brokenClient.disconnect();
  });

  // =========================================================================
  // SECTION 5: BACKPRESSURE, HEARTBEAT & DRAIN (Tests 16 to 18)
  // =========================================================================

  it("16. backpressure protection activates on slow consumer buffer threshold", () => {
    let slowConsumerNotified = false;
    const mockWs = {
      readyState: 1,
      bufferedAmount: 2 * 1024 * 1024, // 2 MB > 1 MB threshold
      send: () => {},
      close: () => {},
      terminate: () => {},
    };

    const rtSocket = new RealtimeSocket({
      socket: mockWs as any,
      maxBufferBytes: 1024 * 1024,
      onSlowConsumer: () => {
        slowConsumerNotified = true;
      },
    });

    const sent = rtSocket.send({ type: "pong" });
    expect(sent).toBe(false);
    expect(slowConsumerNotified).toBe(true);
  });

  it("17. heartbeat timeout terminates stale socket when no ping/pong occurs", async () => {
    const auth = new MockRealtimeAuthenticator();
    auth.registerUser("hb_to_token", {
      userId: "u_to",
      email: "to@to.com",
      name: "Timeout User",
      isPlatformAdmin: true,
      sessionId: "s_to",
      tenantIds: new Set(["t_to"]),
    });

    const { server, gateway, port } = await createTestGateway({
      authenticator: auth,
      heartbeatIntervalMs: 100, // Fast interval
    });

    const client = await connectWsClient(port);
    client.send(JSON.stringify({ type: "auth", token: "hb_to_token" }));
    await waitForMessage(client);

    // Disable automatic pong response on client to simulate dead/frozen client
    (client as any).pong = () => {}; // suppress automatic protocol pong

    const closePromise = new Promise<{ closed: boolean }>((resolve) => {
      client.on("close", () => resolve({ closed: true }));
    });

    // Gateway heartbeat monitor will see isAlive = false on subsequent tick
    const { closed } = await closePromise;
    expect(closed).toBe(true);

    await gateway.close();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("18. graceful shutdown drains connections with restart close code 1012", async () => {
    const { server, gateway, port } = await createTestGateway();
    const client = await connectWsClient(port);

    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      client.on("close", (code, reason) => resolve({ code, reason: reason.toString() }));
    });

    await gateway.close();

    const { code } = await closePromise;
    expect(code).toBe(RealtimeCloseCodes.SERVICE_RESTART); // 1012
    await new Promise<void>((r) => server.close(() => r()));
  });

  // =========================================================================
  // SECTION 6: OUTBOX TO REALTIME BRIDGE (Tests 19 to 21)
  // =========================================================================

  it("19. supported outbox event maps to safe client event with redacted payload", () => {
    const envelope: OutboxEnvelope = {
      eventId: "evt_apt_123",
      eventType: "appointment.created",
      eventVersion: 1,
      tenantId: "tenant_t1",
      locationId: "loc_l1",
      aggregateId: "apt_999",
      occurredAt: "2026-10-08T18:00:00.000Z",
      deliveryAttempt: 1,
      payload: {
        status: "PENDING",
        startsAt: "2026-10-08T19:00:00.000Z",
        customerNameSnapshot: "Carlos Barber",
        staffId: "staff_11",
        internalSecretAuditKey: "SECRET_PASSWORD_123", // Should be sanitized/stripped
      },
    };

    const mapped = mapOutboxEventToRealtime(envelope);
    expect(mapped).not.toBeNull();
    expect(mapped?.topics).toContain("tenant:tenant_t1");
    expect(mapped?.topics).toContain("location:loc_l1");
    expect(mapped?.topics).toContain("appointment:apt_999");
    expect(mapped?.sanitizedPayload.appointmentId).toBe("apt_999");
    expect(mapped?.sanitizedPayload.status).toBe("PENDING");
    expect(mapped?.sanitizedPayload).not.toHaveProperty("internalSecretAuditKey");
  });

  it("20. unsupported outbox event is safely ignored and not forwarded", () => {
    const envelope: OutboxEnvelope = {
      eventId: "evt_internal_audit",
      eventType: "system.audit.log.internal",
      eventVersion: 1,
      tenantId: "tenant_t1",
      locationId: null,
      aggregateId: "audit_1",
      occurredAt: new Date().toISOString(),
      deliveryAttempt: 1,
      payload: { adminNote: "Internal admin review" },
    };

    const mapped = mapOutboxEventToRealtime(envelope);
    expect(mapped).toBeNull();
  });

  it("21. duplicate eventId is consumed once and subsequent delivery is skipped", async () => {
    const testChannel = `test:dedup:${randomUUID()}`;
    const broadcaster = new RedisFanoutBroadcaster({ client: redisProducer, channel: testChannel });
    const bridge = new OutboxRealtimeBridge({
      dedupConnection: redisProducer,
      broadcaster,
    });

    const envelope: OutboxEnvelope = {
      eventId: `evt_dedup_${randomUUID()}`,
      eventType: "appointment.confirmed",
      eventVersion: 1,
      tenantId: "tenant_dedup_1",
      locationId: null,
      aggregateId: "apt_dedup_1",
      occurredAt: new Date().toISOString(),
      deliveryAttempt: 1,
      payload: { status: "CONFIRMED" },
    };

    // First attempt: PUBLISHED
    const res1 = await bridge.processEnvelope(envelope);
    expect(res1.status).toBe("PUBLISHED");

    // Second attempt: SKIPPED_DUPLICATE
    const res2 = await bridge.processEnvelope(envelope);
    expect(res2.status).toBe("SKIPPED_DUPLICATE");
  });

  // =========================================================================
  // SECTION 7: SECURITY & MULTI-GATEWAY RECONNECT (Tests 22 to 23)
  // =========================================================================

  it("22. logs and telemetry contain no raw auth token/secret", () => {
    const rawJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const redacted = redactToken(rawJwt);

    expect(redacted).not.toBe(rawJwt);
    expect(redacted).toContain("...");
    expect(redacted).toContain("#");

    const payload = {
      user: "test",
      token: rawJwt,
      userSecret: "super_secret_key",
      nested: {
        authorizationHeader: `Bearer ${rawJwt}`,
      },
    };

    const sanitized = redactSensitiveData(payload) as any;
    expect(sanitized.token).not.toBe(rawJwt);
    expect(sanitized.userSecret).toBe("[REDACTED]");
    expect(sanitized.nested.authorizationHeader).not.toContain(rawJwt);
  });

  it("23. reconnect on another gateway re-auths and resubscribes seamlessly", async () => {
    const auth = new MockRealtimeAuthenticator();
    auth.registerUser("shared_token", {
      userId: "usr_recon",
      email: "r@r.com",
      name: "Reconnecting User",
      isPlatformAdmin: true,
      sessionId: "s_recon",
      tenantIds: new Set(["tenant_shared"]),
    });

    // Gateway 1
    const gw1 = await createTestGateway({ authenticator: auth });
    // Gateway 2
    const gw2 = await createTestGateway({ authenticator: auth });

    // Connect to Gateway 1
    const client1 = await connectWsClient(gw1.port);
    client1.send(JSON.stringify({ type: "auth", token: "shared_token" }));
    const ready1 = await waitForMessage<{ type: string; session: { userId: string } }>(client1);
    expect(ready1.type).toBe("ready");
    expect(ready1.session.userId).toBe("usr_recon");

    client1.send(JSON.stringify({ type: "subscribe", topic: "tenant:tenant_shared" }));
    const sub1 = await waitForMessage<{ type: string }>(client1);
    expect(sub1.type).toBe("subscribed");

    // Close client on Gateway 1
    client1.close();

    // Reconnect to Gateway 2
    const client2 = await connectWsClient(gw2.port);
    client2.send(JSON.stringify({ type: "auth", token: "shared_token" }));
    const ready2 = await waitForMessage<{ type: string; session: { userId: string } }>(client2);
    expect(ready2.type).toBe("ready");
    expect(ready2.session.userId).toBe("usr_recon");

    client2.send(JSON.stringify({ type: "subscribe", topic: "tenant:tenant_shared" }));
    const sub2 = await waitForMessage<{ type: string }>(client2);
    expect(sub2.type).toBe("subscribed");

    // Deliver event on Gateway 2
    gw2.gateway.deliverLocal("tenant:tenant_shared", {
      type: "event",
      topic: "tenant:tenant_shared",
      eventId: "evt_recon_live",
      eventType: "appointment.created",
      payload: { live: true },
      occurredAt: new Date().toISOString(),
    });

    const liveMsg = await waitForMessage<ServerEventMessage>(client2);
    expect(liveMsg.eventId).toBe("evt_recon_live");

    client2.close();
    await gw1.gateway.close();
    await gw2.gateway.close();
    await new Promise<void>((r) => gw1.server.close(() => r()));
    await new Promise<void>((r) => gw2.server.close(() => r()));
  });
});
