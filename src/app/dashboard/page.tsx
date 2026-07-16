"use client";
import React from 'react';
import Link from 'next/link';
import { CalendarDays, Clock, Scissors, Heart, ShoppingBag, UserCircle, LogOut, Moon } from "lucide-react";
import { motion } from "framer-motion";

export default function ClientDashboard() {
  const modules = [
    { name: "Reservar Cita", icon: CalendarDays, desc: "Agenda tu próximo servicio", href: "/dashboard/appointments" },
    { name: "Mis Citas", icon: Clock, desc: "Reservas y próximas visitas", href: "/dashboard/appointments" },
    { name: "Servicios", icon: Scissors, desc: "Explora nuestros cortes", href: "/dashboard/services" },
    { name: "Mis Favoritos", icon: Heart, desc: "Barberos de confianza", href: "/dashboard/saved-objects" },
    { name: "Tienda", icon: ShoppingBag, desc: "Productos y compras", href: "/dashboard/products" },
    { name: "Mi Perfil", icon: UserCircle, desc: "Ajustes de tu cuenta", href: "/portal" },
  ];

  return (
    <div className="h-[100vh] min-h-[100vh] bg-transparent flex flex-col relative overflow-hidden pt-[72px]">

      {/* Top Navigation Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 w-full flex items-center justify-between px-6 sm:px-8 lg:px-12 z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5 h-[72px]"
      >
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="MIVRA BARBER Logo" className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl object-cover shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
          <span className="font-headline tracking-widest text-lg uppercase text-white">
            Client<span className="text-amber-500">Portal</span>
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
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-2 md:py-4 z-10 w-full max-w-7xl mx-auto h-full min-h-0">

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-2 md:mb-4 relative w-full shrink-0"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />

          <h1 className="text-[clamp(1.5rem,3.5vw,3.5rem)] font-headline text-white mb-2 tracking-widest uppercase relative z-10 leading-tight">
            Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">ClientPortal</span>
          </h1>
          <p className="text-white/40 font-light text-[clamp(0.75rem,1.2vw,1rem)] tracking-wide max-w-xl mx-auto relative z-10 px-4">
            Tu espacio personal en Barber Paradise. Gestiona tus citas, descubre servicios y vive la experiencia premium.
          </p>
        </motion.div>

        {/* Modules Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6 w-full items-stretch content-center min-h-0 py-2">
          {modules.map((mod, i) => (
            <Link href={mod.href} key={mod.name} className="block group outline-none h-full min-h-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + (i * 0.1) }}
                className="relative h-full bg-[#0A0A0A] border border-white/5 rounded-[16px] md:rounded-[24px] p-4 md:p-5 flex flex-col items-center justify-center text-center overflow-hidden transition-all duration-500 group-hover:bg-white/[0.02] group-hover:border-amber-500/30 group-focus:border-amber-500/50"
              >
                {/* Hover Glow Effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Icon Wrapper */}
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-[16px] md:rounded-[24px] bg-black border border-white/10 flex items-center justify-center mb-3 md:mb-5 group-hover:scale-110 group-hover:bg-amber-950/30 group-hover:border-amber-500/30 group-hover:shadow-[0_0_40px_rgba(245,158,11,0.25)] transition-all duration-500 z-10 relative">
                  <mod.icon className="w-6 h-6 md:w-8 md:h-8 text-white/50 group-hover:text-amber-400 transition-colors duration-500" />
                </div>

                {/* Typography */}
                <h3 className="text-[clamp(0.875rem,1.5vw,1.25rem)] font-headline tracking-widest uppercase text-white mb-1 md:mb-2 z-10 group-hover:text-amber-100 transition-colors">
                  {mod.name}
                </h3>
                <p className="text-[clamp(0.65rem,1vw,0.875rem)] font-light tracking-wide text-white/40 z-10 group-hover:text-white/60 transition-colors px-2">
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
      <div className="py-2 w-full text-center text-white/30 text-[10px] font-headline tracking-widest uppercase z-10 opacity-60 shrink-0">
        © 2026 Barber Paradise • Tu Experiencia Premium
      </div>

    </div>
  );
}


