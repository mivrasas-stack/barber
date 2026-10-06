"use client";
import React from 'react';
import { BellRing, Mail, MessageSquare, Megaphone } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
          Notificaciones
        </h1>
        <p className="text-muted-foreground font-light mt-2 tracking-wide">
          Configura y envía alertas a clientes y equipo.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-foreground/5 border border-border rounded-2xl p-8 flex flex-col gap-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-headline text-foreground tracking-widest uppercase">SMS & WhatsApp</p>
              <p className="text-xs text-muted-foreground font-light">Recordatorios de citas</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-border">
            <span className="text-sm font-light text-foreground/60">Estado</span>
            <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full uppercase tracking-wider">Activo</span>
          </div>
        </div>

        <div className="bg-foreground/5 border border-border rounded-2xl p-8 flex flex-col gap-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-headline text-foreground tracking-widest uppercase">Email Marketing</p>
              <p className="text-xs text-muted-foreground font-light">Campañas y Promociones</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-border">
            <span className="text-sm font-light text-foreground/60">Estado</span>
            <span className="text-xs font-medium text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full uppercase tracking-wider">Pausado</span>
          </div>
        </div>

        <div className="bg-foreground/5 border border-border rounded-2xl p-8 flex flex-col gap-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-headline text-foreground tracking-widest uppercase">Push App</p>
              <p className="text-xs text-muted-foreground font-light">Notificaciones in-app</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-border">
            <span className="text-sm font-light text-foreground/60">Estado</span>
            <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full uppercase tracking-wider">Activo</span>
          </div>
        </div>
      </div>

      <div className="bg-foreground/5 border border-border rounded-2xl p-8">
        <h2 className="text-xl font-headline text-foreground tracking-widest uppercase mb-6">Historial Reciente</h2>
        <div className="flex items-center justify-center min-h-[200px] border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground font-light tracking-wide text-sm">No hay campañas enviadas en los últimos 7 días.</p>
        </div>
      </div>
    </div>
  );
}
