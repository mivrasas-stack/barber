"use client";

import { useState } from "react";
import {
  Building2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/ui/premium-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfessionalAffiliationsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [hostSlug, setHostSlug] = useState("");
  const [relationshipType, setRelationshipType] = useState("CHAIR_RENTAL");

  const affiliations = [
    {
      id: "aff-1",
      hostName: "The Royal Barber Shop",
      hostSlug: "the-royal-barber",
      status: "ACTIVE",
      relationshipType: "CHAIR_RENTAL",
      relationshipLabel: "Alquiler de Silla (Chair Rental)",
      locations: ["Sede Zona G (Calle 69 # 4-50, Bogotá)"],
      terms: "Canon fijo mensual: $1.500.000 COP",
      startDate: "1 de Octubre, 2026",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-foreground">
            Sedes y Barberías Afiliadas
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Administra los establecimientos anfitriones donde tienes autorización física para atender.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <PremiumButton size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Solicitar Nueva Afiliación
            </PremiumButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular a Barbería Anfitriona</DialogTitle>
              <DialogDescription className="text-xs">
                Ingresa el identificador o slug de la barbería anfitriona para enviar la solicitud de afiliación.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="host">Slug de la Barbería Anfitriona</Label>
                <Input
                  id="host"
                  value={hostSlug}
                  onChange={(e) => setHostSlug(e.target.value)}
                  placeholder="ej. gentleman-club"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Modelo de Relación Comercial</Label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  className="w-full bg-background border border-border/60 rounded-md p-2 text-xs"
                >
                  <option value="CHAIR_RENTAL">Alquiler de Silla (Canon Fijo)</option>
                  <option value="COMMISSION">Comisión por Servicio</option>
                  <option value="HYBRID">Híbrido (Alquiler + Comisión)</option>
                  <option value="CONTRACTOR">Contratista Independiente</option>
                  <option value="GUEST">Barbero Invitado (Guest Spot)</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <PremiumButton
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  alert("Solicitud de afiliación enviada a la sede anfitriona.");
                }}
              >
                Enviar Solicitud
              </PremiumButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Affiliations Cards */}
      <div className="space-y-4">
        {affiliations.map((aff) => (
          <div
            key={aff.id}
            className="p-6 rounded-2xl border border-border/60 bg-background/60 space-y-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline font-bold text-lg text-foreground">
                    {aff.hostName}
                  </h3>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                    {aff.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  Slug: {aff.hostSlug}
                </div>
              </div>

              <Badge variant="outline" className="text-xs py-1 border-amber-500/30 text-amber-500 w-fit">
                {aff.relationshipLabel}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/40 text-xs">
              <div className="space-y-2">
                <span className="font-semibold text-foreground">Sedes Físicas Autorizadas:</span>
                {aff.locations.map((loc, li) => (
                  <div key={li} className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{loc}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-foreground">Términos de Liquidación:</span>
                <p className="text-muted-foreground">{aff.terms}</p>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Vigente desde: {aff.startDate}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Callout */}
      <div className="p-5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-start gap-3 text-xs text-muted-foreground">
        <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-foreground">Protección de Tu Cartera y Entidad Comercial:</strong>
          <p className="leading-relaxed">
            Estar afiliado a una barbería te autoriza a atender en sus instalaciones físicas, pero tus clientes, servicios y facturación comercial son propiedad exclusiva de tu Workspace Solo. Si decides desvincularte en el futuro, no pierdes tus clientes ni tu historial.
          </p>
        </div>
      </div>
    </div>
  );
}
