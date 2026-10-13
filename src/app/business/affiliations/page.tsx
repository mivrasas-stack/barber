"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  AlertCircle,
  PauseCircle,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/ui/premium-button";

interface AffiliationItem {
  id: string;
  professionalName: string;
  professionalSlug: string;
  workspaceName: string;
  relationshipType: string;
  relationshipLabel: string;
  approvedLocations: string[];
  terms?: string;
  status: "ACTIVE" | "REQUESTED" | "SUSPENDED" | "ENDED";
  joinedAt?: string;
}

export default function HostAffiliationsAdminPage() {
  const [activeAffiliations, setActiveAffiliations] = useState<AffiliationItem[]>([
    {
      id: "aff-carlos",
      professionalName: "Carlos 'The Barber' Mendoza",
      professionalSlug: "carlos-barber",
      workspaceName: "Carlos Barber Studio",
      relationshipType: "CHAIR_RENTAL",
      relationshipLabel: "Alquiler de Silla",
      approvedLocations: ["Sede Zona G (Calle 69 # 4-50)"],
      terms: "Alquiler fijo: $1.500.000 COP / mes",
      status: "ACTIVE",
      joinedAt: "1 de Octubre, 2026",
    },
  ]);

  const [pendingRequests, setPendingRequests] = useState<AffiliationItem[]>([
    {
      id: "req-mateo",
      professionalName: "Mateo 'Fade King' Rivera",
      professionalSlug: "mateo-fades",
      workspaceName: "Mateo Fade Studio",
      relationshipType: "COMMISSION",
      relationshipLabel: "Comisión (30% Sede / 70% Barbero)",
      approvedLocations: ["Sede Parque 93"],
      status: "REQUESTED",
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/affiliations/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No tienes permisos de Administrador/Dueño para aprobar esta afiliación");
      }
      const approved = pendingRequests.find((r) => r.id === id);
      if (approved) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== id));
        setActiveAffiliations((prev) => [...prev, { ...approved, status: "ACTIVE" }]);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspend = async (id: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/affiliations/${id}/suspend`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al suspender afiliación");
      }
      setActiveAffiliations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "SUSPENDED" } : a))
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnd = async (id: string) => {
    if (!confirm("¿Seguro que deseas finalizar esta afiliación? El barbero ya no podrá reservar en tus sedes.")) {
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/affiliations/${id}/end`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al terminar afiliación");
      }
      setActiveAffiliations((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/5">
              Administración de Sede Anfitriona
            </Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Profesionales Afiliados & Alquiler de Sillas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona los barberos independientes autorizados para operar físicamente en tus locales comerciales.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Activos en Silla</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-foreground">
            {activeAffiliations.filter((a) => a.status === "ACTIVE").length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Profesionales operando hoy</p>
        </div>

        <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Solicitudes Pendientes</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-foreground">{pendingRequests.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Esperando aprobación de gerencia</p>
        </div>

        <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sedes Habilitadas</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-black text-foreground">2</div>
          <p className="text-xs text-muted-foreground mt-1">Zona G & Parque 93</p>
        </div>
      </div>

      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-foreground">Solicitudes de Afiliación Entrantes</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-foreground">{req.professionalName}</span>
                    <Badge variant="secondary" className="text-xs font-mono">
                      @{req.professionalSlug}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">
                      {req.relationshipLabel}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> {req.workspaceName}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Sede: {req.approvedLocations.join(", ")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingRequests((prev) => prev.filter((r) => r.id !== req.id))}
                    disabled={isLoading}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Rechazar
                  </Button>
                  <PremiumButton
                    size="sm"
                    onClick={() => handleApprove(req.id)}
                    disabled={isLoading}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Aprobar y Habilitar Sede
                  </PremiumButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Affiliations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-foreground">Profesionales Activos en tus Sedes</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {activeAffiliations.map((aff) => (
            <div
              key={aff.id}
              className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-foreground text-base">{aff.professionalName}</span>
                  <Badge variant="secondary" className="text-xs font-mono">
                    @{aff.professionalSlug}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      aff.status === "ACTIVE"
                        ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                        : "border-amber-500/40 text-amber-400 bg-amber-500/10"
                    }
                  >
                    {aff.status === "ACTIVE" ? "Activo" : "Suspendido"}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    {aff.relationshipLabel}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> Espacio: {aff.workspaceName}
                  </span>
                  <span className="flex items-center gap-1 text-primary">
                    <MapPin className="w-3.5 h-3.5" /> Sedes Aprobadas: {aff.approvedLocations.join(", ")}
                  </span>
                  {aff.terms && <span className="font-mono text-foreground/80">{aff.terms}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {aff.status === "ACTIVE" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuspend(aff.id)}
                    disabled={isLoading}
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
                  >
                    <PauseCircle className="w-3.5 h-3.5 mr-1.5" /> Pausar / Suspender
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActiveAffiliations((prev) =>
                        prev.map((a) => (a.id === aff.id ? { ...a, status: "ACTIVE" } : a))
                      )
                    }
                    disabled={isLoading}
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Reactivar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnd(aff.id)}
                  disabled={isLoading}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs"
                >
                  <Ban className="w-3.5 h-3.5 mr-1.5" /> Finalizar Contrato
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
