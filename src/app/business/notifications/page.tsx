"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  BellRing,
  Check,
  Clock3,
  Mail,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface InboxItem {
  id: string;
  notificationIntentId: string;
  tenantId: string;
  category: string;
  templateKey: string;
  templateVersion: number;
  payload: Record<string, unknown>;
  mandatory: boolean;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
}

interface Preference {
  id: string;
  tenantId: string | null;
  category: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string | null;
  locale: string | null;
}

const CATEGORIES = [
  "APPOINTMENT",
  "PAYMENT",
  "ORDER",
  "SUBSCRIPTION",
  "AFFILIATION",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  APPOINTMENT: "Citas",
  PAYMENT: "Pagos",
  ORDER: "Órdenes",
  SUBSCRIPTION: "Suscripción",
  AFFILIATION: "Afiliaciones",
  PROFESSIONAL: "Profesionales",
};

const DEFAULT_PREFERENCE: Omit<Preference, "id" | "tenantId" | "category"> = {
  inAppEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  quietHoursEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  timezone: "America/Bogota",
  locale: "es-CO",
};

export default function NotificationsPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
      if (!meResponse.ok) throw new Error("No fue posible validar la sesión.");
      const me = await meResponse.json();
      const activeTenantId = me?.activeTenantId as string | undefined;
      if (!activeTenantId) {
        throw new Error("Selecciona un espacio de trabajo para ver notificaciones.");
      }
      setTenantId(activeTenantId);

      const [inboxResponse, preferenceResponse] = await Promise.all([
        fetch(
          `/api/v1/notifications?tenantId=${encodeURIComponent(
            activeTenantId
          )}&limit=20`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/v1/notification-preferences?tenantId=${encodeURIComponent(
            activeTenantId
          )}`,
          { cache: "no-store" }
        ),
      ]);

      if (!inboxResponse.ok || !preferenceResponse.ok) {
        throw new Error("No fue posible cargar la configuración de notificaciones.");
      }

      const inbox = await inboxResponse.json();
      const preferenceData = await preferenceResponse.json();
      setItems(Array.isArray(inbox?.data) ? inbox.data : []);
      setUnreadCount(Number(inbox?.meta?.unreadCount ?? 0));
      setPreferences(
        Array.isArray(preferenceData?.data) ? preferenceData.data : []
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar las notificaciones."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tenantPreferences = useMemo(() => {
    const byCategory = new Map<string, Preference>();
    for (const preference of preferences) {
      if (preference.tenantId === tenantId) {
        byCategory.set(preference.category, preference);
      } else if (!byCategory.has(preference.category)) {
        byCategory.set(preference.category, preference);
      }
    }
    return byCategory;
  }, [preferences, tenantId]);

  const markRead = async (id: string) => {
    const response = await fetch(`/api/v1/notifications/${id}/read`, {
      method: "POST",
    });
    if (!response.ok) return;
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
          : item
      )
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const archive = async (id: string) => {
    const response = await fetch(`/api/v1/notifications/${id}/archive`, {
      method: "POST",
    });
    if (!response.ok) return;
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const preferenceFor = (category: string): Preference => {
    return (
      tenantPreferences.get(category) ?? {
        id: "",
        tenantId,
        category,
        ...DEFAULT_PREFERENCE,
      }
    );
  };

  const updatePreference = async (
    category: string,
    patch: Partial<Preference>
  ) => {
    if (!tenantId) return;
    const current = preferenceFor(category);
    const next = { ...current, ...patch };
    const key = `${category}:${Object.keys(patch)[0] ?? "update"}`;
    setSavingKey(key);

    try {
      const response = await fetch("/api/v1/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          category,
          inAppEnabled: next.inAppEnabled,
          emailEnabled: next.emailEnabled,
          smsEnabled: next.smsEnabled,
          whatsappEnabled: next.whatsappEnabled,
          quietHoursEnabled: next.quietHoursEnabled,
          quietHoursStart: next.quietHoursEnabled
            ? next.quietHoursStart ?? "21:00"
            : null,
          quietHoursEnd: next.quietHoursEnabled
            ? next.quietHoursEnd ?? "07:00"
            : null,
          timezone: next.timezone ?? "America/Bogota",
          locale: next.locale ?? "es-CO",
        }),
      });

      if (!response.ok) throw new Error("No se pudo guardar la preferencia.");
      const body = await response.json();
      const saved = body.data as Preference;
      setPreferences((currentPreferences) => [
        ...currentPreferences.filter(
          (preference) =>
            !(
              preference.category === saved.category &&
              preference.tenantId === saved.tenantId
            )
        ),
        saved,
      ]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo guardar la preferencia."
      );
    } finally {
      setSavingKey(null);
    }
  };

  const channelEnabledCount = (key: keyof Preference) =>
    CATEGORIES.filter((category) => Boolean(preferenceFor(category)[key])).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Notificaciones
          </h1>
          <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Inbox transaccional, preferencias y canales de entrega.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={BellRing}
          title="Sin leer"
          value={String(unreadCount)}
          detail="Inbox durable"
        />
        <SummaryCard
          icon={Mail}
          title="Email"
          value={`${channelEnabledCount("emailEnabled")}/${CATEGORIES.length}`}
          detail="categorías activas"
        />
        <SummaryCard
          icon={MessageSquare}
          title="SMS"
          value={`${channelEnabledCount("smsEnabled")}/${CATEGORIES.length}`}
          detail="categorías activas"
        />
        <SummaryCard
          icon={ShieldCheck}
          title="WhatsApp"
          value={`${channelEnabledCount("whatsappEnabled")}/${CATEGORIES.length}`}
          detail="categorías activas"
        />
      </div>

      <section className="rounded-2xl border border-border bg-foreground/5 p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-headline text-xl uppercase tracking-widest">
              Preferencias por categoría
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Los avisos obligatorios pueden ignorar una preferencia opcional
              según la política transaccional.
            </p>
          </div>
          <Clock3 className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pr-4">Categoría</th>
                <th className="px-4 py-3">In-app</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">SMS</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Horario silencioso</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((category) => {
                const preference = preferenceFor(category);
                return (
                  <tr key={category} className="border-b border-border/60">
                    <td className="py-4 pr-4 font-medium">
                      {CATEGORY_LABELS[category] ?? category}
                    </td>
                    <PreferenceToggle
                      checked={preference.inAppEnabled}
                      disabled={Boolean(savingKey)}
                      onCheckedChange={(checked) =>
                        void updatePreference(category, {
                          inAppEnabled: checked,
                        })
                      }
                    />
                    <PreferenceToggle
                      checked={preference.emailEnabled}
                      disabled={Boolean(savingKey)}
                      onCheckedChange={(checked) =>
                        void updatePreference(category, {
                          emailEnabled: checked,
                        })
                      }
                    />
                    <PreferenceToggle
                      checked={preference.smsEnabled}
                      disabled={Boolean(savingKey)}
                      onCheckedChange={(checked) =>
                        void updatePreference(category, {
                          smsEnabled: checked,
                        })
                      }
                    />
                    <PreferenceToggle
                      checked={preference.whatsappEnabled}
                      disabled={Boolean(savingKey)}
                      onCheckedChange={(checked) =>
                        void updatePreference(category, {
                          whatsappEnabled: checked,
                        })
                      }
                    />
                    <PreferenceToggle
                      checked={preference.quietHoursEnabled}
                      disabled={Boolean(savingKey)}
                      onCheckedChange={(checked) =>
                        void updatePreference(category, {
                          quietHoursEnabled: checked,
                        })
                      }
                    />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-foreground/5 p-6">
        <div className="mb-5">
          <h2 className="font-headline text-xl uppercase tracking-widest">
            Historial reciente
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sólo se muestran notificaciones de tu usuario en el workspace activo.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Cargando notificaciones…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            No hay notificaciones recientes.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className={`rounded-xl border p-4 transition-colors ${
                  item.readAt
                    ? "border-border bg-background/20"
                    : "border-primary/30 bg-primary/5"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs uppercase tracking-wider text-primary">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </span>
                      {item.mandatory && (
                        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          Transaccional
                        </span>
                      )}
                      {!item.readAt && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-1 font-medium">
                      {titleForTemplate(item.templateKey)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("es-CO")}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {!item.readAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => void markRead(item.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Leída
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      onClick={() => void archive(item.id)}
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Archivar
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-foreground/5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-3xl font-headline tracking-wider">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

function PreferenceToggle({
  checked,
  disabled,
  onCheckedChange,
}: {
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <td className="px-4 py-4">
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </td>
  );
}

function titleForTemplate(templateKey: string): string {
  const labels: Record<string, string> = {
    "appointment.created": "Cita creada",
    "appointment.confirmed": "Cita confirmada",
    "appointment.cancelled": "Cita cancelada",
    "appointment.completed": "Cita completada",
    "appointment.no_show": "Actualización de cita",
    "order.completed": "Orden completada",
    "order.returned": "Devolución registrada",
    "payment.succeeded": "Pago confirmado",
    "payment.failed": "Pago fallido",
    "payment.refund.succeeded": "Reembolso confirmado",
    "subscription.invoice.generated": "Factura generada",
    "subscription.invoice.paid": "Factura pagada",
    "subscription.suspended": "Suscripción suspendida",
    "subscription.cancelled": "Suscripción cancelada",
  };
  return labels[templateKey] ?? templateKey.replaceAll(".", " ");
}
