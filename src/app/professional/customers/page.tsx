"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Plus,
  Phone,
  Calendar,
  Clock,
  Sparkles,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/ui/premium-button";

export default function ProfessionalCustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const customers = [
    {
      id: "cust-1",
      name: "Andrés Silva",
      email: "andres.silva@email.com",
      phone: "+57 310 987 6543",
      totalAppointments: 14,
      lastSeen: "Hace 12 días",
      notes: "Corte clásico tijera arriba, degradado 1.5 a los lados. Prefiere producto mate.",
      status: "ACTIVE",
    },
    {
      id: "cust-2",
      name: "Santiago Gómez",
      email: "santiago.gomez@email.com",
      phone: "+57 320 123 4567",
      totalAppointments: 8,
      lastSeen: "Hace 3 semanas",
      notes: "Ritual completo de barba, piel sensible en el cuello, usar toalla tibia.",
      status: "ACTIVE",
    },
    {
      id: "cust-3",
      name: "Felipe Restrepo",
      email: "felipe.restrepo@email.com",
      phone: "+57 301 555 7890",
      totalAppointments: 3,
      lastSeen: "Ayer",
      notes: "Cliente nuevo referenciado por Instagram. Le gusta estilo moderno con raya marcada.",
      status: "ACTIVE",
    },
    {
      id: "cust-4",
      name: "Mauricio Castro",
      email: "mauricio.castro@email.com",
      phone: "+57 315 444 1122",
      totalAppointments: 22,
      lastSeen: "Hace 5 días",
      notes: "Cliente VIP de fin de semana. Viene cada 15 días sagrado.",
      status: "ACTIVE",
    },
  ];

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-headline font-bold text-foreground">
              Directorio de Clientes
            </h1>
            <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
              Cartera Propia
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tu base de datos personal. Estos clientes te pertenecen exclusivamente a ti y a tu Workspace.
          </p>
        </div>

        <PremiumButton size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo Cliente
        </PremiumButton>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="pl-9 h-9 text-xs"
        />
      </div>

      {/* Customers Table / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-xl border border-border/60 bg-background/60 hover:border-amber-500/30 transition-all space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground">{c.name}</h3>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {c.phone}
                  </span>
                  <span>•</span>
                  <span>{c.email}</span>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {c.totalAppointments} citas
              </Badge>
            </div>

            {c.notes && (
              <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs text-muted-foreground flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span className="italic">{c.notes}</span>
              </div>
            )}

            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Última visita: {c.lastSeen}</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-500 hover:text-amber-400 p-0">
                Ver historial &rarr;
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
