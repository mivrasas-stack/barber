"use client";
import React from 'react';
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ShieldCheck, UserCheck, Key, RefreshCcw } from "lucide-react";

export default function RolesPage() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
          Roles y Permisos
        </h1>
        <p className="text-muted-foreground font-light mt-2 tracking-wide">
          Gestiona los niveles de acceso del personal.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 group hover:border-primary/50 transition-colors">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <UserCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-white font-headline tracking-wider">Super Admin</p>
            <p className="text-xs text-muted-foreground mt-1">Acceso total</p>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 group hover:border-primary/50 transition-colors">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-white font-headline tracking-wider">Gerente Sede</p>
            <p className="text-xs text-muted-foreground mt-1">Limitado por sede</p>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 group hover:border-primary/50 transition-colors">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-white font-headline tracking-wider">Barbero</p>
            <p className="text-xs text-muted-foreground mt-1">Solo agenda propia</p>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 group hover:border-white/20 transition-colors cursor-pointer border-dashed">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
            <RefreshCcw className="w-6 h-6 text-white/40 group-hover:text-white" />
          </div>
          <div>
            <p className="text-white/40 font-headline tracking-wider group-hover:text-white">Nuevo Rol</p>
            <p className="text-xs text-muted-foreground mt-1">Crear personalizado</p>
          </div>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 min-h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground font-light tracking-wide text-sm">El panel detallado de permisos estará disponible próximamente.</p>
      </div>
    </div>
  );
}
