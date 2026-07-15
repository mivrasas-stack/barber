"use client";
import React from 'react';
import Link from 'next/link';
import { Building2, CreditCard, Users, Settings, Activity, ShieldCheck, LogOut, Moon, Scissors } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const modules = [
    { name: "Franquicias", icon: Building2, desc: "Gestiona las sucursales", href: "/admin/tenants" },
    { name: "Suscripciones", icon: CreditCard, desc: "Planes y facturación", href: "/admin/subscriptions" },
    { name: "Usuarios", icon: Users, desc: "Administra accesos globales", href: "/admin/users" },
    { name: "Métricas", icon: Activity, desc: "Rendimiento del sistema", href: "/admin/metrics" },
    { name: "Auditoría", icon: ShieldCheck, desc: "Registros de seguridad", href: "/admin/audit" },
    { name: "Configuración", icon: Settings, desc: "Ajustes globales", href: "/admin/settings" },
  ];

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden">
      
      {/* Top Navigation Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-8 z-20"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.15)]">
             <Scissors className="w-5 h-5 text-amber-500" />
          </div>
          <span className="font-headline tracking-widest text-lg uppercase text-white">
            Admin<span className="text-amber-500">Portal</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
            <Moon className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-white/10" />
          <Link href="/" className="flex items-center gap-2 px-5 h-10 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-headline tracking-widest uppercase hover:bg-red-500/20 hover:text-red-300 transition-all">
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </Link>
        </div>
      </motion.div>

      {/* Main Content - Launchpad */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-6 z-10 w-full max-w-7xl mx-auto -mt-10">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16 relative"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />
          
          <h1 className="text-5xl md:text-7xl font-headline text-white mb-4 tracking-widest uppercase relative z-10">
            Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">AdminPortal</span>
          </h1>
          <p className="text-white/40 font-light text-sm tracking-wide max-w-xl mx-auto relative z-10">
            Selecciona un módulo operativo para comenzar la gestión de la plataforma SaaS, monitorear la salud del sistema o administrar franquicias.
          </p>
        </motion.div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {modules.map((mod, i) => (
            <Link href={mod.href} key={mod.name} className="block group outline-none">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + (i * 0.1) }}
                className="relative h-full bg-[#0A0A0A] border border-white/5 rounded-[24px] p-8 flex flex-col items-center justify-center text-center overflow-hidden transition-all duration-500 group-hover:bg-white/[0.02] group-hover:border-amber-500/30 group-focus:border-amber-500/50"
              >
                {/* Hover Glow Effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {/* Icon Wrapper */}
                <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-950/30 group-hover:border-amber-500/30 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-all duration-500 z-10 relative">
                  <mod.icon className="w-7 h-7 text-white/50 group-hover:text-amber-400 transition-colors duration-500" />
                </div>
                
                {/* Typography */}
                <h3 className="text-lg font-headline tracking-widest uppercase text-white mb-2 z-10 group-hover:text-amber-100 transition-colors">
                  {mod.name}
                </h3>
                <p className="text-xs font-light tracking-wide text-white/40 z-10 group-hover:text-white/60 transition-colors">
                  {mod.desc}
                </p>

                {/* Bottom Highlight Line */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent group-hover:w-1/2 transition-all duration-500" />
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 w-full text-center text-white/30 text-[10px] font-headline tracking-widest uppercase z-10 opacity-60">
        © 2026 Barber Paradise • Centro de Comando Global • Root Access
      </div>

    </div>
  );
}
