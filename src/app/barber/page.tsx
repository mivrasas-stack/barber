"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarDays, Users, DollarSign, UserCircle, LogOut, Moon, Scissors, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function BarberDashboard() {
  const [shopName, setShopName] = useState("The Royal Barber"); 
  
  const modules = [
    { name: "Mi Agenda", icon: CalendarDays, desc: "Tus citas de hoy y mañana", href: "/barber/appointments" },
    { name: "Mis Clientes", icon: Users, desc: "Historial de clientes atendidos", href: "/barber/customers" },
    { name: "Ganancias", icon: DollarSign, desc: "Tus comisiones y propinas", href: "/barber/earnings" },
    { name: "Mi Perfil", icon: UserCircle, desc: "Gestiona tu información", href: "/profile" },
    { name: "Servicios", icon: Scissors, desc: "Catálogo de cortes y servicios", href: "/barber/services" },
    { name: "Métricas", icon: Activity, desc: "Rendimiento y estadísticas", href: "/barber/metrics" },
  ];

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative overflow-x-hidden">
      



      {/* Main Content - Launchpad */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 md:py-10 z-10 w-full max-w-7xl mx-auto">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-8 relative w-full"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-headline text-white mb-4 tracking-widest uppercase relative z-10 leading-normal">
            Bienvenido a <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">BarberPortal</span>
          </h1>
          <p className="text-white/40 font-light text-sm sm:text-base md:text-xl tracking-wide max-w-2xl mx-auto relative z-10">
            Tu panel de control profesional. Selecciona un módulo para gestionar tu agenda, clientes y ganancias de forma rápida y sencilla.
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
                className="relative h-full bg-[#0A0A0A] border border-white/5 rounded-[24px] p-6 flex flex-col items-center justify-center text-center overflow-hidden transition-all duration-500 group-hover:bg-white/[0.02] group-hover:border-amber-500/30 group-focus:border-amber-500/50"
              >
                {/* Hover Glow Effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {/* Icon Wrapper */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-[24px] bg-black border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-950/30 group-hover:border-amber-500/30 group-hover:shadow-[0_0_40px_rgba(245,158,11,0.25)] transition-all duration-500 z-10 relative">
                  <mod.icon className="w-10 h-10 md:w-12 md:h-12 text-white/50 group-hover:text-amber-400 transition-colors duration-500" />
                </div>
                
                {/* Typography */}
                <h3 className="text-xl md:text-2xl font-headline tracking-widest uppercase text-white mb-3 z-10 group-hover:text-amber-100 transition-colors">
                  {mod.name}
                </h3>
                <p className="text-sm md:text-base font-light tracking-wide text-white/40 z-10 group-hover:text-white/60 transition-colors">
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
      <div className="py-4 w-full text-center text-white/30 text-[10px] font-headline tracking-widest uppercase z-10 opacity-60">
        © 2026 {shopName} • Panel de Profesionales
      </div>

    </div>
  );
}
