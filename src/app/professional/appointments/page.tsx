"use client";

import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Filter,
  Plus,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/ui/premium-button";

export default function ProfessionalAppointmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const appointmentsList = [
    {
      id: "app-1",
      customerName: "Andrés Silva",
      customerPhone: "+57 310 987 6543",
      serviceName: "Corte de Autor Carlos Barber",
      date: "Mañana, 10:00 AM - 10:45 AM",
      location: "The Royal Barber - Zona G",
      status: "CONFIRMED",
      price: "$45.000",
      notes: "Cliente recurrente. Prefiere tijera en la parte superior.",
    },
    {
      id: "app-2",
      customerName: "Santiago Gómez",
      customerPhone: "+57 320 123 4567",
      serviceName: "Combo Master: Corte + Barba",
      date: "Mañana, 11:30 AM - 12:30 PM",
      location: "The Royal Barber - Zona G",
      status: "CONFIRMED",
      price: "$75.000",
      notes: "Perfilado de barba con navaja.",
    },
    {
      id: "app-3",
      customerName: "Felipe Restrepo",
      customerPhone: "+57 301 555 7890",
      serviceName: "Ritual Barba & Toalla Caliente",
      date: "Mañana, 03:00 PM - 03:35 PM",
      location: "The Royal Barber - Zona G",
      status: "PENDING",
      price: "$35.000",
      notes: "Cita agendada online.",
    },
    {
      id: "app-4",
      customerName: "Mauricio Castro",
      customerPhone: "+57 315 444 1122",
      serviceName: "Corte de Autor Carlos Barber",
      date: "Viernes, 04:00 PM - 04:45 PM",
      location: "The Royal Barber - Zona G",
      status: "CONFIRMED",
      price: "$45.000",
      notes: "Degradado medio en punta.",
    },
  ];

  const filtered = appointmentsList.filter((a) => {
    const matchesSearch =
      a.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.serviceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-foreground">
            Mi Agenda de Citas
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gestiona tus reservas individuales y citas sincronizadas entre sedes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PremiumButton size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Cita Manual
          </PremiumButton>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente o servicio..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "CONFIRMED", "PENDING", "COMPLETED"].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className="text-xs h-9 px-3"
            >
              {st === "ALL" && "Todas"}
              {st === "CONFIRMED" && "Confirmadas"}
              {st === "PENDING" && "Pendientes"}
              {st === "COMPLETED" && "Completadas"}
            </Button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-border/60 text-muted-foreground text-xs">
            No se encontraron citas con los filtros seleccionados.
          </div>
        ) : (
          filtered.map((appt) => (
            <div
              key={appt.id}
              className="p-5 rounded-xl border border-border/60 bg-background/60 hover:border-amber-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {appt.date}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] py-0 ${
                      appt.status === "CONFIRMED"
                        ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                        : "text-amber-500 border-amber-500/30 bg-amber-500/10"
                    }`}
                  >
                    {appt.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-foreground">
                    {appt.customerName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({appt.customerPhone})
                  </span>
                </div>

                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground/80">{appt.serviceName}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-muted-foreground" />
                    {appt.location}
                  </span>
                </div>

                {appt.notes && (
                  <p className="text-[11px] text-muted-foreground italic pt-0.5">
                    &ldquo;{appt.notes}&rdquo;
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 self-end md:self-center">
                <div className="font-mono font-bold text-sm text-foreground text-right mr-2">
                  {appt.price}
                </div>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  Detalles
                </Button>
                {appt.status === "PENDING" && (
                  <Button size="sm" className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white">
                    Confirmar
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
