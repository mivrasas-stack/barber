"use client";

import { useState } from "react";
import {
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Plus,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/ui/premium-button";

export default function BarberShopAffiliationsPage() {
  const [activeAffiliations, setActiveAffiliations] = useState([
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

  const [pendingRequests, setPendingRequests] = useState([
    {
      id: "req-1",
      professionalName: "Mateo 'Fade King' Rivera",
      professionalSlug: "mateo-fades",
      workspaceName: "Mateo Fade Studio",
      relationshipType: "COMMISSION",
      relationshipLabel: "Comisión (30% Sede / 70% Barbero)",
      requestedLocation: "Sede Parque 93",
      requestDate: "Hace 2 días",
    },
  ]);

  const handleApprove = (id: string) => {
    alert("Afiliación aprobada. El barbero ha sido habilitado en Sede Parque 93.");
    setPendingRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const handleReject = (id: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-foreground">
            Gestión de Barberos Afiliados
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Monetiza tus puestos de trabajo con profesionales independientes bajo contratos de alquiler de silla o comisión.
          </p>
        </div>

        <PremiumButton size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Invitar Barbero Independiente
        </PremiumButton>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="font-headline font-bold text-base text-foreground">
              Solicitudes de Afiliación Pendientes ({pendingRequests.length})
            </h3>
          </div>

          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-border/60 bg-background/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {req.professionalName}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                      {req.relationshipLabel}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2">
                    <span>Espacio: {req.workspaceName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-500" />
                      Solicita atender en: {req.requestedLocation}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => handleReject(req.id)}
                  >
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApprove(req.id)}
                  >
                    Aprobar & Scopar Sede
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Affiliations */}
      <div className="space-y-4">
        <h3 className="font-headline font-bold text-xl text-foreground">
          Profesionales Activos en tus Sedes ({activeAffiliations.length})
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {activeAffiliations.map((aff) => (
            <div
              key={aff.id}
              className="p-6 rounded-2xl border border-border/60 bg-background/60 space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-lg text-foreground">
                      {aff.professionalName}
                    </h4>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                      {aff.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Workspace comercial: <span className="font-medium text-foreground">{aff.workspaceName}</span> (/{aff.professionalSlug})
                  </p>
                </div>

                <Badge variant="outline" className="text-xs py-1 border-amber-500/30 text-amber-500 w-fit">
                  {aff.relationshipLabel}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/40 text-xs">
                <div>
                  <span className="font-semibold text-foreground">Sedes Autorizadas:</span>
                  <div className="mt-1 space-y-1">
                    {aff.approvedLocations.map((loc, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        <span>{loc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-foreground">Términos Comerciales:</span>
                  <p className="text-muted-foreground mt-1">{aff.terms}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Afiliado desde: {aff.joinedAt}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <span className="text-[11px] text-emerald-500 font-mono">
                  Sincronización de agenda activa anti doble-booking
                </span>
                <Button variant="outline" size="sm" className="h-8 text-xs text-muted-foreground hover:text-destructive">
                  Finalizar Afiliación
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
