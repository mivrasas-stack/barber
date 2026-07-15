"use client";
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dummyAppointments } from "@/app/dashboard/data";
import { Calendar, Search, Filter, Clock, MapPin, User, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PremiumButton } from "@/components/ui/premium-button";

export default function AdminAppointments() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input 
                placeholder="Buscar por cliente, barbero o servicio..." 
                className="w-full bg-white/5 border-white/10 text-white pl-10 focus-visible:ring-primary h-12"
              />
          </div>
      </div>

      {/* Appointments List */}
      <Card className="bg-white/[0.02] border-white/10 overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-4 bg-white/[0.01]">
            <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Reservas del Día
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase">Hora</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase">Cliente</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase">Barbero</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase">Servicio</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase text-right">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {dummyAppointments.map(app => (
                            <tr key={app.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-white">
                                        <Clock className="w-4 h-4 text-primary" />
                                        <span className="font-headline tracking-widest">{app.date.split(' ')[1]}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="font-headline text-white tracking-wide">{app.customerName}</div>
                                    <div className="text-[10px] tracking-widest text-white/40 uppercase">{app.customerEmail}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-white/40" />
                                        <span className="font-light text-white">{app.barberId}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-white/80 font-light">
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
            {dummyAppointments.length === 0 && (
                <div className="p-12 text-center text-white/40 font-light">
                    No hay reservas para mostrar.
                </div>
            )}
        </CardContent>
      </Card>

    </div>
  );
}
