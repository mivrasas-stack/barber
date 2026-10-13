import type {
  NotificationTemplateRenderer,
  RenderNotificationTemplateInput,
  RenderedNotificationTemplate,
} from "../domain/notification-template-renderer.interface";

interface TemplateDefinition {
  subject: string;
  text: string;
}

const TEMPLATES: Record<string, TemplateDefinition> = {
  "appointment.created": {
    subject: "Tu cita fue creada",
    text: "Tu cita fue creada correctamente.",
  },
  "appointment.confirmed": {
    subject: "Tu cita fue confirmada",
    text: "Tu cita fue confirmada.",
  },
  "appointment.cancelled": {
    subject: "Tu cita fue cancelada",
    text: "Tu cita fue cancelada.",
  },
  "appointment.completed": {
    subject: "Tu cita fue completada",
    text: "Tu cita fue marcada como completada.",
  },
  "appointment.no_show": {
    subject: "Actualización de tu cita",
    text: "Tu cita fue marcada como no asistida.",
  },
  "order.completed": {
    subject: "Tu orden fue completada",
    text: "Tu orden fue completada correctamente.",
  },
  "order.returned": {
    subject: "Tu devolución fue registrada",
    text: "La devolución de tu orden fue registrada.",
  },
  "payment.succeeded": {
    subject: "Pago confirmado",
    text: "Tu pago fue confirmado.",
  },
  "payment.failed": {
    subject: "No pudimos completar tu pago",
    text: "Tu pago no pudo completarse.",
  },
  "payment.refund.succeeded": {
    subject: "Reembolso confirmado",
    text: "Tu reembolso fue confirmado.",
  },
  "professional.created": {
    subject: "Tu perfil profesional está listo",
    text: "Tu perfil profesional fue creado correctamente.",
  },
  "professional.affiliation.requested": {
    subject: "Nueva solicitud de afiliación",
    text: "Se registró una nueva solicitud de afiliación.",
  },
  "professional.affiliation.activated": {
    subject: "Afiliación activada",
    text: "La afiliación profesional fue activada.",
  },
  "professional.affiliation.suspended": {
    subject: "Afiliación suspendida",
    text: "La afiliación profesional fue suspendida.",
  },
  "professional.affiliation.ended": {
    subject: "Afiliación finalizada",
    text: "La afiliación profesional finalizó.",
  },
  "subscription.invoice.generated": {
    subject: "Nueva factura de suscripción",
    text: "Se generó una nueva factura de tu suscripción.",
  },
  "subscription.invoice.paid": {
    subject: "Factura de suscripción pagada",
    text: "El pago de tu factura de suscripción fue confirmado.",
  },
  "subscription.plan_change_scheduled": {
    subject: "Cambio de plan programado",
    text: "Tu cambio de plan fue programado.",
  },
  "subscription.plan_changed": {
    subject: "Plan actualizado",
    text: "Tu plan de suscripción fue actualizado.",
  },
  "subscription.cancel_scheduled": {
    subject: "Cancelación programada",
    text: "La cancelación de tu suscripción fue programada.",
  },
  "subscription.cancelled": {
    subject: "Suscripción cancelada",
    text: "Tu suscripción fue cancelada.",
  },
  "subscription.activated": {
    subject: "Suscripción activada",
    text: "Tu suscripción fue activada.",
  },
  "subscription.reactivated": {
    subject: "Suscripción reactivada",
    text: "Tu suscripción fue reactivada.",
  },
  "subscription.resumed": {
    subject: "Suscripción reanudada",
    text: "Tu suscripción fue reanudada.",
  },
  "subscription.suspended": {
    subject: "Suscripción suspendida",
    text: "Tu suscripción fue suspendida. Revisa el estado de facturación.",
  },
  "subscription.trial_expired": {
    subject: "Tu periodo de prueba finalizó",
    text: "Tu periodo de prueba finalizó.",
  },
  "subscription.trial_extended": {
    subject: "Periodo de prueba extendido",
    text: "Tu periodo de prueba fue extendido.",
  },
};

const DETAIL_KEYS = [
  "startsAt",
  "endsAt",
  "status",
  "reason",
  "orderNumber",
  "totalMinor",
  "currency",
  "amountMinor",
  "invoiceNumber",
  "planCode",
  "effectiveAt",
] as const;

export class TransactionalNotificationTemplateRenderer
  implements NotificationTemplateRenderer
{
  async render(
    input: RenderNotificationTemplateInput
  ): Promise<RenderedNotificationTemplate> {
    if (input.templateVersion !== 1) {
      throw new Error("NOTIFICATION_TEMPLATE_VERSION_UNSUPPORTED");
    }

    const definition = TEMPLATES[input.templateKey];
    if (!definition) {
      throw new Error("NOTIFICATION_TEMPLATE_NOT_FOUND");
    }

    const details = buildSafeDetails(input.data);
    const baseText = details
      ? `${definition.text} ${details}`
      : definition.text;
    const text =
      input.channel === "SMS"
        ? truncate(`Barber Paradise: ${baseText}`, 480)
        : truncate(baseText, 2_000);

    return {
      subject: input.channel === "EMAIL" ? definition.subject : undefined,
      text,
      html:
        input.channel === "EMAIL"
          ? renderHtml(definition.subject, definition.text, details)
          : undefined,
    };
  }
}

function buildSafeDetails(
  data: Readonly<Record<string, unknown>>
): string {
  const parts: string[] = [];
  for (const key of DETAIL_KEYS) {
    const value = data[key];
    if (value === undefined || value === null || value === "") continue;
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      continue;
    }
    parts.push(`${labelFor(key)}: ${String(value).slice(0, 160)}.`);
  }
  return parts.join(" ");
}

function labelFor(key: (typeof DETAIL_KEYS)[number]): string {
  switch (key) {
    case "startsAt":
      return "Inicio";
    case "endsAt":
      return "Fin";
    case "status":
      return "Estado";
    case "reason":
      return "Motivo";
    case "orderNumber":
      return "Orden";
    case "totalMinor":
      return "Total";
    case "currency":
      return "Moneda";
    case "amountMinor":
      return "Valor";
    case "invoiceNumber":
      return "Factura";
    case "planCode":
      return "Plan";
    case "effectiveAt":
      return "Vigencia";
  }
}

function renderHtml(subject: string, text: string, details: string): string {
  const safeSubject = escapeHtml(subject);
  const safeText = escapeHtml(text);
  const safeDetails = escapeHtml(details);
  return [
    "<!doctype html>",
    '<html lang="es">',
    "<body>",
    `<h1>${safeSubject}</h1>`,
    `<p>${safeText}</p>`,
    safeDetails ? `<p>${safeDetails}</p>` : "",
    "<p>Barber Paradise</p>",
    "</body>",
    "</html>",
  ].join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
