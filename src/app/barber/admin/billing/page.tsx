"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  FileText,
  Calendar,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/ui/premium-button";

interface Invoice {
  id: string;
  invoiceNumber: string;
  currency: string;
  totalMinor: string;
  status: string;
  dueAt: string;
  periodStart: string;
  periodEnd: string;
  planNameSnapshot: string;
}

interface SubscriptionData {
  subscription: {
    id: string;
    tenantId: string;
    planId: string;
    status: string;
    startsAt: string;
    trialEndsAt?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd: boolean;
    pastDueAt?: string | null;
    graceEndsAt?: string | null;
    suspendedAt?: string | null;
    pendingPlanId?: string | null;
  } | null;
  plan: {
    id: string;
    code: string;
    name: string;
    priceMinor: number;
    billingPeriod: string;
    currency: string;
  } | null;
  pendingPlan?: {
    id: string;
    name: string;
  } | null;
  isOperational: boolean;
  warnings: {
    isTrialing: boolean;
    trialDaysRemaining?: number | null;
    isPastDue: boolean;
    isGracePeriod: boolean;
    graceHoursRemaining?: number | null;
    isSuspended: boolean;
    cancelAtPeriodEnd: boolean;
    pendingPlanChange?: {
      planName: string;
      effectiveAt?: string | null;
    } | null;
  };
  latestInvoices: Invoice[];
}

export default function BarberAdminBillingPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadSubscription = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/subscription");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load subscription status", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, []);

  const handlePayInvoice = async (invoiceId: string) => {
    setPayingInvoiceId(invoiceId);
    setFeedback(null);
    try {
      const res = await fetch("/api/v1/subscription/pay-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, provider: "TEST" }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Payment failed");
      }

      setFeedback({
        message: `Factura pagada exitosamente. Estado de suscripción actualizado a ACTIVO.`,
        type: "success",
      });
      await loadSubscription();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const handleCancelAtPeriodEnd = async () => {
    if (!confirm("¿Deseas programar la cancelación de tu suscripción para el fin del periodo? Podrás seguir usando el servicio hasta esa fecha.")) {
      return;
    }
    setFeedback(null);
    try {
      const res = await fetch("/api/v1/subscription/cancel-at-period-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("No se pudo programar la cancelación");
      setFeedback({ message: "Cancelación programada para el final del ciclo.", type: "success" });
      await loadSubscription();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    }
  };

  const handleResume = async () => {
    setFeedback(null);
    try {
      const res = await fetch("/api/v1/subscription/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("No se pudo reanudar la suscripción");
      setFeedback({ message: "Suscripción reanudada con éxito.", type: "success" });
      await loadSubscription();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    }
  };

  const formatPrice = (minor: number | string, currency = "COP") => {
    const amount = Number(minor) / 100;
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">ACTIVO</Badge>;
      case "TRIALING":
        return <Badge className="bg-sky-500/20 text-sky-400 border border-sky-500/40">PERIODO DE PRUEBA</Badge>;
      case "PAST_DUE":
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40">PAGO PENDIENTE</Badge>;
      case "GRACE_PERIOD":
        return <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/40">PERIODO DE GRACIA</Badge>;
      case "SUSPENDED":
        return <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/40">SUSPENDIDO</Badge>;
      case "CANCELLED":
        return <Badge className="bg-zinc-500/20 text-zinc-400 border border-zinc-500/40">CANCELADO</Badge>;
      default:
        return <Badge className="bg-zinc-800 text-zinc-300">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-amber-400" />
            Suscripción y Facturación SaaS
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gestión de plan, facturas periódicas y estado operativo de la plataforma
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PremiumButton variant="outline" size="sm" onClick={loadSubscription} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </PremiumButton>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-sm font-semibold hover:underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Warning Banners */}
      {data?.warnings.isSuspended && (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-200 flex items-start gap-4">
          <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-lg text-rose-300">Workspace Suspendido por Falta de Pago</h4>
            <p className="text-sm text-rose-200/80">
              Las funciones operativas de tu barbería están temporalmente bloqueadas. Puedes realizar el pago de la factura vencida a continuación para reactivar el acceso inmediatamente.
            </p>
          </div>
        </div>
      )}

      {data?.warnings.isGracePeriod && (
        <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-amber-300">Periodo de Gracia Activo</h4>
            <p className="text-sm text-amber-200/80">
              Tienes facturas pendientes. Tu servicio permanece activo, pero restan aproximadamente{" "}
              <span className="font-bold text-amber-200">{data.warnings.graceHoursRemaining ?? 24} horas</span> antes de que el espacio sea suspendido automáticamente.
            </p>
          </div>
        </div>
      )}

      {data?.warnings.cancelAtPeriodEnd && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="text-sm">
              Tu suscripción finalizará al término del periodo actual. Conservarás acceso operativo hasta esa fecha.
            </span>
          </div>
          <PremiumButton variant="outline" size="sm" onClick={handleResume}>
            Reanudar suscripción
          </PremiumButton>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Subscription Plan Overview */}
        <Card className="lg:col-span-1 border-zinc-800 bg-zinc-900/60 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-zinc-200 flex items-center justify-between">
              <span>Plan Actual</span>
              {data?.subscription && getStatusBadge(data.subscription.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-2xl font-bold text-zinc-100">{data?.plan?.name || "Sin Plan Activo"}</div>
              <div className="text-sm text-zinc-400 mt-1">
                {data?.plan ? (
                  <>
                    <span className="text-xl font-bold text-amber-400">
                      {formatPrice(data.plan.priceMinor, data.plan.currency)}
                    </span>{" "}
                    / {data.plan.billingPeriod === "YEARLY" ? "año" : "mes"}
                  </>
                ) : (
                  "N/A"
                )}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4 space-y-3 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-zinc-400">Estado Operativo</span>
                <span className={data?.isOperational ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
                  {data?.isOperational ? "Habilitado" : "Bloqueado"}
                </span>
              </div>
              {data?.subscription?.currentPeriodEnd && (
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Próxima Renovación</span>
                  <span className="text-zinc-200">
                    {new Date(data.subscription.currentPeriodEnd).toLocaleDateString("es-CO")}
                  </span>
                </div>
              )}
              {data?.subscription?.trialEndsAt && data.subscription.status === "TRIALING" && (
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Fin del Periodo de Prueba</span>
                  <span className="text-sky-300 font-medium">
                    {new Date(data.subscription.trialEndsAt).toLocaleDateString("es-CO")} (
                    {data.warnings.trialDaysRemaining} días)
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-800 pt-4 space-y-2">
              {!data?.subscription?.cancelAtPeriodEnd && data?.subscription?.status !== "CANCELLED" && (
                <button
                  onClick={handleCancelAtPeriodEnd}
                  className="w-full text-xs text-zinc-400 hover:text-rose-400 transition-colors py-2"
                >
                  Cancelar al final del periodo
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900/60 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              Historial de Facturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-zinc-500">Cargando facturas...</div>
            ) : !data?.latestInvoices || data.latestInvoices.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">No hay facturas registradas.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 text-zinc-400 uppercase text-xs">
                    <tr>
                      <th className="py-3 px-4">Factura</th>
                      <th className="py-3 px-4">Periodo</th>
                      <th className="py-3 px-4">Vencimiento</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {data.latestInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-zinc-200">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 text-xs text-zinc-400">
                          {new Date(inv.periodStart).toLocaleDateString("es-CO")} -{" "}
                          {new Date(inv.periodEnd).toLocaleDateString("es-CO")}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {new Date(inv.dueAt).toLocaleDateString("es-CO")}
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-100">
                          {formatPrice(inv.totalMinor, inv.currency)}
                        </td>
                        <td className="py-3 px-4">
                          {inv.status === "PAID" ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              PAGADA
                            </Badge>
                          ) : inv.status === "OPEN" ? (
                            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              PENDIENTE
                            </Badge>
                          ) : (
                            <Badge className="bg-zinc-800 text-zinc-400">{inv.status}</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {inv.status === "OPEN" && (
                            <PremiumButton
                              size="sm"
                              onClick={() => handlePayInvoice(inv.id)}
                              disabled={payingInvoiceId === inv.id}
                            >
                              {payingInvoiceId === inv.id ? "Procesando..." : "Pagar Ahora"}
                            </PremiumButton>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
