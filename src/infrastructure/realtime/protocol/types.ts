import { z } from "zod";

export const TOPIC_KINDS = [
  "tenant",
  "location",
  "professional",
  "appointment",
  "order",
  "customer",
  "user",
] as const;

export type TopicKind = (typeof TOPIC_KINDS)[number];

export interface ParsedTopic {
  kind: TopicKind;
  id: string;
  raw: string;
}

export const TOPIC_REGEX = /^(tenant|location|professional|appointment|order|customer|user):([a-zA-Z0-9_-]+)$/;

export const TopicSchema = z
  .string()
  .min(3)
  .max(128)
  .regex(TOPIC_REGEX, "Invalid topic format. Expected {kind}:{id} with alphanumeric characters.");

// Client Inbound Messages
export const ClientAuthMessageSchema = z.object({
  type: z.literal("auth"),
  token: z.string().min(1, "Token must not be empty").max(4096),
});

export const ClientSubscribeMessageSchema = z.object({
  type: z.literal("subscribe"),
  topic: TopicSchema,
});

export const ClientUnsubscribeMessageSchema = z.object({
  type: z.literal("unsubscribe"),
  topic: TopicSchema,
});

export const ClientPingMessageSchema = z.object({
  type: z.literal("ping"),
  timestamp: z.number().optional(),
});

export const ClientMessageSchema = z.discriminatedUnion("type", [
  ClientAuthMessageSchema,
  ClientSubscribeMessageSchema,
  ClientUnsubscribeMessageSchema,
  ClientPingMessageSchema,
]);

export type ClientAuthMessage = z.infer<typeof ClientAuthMessageSchema>;
export type ClientSubscribeMessage = z.infer<typeof ClientSubscribeMessageSchema>;
export type ClientUnsubscribeMessage = z.infer<typeof ClientUnsubscribeMessageSchema>;
export type ClientPingMessage = z.infer<typeof ClientPingMessageSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// Server Outbound Messages
export interface ServerReadyMessage {
  type: "ready";
  session: {
    userId: string;
    email: string;
    name: string;
    isPlatformAdmin: boolean;
  };
}

export interface ServerSubscribedMessage {
  type: "subscribed";
  topic: string;
}

export interface ServerUnsubscribedMessage {
  type: "unsubscribed";
  topic: string;
}

export interface ServerEventMessage {
  type: "event";
  topic: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  occurredAt: string;
}

export interface ServerErrorMessage {
  type: "error";
  code: string;
  message: string;
  retryable?: boolean;
}

export interface ServerPongMessage {
  type: "pong";
  timestamp?: number;
}

export type ServerMessage =
  | ServerReadyMessage
  | ServerSubscribedMessage
  | ServerUnsubscribedMessage
  | ServerEventMessage
  | ServerErrorMessage
  | ServerPongMessage;

// Error Codes
export const RealtimeErrorCodes = {
  MALFORMED_MESSAGE: "MALFORMED_MESSAGE",
  UNKNOWN_MESSAGE_TYPE: "UNKNOWN_MESSAGE_TYPE",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_FAILED: "AUTH_FAILED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  UNAUTHORIZED_TOPIC: "UNAUTHORIZED_TOPIC",
  INVALID_TOPIC: "INVALID_TOPIC",
  SUBSCRIPTION_LIMIT_EXCEEDED: "SUBSCRIPTION_LIMIT_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type RealtimeErrorCode =
  (typeof RealtimeErrorCodes)[keyof typeof RealtimeErrorCodes];

// WebSocket Close Codes
export const RealtimeCloseCodes = {
  NORMAL_CLOSURE: 1000,
  GOING_AWAY: 1001,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
  SERVICE_RESTART: 1012,
  AUTH_TIMEOUT: 4401,
} as const;
