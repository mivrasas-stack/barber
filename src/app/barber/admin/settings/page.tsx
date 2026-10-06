"use client";
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, Store, Bell, Lock, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PremiumButton } from "@/components/ui/premium-button";
import Link from 'next/link';
import { useState } from 'react';

const PremiumToggle = ({ checked, onChange }: { checked: boolean, onChange: (checked: boolean) => void }) => {
  return (
    <div 
      onClick={() => onChange(!checked)}
      className={`relative w-14 h-7 rounded-full cursor-pointer transition-all duration-500 ease-out flex items-center p-1 border backdrop-blur-sm ${
        checked 
          ? 'bg-primary/20 border-primary/50 shadow-[inset_0_0_10px_rgba(200,155,60,0.2),0_0_15px_rgba(200,155,60,0.4)]' 
          : 'bg-foreground/5 border-border hover:bg-foreground/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]'
      }`}
    >
      <div 
        className={`w-5 h-5 rounded-full transition-all duration-500 ease-out flex items-center justify-center ${
          checked 
            ? 'translate-x-7 bg-primary shadow-[0_0_10px_rgba(200,155,60,0.8)] scale-100' 
            : 'translate-x-0 bg-white/40 scale-90 hover:scale-100 hover:bg-white/60'
        }`}
      >
        {checked && (
          <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default function AdminSettings() {
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [manualApproval, setManualApproval] = useState(false);
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Configuración Global
            </h1>
            <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Administración de preferencias del sistema y sedes.
            </p>
        </div>
        <div className="flex gap-4">
            <PremiumButton>Guardar Cambios</PremiumButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Settings Nav (Sidebar-ish) */}
          <div className="md:col-span-3 space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl transition-colors">
                  <Store className="w-5 h-5" />
                  <span className="font-light tracking-wide text-sm">Información de Sede</span>
              </button>
              <Link href="/barber/admin/roles" className="w-full flex items-center gap-3 px-4 py-3 text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-colors">
                  <Users className="w-5 h-5" />
                  <span className="font-light tracking-wide text-sm">Roles y Permisos</span>
              </Link>
              <Link href="/barber/admin/notifications" className="w-full flex items-center gap-3 px-4 py-3 text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="font-light tracking-wide text-sm">Notificaciones</span>
              </Link>
              <Link href="/barber/admin/security" className="w-full flex items-center gap-3 px-4 py-3 text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-colors">
                  <Lock className="w-5 h-5" />
                  <span className="font-light tracking-wide text-sm">Seguridad</span>
              </Link>
          </div>

          {/* Settings Content */}
          <div className="md:col-span-9 space-y-6">
              
              <Card className="bg-foreground/5 border-border">
                  <CardHeader className="border-b border-border pb-4">
                      <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                          <Store className="w-4 h-4 text-primary" />
                          Detalles de la Franquicia
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                              <label className="text-[10px] font-headline tracking-widest text-foreground/40 uppercase">Nombre de la Empresa</label>
                              <Input defaultValue="BarberParadise Inc." className="bg-foreground/5 border-border text-foreground h-12" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-headline tracking-widest text-foreground/40 uppercase">NIT / RUC</label>
                              <Input defaultValue="900.123.456-7" className="bg-foreground/5 border-border text-foreground h-12" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-headline tracking-widest text-foreground/40 uppercase">Correo de Contacto</label>
                              <Input defaultValue="admin@barberparadise.com" type="email" className="bg-foreground/5 border-border text-foreground h-12" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-headline tracking-widest text-foreground/40 uppercase">Teléfono Principal</label>
                              <Input defaultValue="+57 300 123 4567" className="bg-foreground/5 border-border text-foreground h-12" />
                          </div>
                      </div>
                  </CardContent>
              </Card>

              <Card className="bg-foreground/5 border-border">
                  <CardHeader className="border-b border-border pb-4">
                      <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                          <Settings className="w-4 h-4 text-primary" />
                          Preferencias del Sistema
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                      <div className="group flex items-center justify-between p-4 md:p-5 border border-border bg-gradient-to-r from-foreground/[0.02] to-transparent hover:from-foreground/[0.04] hover:to-foreground/[0.01] hover:border-border rounded-2xl transition-all duration-500">
                          <div>
                              <p className="font-headline tracking-wide text-foreground group-hover:text-primary transition-colors duration-300">Recordatorios SMS</p>
                              <p className="text-xs font-light text-foreground/50 mt-1">Enviar SMS a los clientes 24h antes de su cita.</p>
                          </div>
                          <PremiumToggle checked={smsEnabled} onChange={setSmsEnabled} />
                      </div>
                      
                      <div className="group flex items-center justify-between p-4 md:p-5 border border-border bg-gradient-to-r from-foreground/[0.02] to-transparent hover:from-foreground/[0.04] hover:to-foreground/[0.01] hover:border-border rounded-2xl transition-all duration-500">
                          <div>
                              <p className="font-headline tracking-wide text-foreground group-hover:text-primary transition-colors duration-300">Aprobación Manual de Citas</p>
                              <p className="text-xs font-light text-foreground/50 mt-1">Requerir que un admin apruebe reservas web.</p>
                          </div>
                          <PremiumToggle checked={manualApproval} onChange={setManualApproval} />
                      </div>
                  </CardContent>
              </Card>

          </div>
      </div>

    </div>
  );
}
