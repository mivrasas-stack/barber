import type { OutboxEnvelope } from "@/infrastructure/outbox/types";
import { redactSensitiveData } from "../auth/token-redactor";

export interface MappedRealtimeEvent {
  topics: string[];
  sanitizedPayload: Record<string, unknown>;
}

export type EventPayloadMapper = (envelope: OutboxEnvelope) => MappedRealtimeEvent | null;

/**
 * Registry of supported domain events that are whitelisted for client realtime push.
 * Any unlisted event is safely ignored and NEVER forwarded to client sockets.
 */
export const SUPPORTED_EVENT_REGISTRY: Record<string, EventPayloadMapper> = {
  // Appointment Lifecycle Events
  "appointment.created": (envelope) => {
    const raw = (envelope.payload || {}) as Record<string, unknown>;
    const topics = [`tenant:${envelope.tenantId}`];
    if (envelope.locationId) {
      topics.push(`location:${envelope.locationId}`);
    }
    topics.push(`appointment:${envelope.aggregateId}`);

    return {
      topics,
      sanitizedPayload: {
        appointmentId: envelope.aggregateId,
        tenantId: envelope.tenantId,
        locationId: envelope.locationId,
        status: raw.status || "PENDING",
        startsAt: raw.startsAt || raw.scheduledAt,
        endsAt: raw.endsAt,
        customerName: raw.customerNameSnapshot || raw.customerName,
        professionalId: raw.staffId || raw.professionalId,
      },
    };
  },

  "appointment.confirmed": (envelope) => {
    const raw = (envelope.payload || {}) as Record<string, unknown>;
    const topics = [`tenant:${envelope.tenantId}`];
    if (envelope.locationId) {
      topics.push(`location:${envelope.locationId}`);
    }
    topics.push(`appointment:${envelope.aggregateId}`);

    return {
      topics,
      sanitizedPayload: {
        appointmentId: envelope.aggregateId,
        tenantId: envelope.tenantId,
        status: "CONFIRMED",
        confirmedAt: raw.confirmedAt || envelope.occurredAt,
      },
    };
  },

  "appointment.cancelled": (envelope) => {
    const raw = (envelope.payload || {}) as Record<string, unknown>;
    const topics = [`tenant:${envelope.tenantId}`];
    if (envelope.locationId) {
      topics.push(`location:${envelope.locationId}`);
    }
    topics.push(`appointment:${envelope.aggregateId}`);

    return {
      topics,
      sanitizedPayload: {
        appointmentId: envelope.aggregateId,
        tenantId: envelope.tenantId,
        status: "CANCELLED",
        cancelledAt: raw.cancelledAt || envelope.occurredAt,
        reason: typeof raw.reason === "string" ? raw.reason.slice(0, 100) : undefined,
      },
    };
  },

  "appointment.completed": (envelope) => {
    const raw = (envelope.payload || {}) as Record<string, unknown>;
    const topics = [`tenant:${envelope.tenantId}`];
    if (envelope.locationId) {
      topics.push(`location:${envelope.locationId}`);
    }
    topics.push(`appointment:${envelope.aggregateId}`);

    return {
      topics,
      sanitizedPayload: {
        appointmentId: envelope.aggregateId,
        tenantId: envelope.tenantId,
        status: "COMPLETED",
        completedAt: raw.completedAt || envelope.occurredAt,
      },
    };
  },

  // POS & Order Events
  "order.completed": (envelope) => {
    const raw = (envelope.payload || {}) as Record<string, unknown>;
    const topics = [`tenant:${envelope.tenantId}`, `order:${envelope.aggregateId}`];
    if (envelope.locationId) {
      topics.push(`location:${envelope.locationId}`);
    }

    return {
      topics,
      sanitizedPayload: {
        orderId: envelope.aggregateId,
        orderNumber: raw.orderNumber,
        tenantId: envelope.tenantId,
        status: "COMPLETED",
        totalMinor: raw.grandTotalMinor ? String(raw.grandTotalMinor) : undefined,
        currency: raw.currency || "COP",
      },
    };
  },

  "order.returned": (envelope) => {
    const raw = (envelope.payload || {}) as Record<string, unknown>;
    const topics = [`tenant:${envelope.tenantId}`, `order:${envelope.aggregateId}`];

    return {
      topics,
      sanitizedPayload: {
        orderId: envelope.aggregateId,
        tenantId: envelope.tenantId,
        status: "RETURNED",
        returnedAt: raw.returnedAt || envelope.occurredAt,
      },
    };
  },

  // Payment Events
  "payment.succeeded.v1": (envelope) => {
    const raw = (envelope.payload || {}) as Record<string, unknown>;
    const topics = [`tenant:${envelope.tenantId}`];
    if (raw.appointmentId) {
      topics.push(`appointment:${raw.appointmentId}`);
    }
    if (raw.orderId) {
      topics.push(`order:${raw.orderId}`);
    }

    return {
      topics,
      sanitizedPayload: {
        paymentId: envelope.aggregateId,
        status: "SUCCEEDED",
        amountMinor: raw.amountMinor ? String(raw.amountMinor) : undefined,
        currency: raw.currency || "COP",
      },
    };
  },

  "payment.failed.v1": (envelope) => {
    const raw = (envelope.payload || {}) as Record<string, unknown>;
    const topics = [`tenant:${envelope.tenantId}`];

    return {
      topics,
      sanitizedPayload: {
        paymentId: envelope.aggregateId,
        status: "FAILED",
        reason: typeof raw.error === "string" ? raw.error.slice(0, 100) : undefined,
      },
    };
  },

  "payment.refund.succeeded.v1": (envelope) => {
    const raw = (envelope.payload || {}) as Record<string, unknown>;
    const topics = [`tenant:${envelope.tenantId}`];

    return {
      topics,
      sanitizedPayload: {
        refundId: envelope.aggregateId,
        status: "REFUNDED",
        amountMinor: raw.amountMinor ? String(raw.amountMinor) : undefined,
      },
    };
  },

  // Professional Events
  "professional.affiliation.requested.v1": (envelope) => {
    return {
      topics: [`tenant:${envelope.tenantId}`, `professional:${envelope.aggregateId}`],
      sanitizedPayload: {
        professionalId: envelope.aggregateId,
        tenantId: envelope.tenantId,
        status: "REQUESTED",
      },
    };
  },

  "professional.affiliation.activated.v1": (envelope) => {
    return {
      topics: [`tenant:${envelope.tenantId}`, `professional:${envelope.aggregateId}`],
      sanitizedPayload: {
        professionalId: envelope.aggregateId,
        tenantId: envelope.tenantId,
        status: "ACTIVE",
      },
    };
  },
};

/**
 * Validates and maps an outbox envelope to a safe client realtime event.
 * Returns null if the event type is unsupported or dangerous to forward.
 */
export function mapOutboxEventToRealtime(
  envelope: OutboxEnvelope
): MappedRealtimeEvent | null {
  if (!envelope || !envelope.eventType) {
    return null;
  }

  const mapper = SUPPORTED_EVENT_REGISTRY[envelope.eventType];
  if (!mapper) {
    return null; // Whitelist enforcement: unsupported events are dropped
  }

  const mapped = mapper(envelope);
  if (!mapped) return null;

  return {
    topics: mapped.topics,
    sanitizedPayload: redactSensitiveData(mapped.sanitizedPayload) as Record<string, unknown>,
  };
}
