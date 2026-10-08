"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/ui/premium-button";

interface PaymentIntent {
  id: string;
  orderId: string;
  collectorTenantId: string;
  provider: string;
  amountMinor: string;
  currency: string;
  status: string;
  providerReference: string | null;
  providerTransactionId: string | null;
  paymentMethodType: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentIntent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Refund Modal State
  const [refundTarget, setRefundTarget] = useState<PaymentIntent | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("Devolución solicitada por el cliente");

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/payments/intents");
      if (res.ok) {
        const json = await res.json();
        setPayments(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load payments", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleReconcile = async (intentId: string) => {
    setActionLoading(`reconcile-${intentId}`);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/payments/intents/${intentId}/reconcile`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          message: `Reconciliación completada: ${data.data?.message || data.data?.reconciliationStatus}`,
          type: "success",
        });
        await loadPayments();
      } else {
        setFeedback({
          message: `Error al reconciliar: ${data.error}`,
          type: "error",
        });
      }
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefundSubmit = async () => {
    if (!refundTarget) return;
    setActionLoading("submitting-refund");
    setFeedback(null);
    try {
      const amountMinor = refundAmount
        ? (BigInt(Math.round(parseFloat(refundAmount) * 100))).toString()
        : refundTarget.amountMinor;

      const res = await fetch(`/api/v1/payments/intents/${refundTarget.id}/refunds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountMinor,
          reason: refundReason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({
          message: `Reembolso procesado exitosamente por $${(Number(amountMinor) / 100).toLocaleString("es-CO")} COP`,
          type: "success",
        });
        setRefundTarget(null);
        setRefundAmount("");
        await loadPayments();
      } else {
        setFeedback({
          message: `Error en reembolso: ${data.error}`,
          type: "error",
        });
      }
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanExpired = async () => {
    setActionLoading("clean-expired");
    try {
      const res = await fetch("/api/v1/payments/reservations/expire", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          message: `Se liberaron ${data.data?.expiredCount || 0} reservas de inventario expiradas`,
          type: "success",
        });
        await loadPayments();
      }
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = payments.filter((p) => {
    const matchesSearch =
      (p.providerReference && p.providerReference.toLowerCase().includes(search.toLowerCase())) ||
      (p.providerTransactionId && p.providerTransactionId.toLowerCase().includes(search.toLowerCase())) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCEEDED":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">APROBADO</Badge>;
      case "PROCESSING":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">PROCESANDO</Badge>;
      case "REQUIRES_PAYMENT_METHOD":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">PENDIENTE</Badge>;
      case "FAILED":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">RECHAZADO</Badge>;
      case "CANCELED":
        return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">CANCELADO</Badge>;
      case "EXPIRED":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">EXPIRADO</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-headline uppercase tracking-wider text-foreground">
                Pagos Digitales & Pasarela
              </h1>
              <p className="text-xs text-muted-foreground">
                Gestión de cobros Wompi, reconciliaciones bancarias y reembolsos
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCleanExpired}
            disabled={actionLoading === "clean-expired"}
            className="px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-foreground/5 flex items-center gap-2 text-muted-foreground transition"
          >
            <Clock className="w-3.5 h-3.5" />
            Liberar Reservas Expiradas
          </button>
          <PremiumButton
            onClick={loadPayments}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </PremiumButton>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="hover:underline font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <Card className="border-border bg-card/60 backdrop-blur-xl">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por referencia, ID de transacción o intento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-foreground/5 border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-foreground/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="SUCCEEDED">Aprobados</option>
              <option value="PROCESSING">Procesando</option>
              <option value="REQUIRES_PAYMENT_METHOD">Pendientes</option>
              <option value="FAILED">Rechazados</option>
              <option value="CANCELED">Cancelados</option>
              <option value="EXPIRED">Expirados</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="border-border bg-card/60 backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-foreground/5 border-b border-border uppercase text-[10px] tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Referencia / ID</th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4">Monto</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Cargando transacciones de pago...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No se encontraron transacciones registradas.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-foreground/[0.02] transition">
                    <td className="py-3 px-4">
                      <div className="font-mono font-medium text-foreground">
                        {p.providerReference || p.id.slice(0, 12)}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        TX: {p.providerTransactionId || "N/A"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px]">
                        {p.provider}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      ${(Number(p.amountMinor) / 100).toLocaleString("es-CO")} {p.currency}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(p.status)}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {p.paymentMethodType || "DESCONOCIDO"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleString("es-CO", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReconcile(p.id)}
                          disabled={actionLoading === `reconcile-${p.id}`}
                          title="Reconciliar con proveedor bancario"
                          className="p-1.5 rounded-lg border border-border hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              actionLoading === `reconcile-${p.id}` ? "animate-spin" : ""
                            }`}
                          />
                        </button>
                        {p.status === "SUCCEEDED" && (
                          <button
                            onClick={() => {
                              setRefundTarget(p);
                              setRefundAmount((Number(p.amountMinor) / 100).toString());
                            }}
                            title="Emitir reembolso"
                            className="p-1.5 rounded-lg border border-border hover:bg-amber-500/10 text-amber-500 transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-headline tracking-widest text-lg uppercase text-foreground">
                Reembolsar Transacción
              </h3>
              <button
                onClick={() => setRefundTarget(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-foreground/5 border border-border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Referencia:</span>
                  <span className="font-mono">{refundTarget.providerReference || refundTarget.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Capturado:</span>
                  <span className="font-mono font-bold text-primary">
                    ${(Number(refundTarget.amountMinor) / 100).toLocaleString("es-CO")} COP
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Monto a Reembolsar (COP)
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full bg-foreground/5 border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  placeholder="Ej: 35000"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Motivo de Reembolso
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={2}
                  className="w-full bg-foreground/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setRefundTarget(null)}
                  className="px-4 py-2 rounded-xl border border-border text-xs hover:bg-foreground/5"
                >
                  Cancelar
                </button>
                <PremiumButton
                  onClick={handleRefundSubmit}
                  disabled={actionLoading === "submitting-refund"}
                  className="text-xs"
                >
                  Confirmar Reembolso
                </PremiumButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
