"use client";

import { useState } from "react";
import { Scissors, Plus, Clock, DollarSign, Check, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PremiumButton } from "@/components/ui/premium-button";

export default function ProfessionalServicesPage() {
  const [services, setServices] = useState([
    {
      id: "srv-1",
      name: "Corte de Autor Carlos Barber",
      description: "Corte signature adaptado a visagismo y estilo personalizado.",
      durationMinutes: 45,
      price: "$45.000",
      isActive: true,
    },
    {
      id: "srv-2",
      name: "Ritual Barba & Toalla Caliente",
      description: "Afeitado tradicional con toalla caliente, vapor y aceites esenciales.",
      durationMinutes: 35,
      price: "$35.000",
      isActive: true,
    },
    {
      id: "srv-3",
      name: "Combo Master: Corte + Barba",
      description: "Experiencia completa de corte de autor y ritual de barba.",
      durationMinutes: 60,
      price: "$75.000",
      isActive: true,
    },
    {
      id: "srv-4",
      name: "Diseño de Barba & Marcación Navaja",
      description: "Marcado y perfilado de líneas con navaja tradicional y gel calmante.",
      durationMinutes: 25,
      price: "$25.000",
      isActive: true,
    },
  ]);

  const toggleService = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-foreground">
            Catálogo de Servicios
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Define los servicios personales que ofreces, sus duraciones y tus tarifas.
          </p>
        </div>

        <PremiumButton size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo Servicio
        </PremiumButton>
      </div>

      {/* Services List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((s) => (
          <div
            key={s.id}
            className={`p-5 rounded-xl border transition-all space-y-3 ${
              s.isActive
                ? "border-border/60 bg-background/60 hover:border-amber-500/30"
                : "border-border/30 bg-muted/10 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">{s.name}</h3>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
              <Switch
                checked={s.isActive}
                onCheckedChange={() => toggleService(s.id)}
              />
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  {s.durationMinutes} min
                </span>
                <span className="font-mono font-bold text-foreground">
                  {s.price} COP
                </span>
              </div>

              <Button variant="ghost" size="sm" className="h-7 text-xs flex items-center gap-1">
                <Edit2 className="w-3 h-3" />
                Editar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
