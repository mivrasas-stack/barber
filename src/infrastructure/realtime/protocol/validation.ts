import {
  ClientMessageSchema,
  TopicSchema,
  type ClientMessage,
  type ParsedTopic,
  type TopicKind,
  RealtimeErrorCodes,
} from "./types";

export type ParseMessageResult =
  | { ok: true; message: ClientMessage }
  | {
      ok: false;
      code: string;
      error: string;
      closeCode?: number;
    };

/**
 * Validates and parses a raw topic string into a structured ParsedTopic object.
 */
export function parseTopic(rawTopic: unknown): ParsedTopic | null {
  const result = TopicSchema.safeParse(rawTopic);
  if (!result.success) {
    return null;
  }

  const topicStr = result.data;
  const colonIndex = topicStr.indexOf(":");
  const kind = topicStr.slice(0, colonIndex) as TopicKind;
  const id = topicStr.slice(colonIndex + 1);

  return { kind, id, raw: topicStr };
}

/**
 * Parses and validates an inbound WebSocket text frame against protocol schemas.
 */
export function parseClientMessage(
  rawData: unknown,
  maxBytes: number = 32768
): ParseMessageResult {
  let text = "";

  if (typeof rawData === "string") {
    text = rawData;
  } else if (Buffer.isBuffer(rawData)) {
    if (rawData.length > maxBytes) {
      return {
        ok: false,
        code: RealtimeErrorCodes.PAYLOAD_TOO_LARGE,
        error: "Message payload exceeds allowed maximum size",
        closeCode: 1009, // Message Too Big
      };
    }
    text = rawData.toString("utf8");
  } else if (rawData instanceof ArrayBuffer) {
    if (rawData.byteLength > maxBytes) {
      return {
        ok: false,
        code: RealtimeErrorCodes.PAYLOAD_TOO_LARGE,
        error: "Message payload exceeds allowed maximum size",
        closeCode: 1009,
      };
    }
    text = Buffer.from(rawData).toString("utf8");
  } else {
    return {
      ok: false,
      code: RealtimeErrorCodes.MALFORMED_MESSAGE,
      error: "Expected text frame",
    };
  }

  if (text.length > maxBytes) {
    return {
      ok: false,
      code: RealtimeErrorCodes.PAYLOAD_TOO_LARGE,
      error: "Message payload exceeds allowed maximum size",
      closeCode: 1009,
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      ok: false,
      code: RealtimeErrorCodes.MALFORMED_MESSAGE,
      error: "Message is not valid JSON",
    };
  }

  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return {
      ok: false,
      code: RealtimeErrorCodes.MALFORMED_MESSAGE,
      error: "Message must be a JSON object",
    };
  }

  const candidate = json as Record<string, unknown>;
  if (typeof candidate.type !== "string") {
    return {
      ok: false,
      code: RealtimeErrorCodes.UNKNOWN_MESSAGE_TYPE,
      error: "Message type is required and must be a string",
    };
  }

  const parsed = ClientMessageSchema.safeParse(json);
  if (!parsed.success) {
    const isKnownType = ["auth", "subscribe", "unsubscribe", "ping"].includes(
      candidate.type
    );
    if (!isKnownType) {
      return {
        ok: false,
        code: RealtimeErrorCodes.UNKNOWN_MESSAGE_TYPE,
        error: `Unknown message type: ${sanitizeString(candidate.type)}`,
      };
    }

    return {
      ok: false,
      code: RealtimeErrorCodes.MALFORMED_MESSAGE,
      error: "Message parameters failed schema validation",
    };
  }

  return { ok: true, message: parsed.data };
}

function sanitizeString(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
}
