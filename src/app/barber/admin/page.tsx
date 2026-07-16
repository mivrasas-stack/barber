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
    <div className="relative min-h-screen flex flex-col justify-center py-12">
      
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 w-full flex items-center justify-between px-6 sm:px-8 lg:px-12 py-4 z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="MIVRA BARBER Logo" className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl object-cover shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
          <span className="font-headline tracking-widest text-base sm:text-xl md:text-2xl uppercase text-white">
            Admin<span className="text-amber-500">Portal</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
            <span className="w-4 h-4 rounded-full border border-white/40" /> {/* Placeholder for Moon icon since it's not imported */}
          </button>
          <div className="w-px h-6 bg-white/10" />
          <a href="/" className="flex items-center gap-2 px-3 sm:px-5 h-10 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-headline tracking-widest uppercase hover:bg-red-500/20 hover:text-red-300 transition-all">
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </a>
        </div>
      </div>
      
      {/* Main Content */}
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/10 blur-[120px] rounded-[100%] pointer-events-none -z-10" />

      <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Header */}
        <div className="text-center mb-8 relative w-full">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-headline text-white mb-4 tracking-widest uppercase relative z-10 leading-normal">
            Bienvenido a <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">Admin</span>
          </h1>
          <p className="text-white/40 font-light text-sm tracking-wide max-w-xl mx-auto relative z-10">
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
                {/* Hover Glow Effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {/* Icon Wrapper */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-[24px] bg-black border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-950/30 group-hover:border-amber-500/30 group-hover:shadow-[0_0_40px_rgba(245,158,11,0.25)] transition-all duration-500 z-10 relative">
                  <mod.icon className="w-8 h-8 md:w-10 md:h-10 text-white group-hover:text-amber-500 transition-colors duration-500" strokeWidth={1.5} />
                </div>
                
                {/* Text Content */}
                <div className="relative z-10 text-center space-y-3">
                  <h3 className="text-xl font-headline text-white tracking-widest uppercase group-hover:text-amber-500 transition-colors duration-500">{mod.name}</h3>
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
