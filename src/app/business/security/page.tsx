"use client";
import React from 'react';
import { Lock, ShieldAlert, KeyRound, Activity } from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";

export default function SecurityPage() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase flex items-center gap-4">
            Seguridad
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-pulse" />
          </h1>
          <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Centro de protección y auditoría del sistema.
          </p>
        </div>
        <PremiumButton variant="outline" className="w-full md:w-auto px-8">
          Descargar Logs
        </PremiumButton>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-foreground/5 border border-border rounded-2xl p-6 flex flex-col gap-4 group hover:border-primary/50 transition-colors">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-headline text-foreground tracking-widest uppercase">2FA</h3>
            <p className="text-xs text-muted-foreground font-light mt-1">Autenticación de 2 factores requerida para administradores.</p>
          </div>
          <div className="mt-auto pt-4 border-t border-border">
            <span className="text-xs font-medium text-green-500 bg-green-500/10 px-3 py-1 rounded-full uppercase tracking-wider">Obligatorio</span>
          </div>
        </div>

        <div className="bg-foreground/5 border border-border rounded-2xl p-6 flex flex-col gap-4 group hover:border-primary/50 transition-colors">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-headline text-foreground tracking-widest uppercase">Políticas</h3>
            <p className="text-xs text-muted-foreground font-light mt-1">Rotación de contraseñas y requisitos de complejidad.</p>
          </div>
          <div className="mt-auto pt-4 border-t border-border">
            <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">Estricto</span>
          </div>
        </div>

        <div className="bg-foreground/5 border border-border rounded-2xl p-6 flex flex-col gap-4 group hover:border-primary/50 transition-colors">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-headline text-foreground tracking-widest uppercase">Auditoría</h3>
            <p className="text-xs text-muted-foreground font-light mt-1">Registro de inicios de sesión y acciones críticas.</p>
          </div>
          <div className="mt-auto pt-4 border-t border-border">
            <span className="text-xs font-medium text-foreground/60 bg-foreground/5 px-3 py-1 rounded-full uppercase tracking-wider">Registrando</span>
          </div>
        </div>
      </div>

      <div className="bg-foreground/5 border border-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border bg-black/20">
          <h2 className="text-lg font-headline text-foreground tracking-widest uppercase">Actividad Reciente</h2>
        </div>
        <div className="p-0">
          <div className="divide-y divide-white/5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 flex items-center justify-between hover:bg-foreground/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-foreground/40" />
                  </div>
                  <div>
                    <p className="text-sm font-headline text-foreground tracking-wide">Inicio de sesión exitoso</p>
                    <p className="text-xs text-muted-foreground font-light">Super Admin • IP: 192.168.1.{i}2</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-foreground/60">Hace {i * 2} horas</p>
                  <p className="text-[10px] text-green-500 uppercase tracking-widest mt-1">Autorizado</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
