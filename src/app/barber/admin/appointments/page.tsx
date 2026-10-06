"use client";
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dummyAppointments } from "@/app/clientes/data";
import { Calendar, Search, Filter, Clock, User, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PremiumButton } from "@/components/ui/premium-button";

interface AppointmentItem {
  id: string;
  customerName: string;
  customerEmail: string;
  barberId: string;
  service: string;
  date: string;
  status: string;
}

export default function AdminAppointments() {
  const [appointmentsList, setAppointmentsList] = useState<AppointmentItem[]>(dummyAppointments);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadAppointments() {
      try {
        setLoading(true);
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) return;
        const meData = await meRes.json();
        const tenantId = meData?.activeTenantId;
        if (!tenantId) return;

        const apptRes = await fetch(`/api/v1/appointments?tenantId=${tenantId}`);
        if (!apptRes.ok) return;
        const apptData = await apptRes.json();

        if (Array.isArray(apptData?.data) && apptData.data.length > 0) {
          const mapped: AppointmentItem[] = apptData.data.map((item: any) => {
            const apt = item.appointment;
            const primaryService = item.services?.[0]?.serviceNameSnapshot || "Servicio General";
            const dateObj = new Date(apt.startsAt);
            const timeStr = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toISOString().split('T')[0] + ' ' + timeStr;

            let statusLabel = 'Confirmada';
            if (apt.status === 'PENDING') statusLabel = 'Pendiente';
            if (apt.status === 'CANCELLED') statusLabel = 'Cancelada';
            if (apt.status === 'COMPLETED') statusLabel = 'Completada';

            return {
              id: apt.id,
              customerName: apt.customerNameSnapshot,
              customerEmail: apt.customerEmailSnapshot || 'Sin email',
              barberId: apt.staffId ? `Staff ${apt.staffId.slice(0, 6)}` : 'Por asignar',
              service: primaryService,
              date: dateStr,
              status: statusLabel,
            };
          });
          setAppointmentsList(mapped);
        }
      } catch (err) {
        console.error("Failed to load appointments:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, []);

  const filtered = appointmentsList.filter(app => {
    const q = searchQuery.toLowerCase();
    return (
      app.customerName.toLowerCase().includes(q) ||
      app.customerEmail.toLowerCase().includes(q) ||
      app.service.toLowerCase().includes(q) ||
      app.barberId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Agenda Global
            </h1>
            <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Control centralizado de reservaciones de todas las sedes.
            </p>
        </div>
        <div className="flex gap-4">
            <PremiumButton variant="outline" className="flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filtrar
            </PremiumButton>
            <PremiumButton>Nueva Reserva</PremiumButton>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, barbero o servicio..." 
                className="w-full bg-foreground/5 border-border text-foreground pl-10 focus-visible:ring-primary h-12"
              />
          </div>
      </div>

      {/* Appointments List */}
      <Card className="bg-foreground/5 border-border overflow-hidden">
        <CardHeader className="border-b border-border pb-4 bg-white/[0.01]">
            <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {loading ? "Cargando reservas..." : `Reservas (${filtered.length})`}
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-foreground/5">
                            <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Hora / Fecha</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Cliente</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Barbero</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Servicio</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase text-right">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filtered.map(app => (
                            <tr key={app.id} className="hover:bg-foreground/5 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-foreground">
                                        <Clock className="w-4 h-4 text-primary" />
                                        <span className="font-headline tracking-widest">
                                          {app.date.includes(' ') ? app.date.split(' ')[1] : app.date}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="font-headline text-foreground tracking-wide">{app.customerName}</div>
                                    <div className="text-[10px] tracking-widest text-foreground/40 uppercase">{app.customerEmail}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-foreground/40" />
                                        <span className="font-light text-foreground">{app.barberId}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-foreground/80 font-light">
                                    {app.service}
                                </td>
                                <td className="p-4 text-right">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-headline tracking-widest uppercase border ${
                                        app.status === 'Pendiente' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                        app.status === 'Cancelada' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                        'bg-green-500/10 text-green-500 border-green-500/20'
                                    }`}>
                                        {app.status === 'Pendiente' ? <Clock className="w-3 h-3" /> : 
                                         app.status === 'Cancelada' ? <XCircle className="w-3 h-3" /> : 
                                         <CheckCircle2 className="w-3 h-3" />}
                                        {app.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filtered.length === 0 && (
                <div className="p-12 text-center text-foreground/40 font-light">
                    No hay reservas para mostrar.
                </div>
            )}
        </CardContent>
      </Card>

    </div>
  );
}
