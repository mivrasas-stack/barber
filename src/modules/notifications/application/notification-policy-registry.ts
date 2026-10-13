import type { OutboxEnvelope } from "@/infrastructure/outbox/types";
import type { NotificationPolicy } from "../domain/notification-policy";

function asObject(envelope: OutboxEnvelope): Record<string, unknown> {
  return envelope.payload && typeof envelope.payload === "object"
    ? (envelope.payload as Record<string, unknown>)
    : {};
}

function boundedString(value: unknown, max = 160): string | undefined {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

function mapAppointment(envelope: OutboxEnvelope): Record<string, unknown> {
  const raw = asObject(envelope);
  return {
    appointmentId: envelope.aggregateId,
    status: boundedString(raw.toStatus ?? raw.status, 32),
    startsAt: boundedString(raw.startsAt, 64),
    endsAt: boundedString(raw.endsAt, 64),
    reason: boundedString(raw.reason, 160),
  };
}

function mapOrder(envelope: OutboxEnvelope): Record<string, unknown> {
  const raw = asObject(envelope);
  return {
    orderId: envelope.aggregateId,
    orderNumber: boundedString(raw.orderNumber, 64),
    status: envelope.eventType.endsWith("returned") ? "RETURNED" : "COMPLETED",
    totalMinor:
      typeof raw.grandTotalMinor === "string" || typeof raw.grandTotalMinor === "number"
        ? String(raw.grandTotalMinor)
        : undefined,
    currency: boundedString(raw.currency, 3),
  };
}

function mapPayment(envelope: OutboxEnvelope): Record<string, unknown> {
  const raw = asObject(envelope);
  return {
    paymentIntentId: boundedString(raw.paymentIntentId, 64) ?? envelope.aggregateId,
    orderId: boundedString(raw.orderId, 64),
    status: envelope.eventType.includes("failed")
      ? "FAILED"
      : envelope.eventType.includes("refund")
        ? "REFUNDED"
        : "SUCCEEDED",
    amountMinor:
      typeof raw.amountMinor === "string" || typeof raw.amountMinor === "number"
        ? String(raw.amountMinor)
        : undefined,
    currency: boundedString(raw.currency, 3),
    reason: boundedString(raw.reason, 120),
  };
}

function mapSubscription(envelope: OutboxEnvelope): Record<string, unknown> {
  const raw = asObject(envelope);
  return {
    subscriptionId: boundedString(raw.subscriptionId, 64) ?? envelope.aggregateId,
    invoiceId: boundedString(raw.invoiceId, 64),
    invoiceNumber: boundedString(raw.invoiceNumber, 64),
    planCode: boundedString(raw.planCode, 64),
    status: boundedString(raw.status ?? raw.toStatus, 32),
    effectiveAt: boundedString(raw.effectiveAt, 64),
  };
}

function mapProfessional(envelope: OutboxEnvelope): Record<string, unknown> {
  const raw = asObject(envelope);
  return {
    professionalId: boundedString(raw.professionalProfileId, 64) ?? envelope.aggregateId,
    affiliationId: boundedString(raw.affiliationId, 64),
    status: boundedString(raw.status, 32),
  };
}

const IN_APP_EMAIL_REQUIRED = [
  { channel: "IN_APP", mandatory: true },
  { channel: "EMAIL", mandatory: true },
] as const;

const IN_APP_EMAIL = [
  { channel: "IN_APP", mandatory: false },
  { channel: "EMAIL", mandatory: false },
] as const;

const APPOINTMENT_TRANSACTIONAL = [
  { channel: "IN_APP", mandatory: true },
  { channel: "EMAIL", mandatory: true },
  { channel: "SMS", mandatory: false },
  { channel: "WHATSAPP", mandatory: false },
] as const;

const POLICIES: Record<string, NotificationPolicy> = {
  "appointment.created": {
    key: "appointment.created.transactional",
    eventType: "appointment.created",
    category: "APPOINTMENT",
    templateKey: "appointment.created",
    templateVersion: 1,
    recipientStrategy: "APPOINTMENT_CUSTOMER",
    channels: APPOINTMENT_TRANSACTIONAL,
    quietHoursBypass: false,
    mapPayload: mapAppointment,
  },
  "appointment.confirmed": {
    key: "appointment.confirmed.transactional",
    eventType: "appointment.confirmed",
    category: "APPOINTMENT",
    templateKey: "appointment.confirmed",
    templateVersion: 1,
    recipientStrategy: "APPOINTMENT_CUSTOMER",
    channels: APPOINTMENT_TRANSACTIONAL,
    quietHoursBypass: false,
    mapPayload: mapAppointment,
  },
  "appointment.cancelled": {
    key: "appointment.cancelled.transactional",
    eventType: "appointment.cancelled",
    category: "APPOINTMENT",
    templateKey: "appointment.cancelled",
    templateVersion: 1,
    recipientStrategy: "APPOINTMENT_CUSTOMER",
    channels: APPOINTMENT_TRANSACTIONAL,
    quietHoursBypass: true,
    mapPayload: mapAppointment,
  },
  "appointment.completed": {
    key: "appointment.completed",
    eventType: "appointment.completed",
    category: "APPOINTMENT",
    templateKey: "appointment.completed",
    templateVersion: 1,
    recipientStrategy: "APPOINTMENT_CUSTOMER",
    channels: IN_APP_EMAIL,
    quietHoursBypass: false,
    mapPayload: mapAppointment,
  },
  "appointment.no_show": {
    key: "appointment.no_show",
    eventType: "appointment.no_show",
    category: "APPOINTMENT",
    templateKey: "appointment.no_show",
    templateVersion: 1,
    recipientStrategy: "APPOINTMENT_CUSTOMER",
    channels: IN_APP_EMAIL,
    quietHoursBypass: false,
    mapPayload: mapAppointment,
  },
  "order.completed": {
    key: "order.completed.transactional",
    eventType: "order.completed",
    category: "ORDER",
    templateKey: "order.completed",
    templateVersion: 1,
    recipientStrategy: "ORDER_CUSTOMER",
    channels: IN_APP_EMAIL_REQUIRED,
    quietHoursBypass: false,
    mapPayload: mapOrder,
  },
  "order.returned": {
    key: "order.returned.transactional",
    eventType: "order.returned",
    category: "ORDER",
    templateKey: "order.returned",
    templateVersion: 1,
    recipientStrategy: "ORDER_CUSTOMER",
    channels: IN_APP_EMAIL_REQUIRED,
    quietHoursBypass: false,
    mapPayload: mapOrder,
  },
  "payment.succeeded.v1": {
    key: "payment.succeeded.transactional",
    eventType: "payment.succeeded.v1",
    category: "PAYMENT",
    templateKey: "payment.succeeded",
    templateVersion: 1,
    recipientStrategy: "PAYMENT_CUSTOMER_OR_TENANT_OWNERS",
    channels: IN_APP_EMAIL_REQUIRED,
    quietHoursBypass: true,
    mapPayload: mapPayment,
  },
  "payment.failed.v1": {
    key: "payment.failed.transactional",
    eventType: "payment.failed.v1",
    category: "PAYMENT",
    templateKey: "payment.failed",
    templateVersion: 1,
    recipientStrategy: "PAYMENT_CUSTOMER_OR_TENANT_OWNERS",
    channels: IN_APP_EMAIL_REQUIRED,
    quietHoursBypass: true,
    mapPayload: mapPayment,
  },
  "payment.refund.succeeded.v1": {
    key: "payment.refund.succeeded.transactional",
    eventType: "payment.refund.succeeded.v1",
    category: "PAYMENT",
    templateKey: "payment.refund.succeeded",
    templateVersion: 1,
    recipientStrategy: "PAYMENT_CUSTOMER_OR_TENANT_OWNERS",
    channels: IN_APP_EMAIL_REQUIRED,
    quietHoursBypass: true,
    mapPayload: mapPayment,
  },
  "professional.created.v1": {
    key: "professional.created",
    eventType: "professional.created.v1",
    category: "PROFESSIONAL",
    templateKey: "professional.created",
    templateVersion: 1,
    recipientStrategy: "PROFESSIONAL_USER",
    channels: IN_APP_EMAIL,
    quietHoursBypass: false,
    mapPayload: mapProfessional,
  },
  "professional.affiliation.requested.v1": {
    key: "professional.affiliation.requested",
    eventType: "professional.affiliation.requested.v1",
    category: "AFFILIATION",
    templateKey: "professional.affiliation.requested",
    templateVersion: 1,
    recipientStrategy: "AFFILIATION_PARTIES",
    channels: IN_APP_EMAIL_REQUIRED,
    quietHoursBypass: false,
    mapPayload: mapProfessional,
  },
  "professional.affiliation.activated.v1": {
    key: "professional.affiliation.activated",
    eventType: "professional.affiliation.activated.v1",
    category: "AFFILIATION",
    templateKey: "professional.affiliation.activated",
    templateVersion: 1,
    recipientStrategy: "AFFILIATION_PARTIES",
    channels: IN_APP_EMAIL_REQUIRED,
    quietHoursBypass: false,
    mapPayload: mapProfessional,
  },
  "professional.affiliation.suspended.v1": {
    key: "professional.affiliation.suspended",
    eventType: "professional.affiliation.suspended.v1",
    category: "AFFILIATION",
    templateKey: "professional.affiliation.suspended",
    templateVersion: 1,
    recipientStrategy: "AFFILIATION_PARTIES",
    channels: IN_APP_EMAIL_REQUIRED,
    quietHoursBypass: true,
    mapPayload: mapProfessional,
  },
  "professional.affiliation.ended.v1": {
    key: "professional.affiliation.ended",
    eventType: "professional.affiliation.ended.v1",
    category: "AFFILIATION",
    templateKey: "professional.affiliation.ended",
    templateVersion: 1,
    recipientStrategy: "AFFILIATION_PARTIES",
    channels: IN_APP_EMAIL_REQUIRED,
    quietHoursBypass: true,
    mapPayload: mapProfessional,
  },
};

const SUBSCRIPTION_EVENTS = [
  "subscription.invoice.generated.v1",
  "subscription.invoice.paid.v1",
  "subscription.plan_change_scheduled.v1",
  "subscription.plan_changed.v1",
  "subscription.cancel_scheduled.v1",
  "subscription.cancelled.v1",
  "subscription.activated.v1",
  "subscription.reactivated.v1",
  "subscription.resumed.v1",
  "subscription.suspended.v1",
  "subscription.trial_expired.v1",
  "subscription.trial_extended.v1",
] as const;

for (const eventType of SUBSCRIPTION_EVENTS) {
  POLICIES[eventType] = {
    key: eventType.replace(".v1", ""),
    eventType,
    category: "SUBSCRIPTION",
    templateKey: eventType.replace(".v1", ""),
    templateVersion: 1,
    recipientStrategy: "TENANT_OWNERS",
    channels: IN_APP_EMAIL_REQUIRED,
    quietHoursBypass:
      eventType.includes("suspended") ||
      eventType.includes("cancelled") ||
      eventType.includes("trial_expired"),
    mapPayload: mapSubscription,
  };
}

export function getNotificationPolicy(
  eventType: string
): NotificationPolicy | null {
  return POLICIES[eventType] ?? null;
}

export function listNotificationPolicies(): readonly NotificationPolicy[] {
  return Object.values(POLICIES);
}
