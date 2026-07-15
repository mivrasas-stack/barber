"use client";
import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  Calendar, 
  Scissors, 
  ShoppingBag, 
  CreditCard, 
  Settings, 
  UserCheck,
  ShieldCheck,
  BellRing,
  Lock
} from "lucide-react";

export default function AdminDashboard() {
  const modules = [
    { name: "Clientes VIP", icon: Users, href: "/barber/admin/customers", desc: "Administra tus clientes" },
    { name: "Agenda Global", icon: Calendar, href: "/barber/admin/appointments", desc: "Revisa las reservas" },
    { name: "Staff Barberos", icon: UserCheck, href: "/barber/admin/barberos", desc: "Administra tu equipo" },
    { name: "Finanzas", icon: CreditCard, href: "/barber/admin/accounting", desc: "Revisa los ingresos" },
    { name: "Boutique (Inv)", icon: ShoppingBag, href: "/barber/admin/products", desc: "Controla productos" },
    { name: "Servicios", icon: Scissors, href: "/barber/admin/services", desc: "Gestión de servicios" },
    { name: "Configuración", icon: Settings, href: "/barber/admin/settings", desc: "Ajustes del sistema" },
  ];

  return (
    <div className="relative min-h-[85vh] flex flex-col justify-center py-12">
      
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/10 blur-[120px] rounded-[100%] pointer-events-none -z-10" />

      <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Header */}
        <div className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full shadow-[0_0_15px_rgba(200,155,60,0.1)]">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-primary font-medium tracking-[0.2em] uppercase text-xs">
                  Portal Administrativo
              </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-headline text-white tracking-widest uppercase drop-shadow-lg">
            Bienvenido a Admin
          </h1>
          <p className="text-muted-foreground font-light tracking-widest uppercase text-sm">
            Selecciona un módulo para gestionar BarberParadise
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-8 gap-6 max-w-[1400px] mx-auto w-full px-4">
          {modules.map((mod, index) => (
            <Link href={mod.href} key={mod.name} className="block group">
              <div 
                className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-primary/40 transition-all duration-500 p-8 flex flex-col items-center justify-center gap-6 shadow-2xl hover:shadow-[0_0_40px_rgba(200,155,60,0.15)] backdrop-blur-xl group-hover:-translate-y-1"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Interactive Inner Glow on hover */}
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none" />
                
                {/* Top highlight border */}
                <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/20 group-hover:via-primary/50 to-transparent transition-colors duration-500" />
                
                {/* Icon Container with subtle pulsing glow */}
                <div className="relative z-10 w-24 h-24 rounded-full bg-black/40 border border-white/10 group-hover:border-primary/30 shadow-inner flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500">
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <mod.icon className="w-10 h-10 text-white group-hover:text-primary transition-colors duration-500 drop-shadow-md" strokeWidth={1.5} />
                </div>
                
                {/* Text Content */}
                <div className="relative z-10 text-center space-y-3">
                  <h3 className="text-xl font-headline text-white tracking-widest uppercase group-hover:text-primary transition-colors duration-500">{mod.name}</h3>
                  <p className="text-sm text-white/50 font-light tracking-wide">{mod.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
