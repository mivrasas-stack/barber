"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Users, DollarSign, UserCircle, LogOut, Moon, Scissors, Activity, ChevronDown, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BarberDashboard() {
  const [shopName, setShopName] = useState("The Royal Barber"); 
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  const modules = [
    { 
      name: "Mi Agenda", 
      icon: CalendarDays, 
      desc: "Tus citas de hoy y mañana", 
      href: "/barber/appointments",
      details: "Revisa tu horario completo, bloquea espacios, gestiona cancelaciones y ve los detalles de las citas de cada día en tiempo real."
    },
    { 
      name: "Mis Clientes", 
      icon: Users, 
      desc: "Historial de clientes atendidos", 
      href: "/barber/customers",
      details: "Accede al historial de servicios por cliente, notas sobre cortes anteriores, preferencias y frecuencia de visitas."
    },
    { 
      name: "Ganancias", 
      icon: DollarSign, 
      desc: "Tus comisiones y propinas", 
      href: "/barber/earnings",
      details: "Desglose completo de tus ingresos diarios, semanales y mensuales. Revisa tus comisiones por servicio y propinas recibidas."
    },
    { 
      name: "Mi Perfil", 
      icon: UserCircle, 
      desc: "Gestiona tu información", 
      href: "/barber/profile",
      details: "Actualiza tu fotografía, horario de disponibilidad, especialidades y biografía visible para los clientes."
    },
    { 
      name: "Servicios", 
      icon: Scissors, 
      desc: "Catálogo de cortes y servicios", 
      href: "/barber/services",
      details: "Consulta la lista de servicios que estás habilitado para ofrecer, junto con sus duraciones estimadas y precios."
    },
    { 
      name: "Métricas", 
      icon: Activity, 
      desc: "Rendimiento y estadísticas", 
      href: "/barber/metrics",
      details: "Visualiza estadísticas de retención, servicios más populares, horas pico de reservas y tu crecimiento general."
    },
  ];

  return (
    <div className="flex-1 bg-transparent flex flex-col relative w-full h-full min-h-0 overflow-y-auto pt-20">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 w-full flex items-center justify-between px-6 sm:px-8 lg:px-12 py-4 z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="MIVRA BARBER Logo" className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl object-cover shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
          <span className="font-headline tracking-widest text-base sm:text-xl md:text-2xl uppercase text-white">
            Barber<span className="text-amber-500">Portal</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
            <Moon className="w-4 h-4 text-white/60" />
          </button>
          <div className="w-px h-6 bg-white/10" />
          <Link href="/" className="flex items-center gap-2 px-3 sm:px-5 h-10 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-headline tracking-widest uppercase hover:bg-red-500/20 hover:text-red-300 transition-all">
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Link>
        </div>
      </div>

      {/* Main Content - Launchpad */}
      <div className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8 z-10 w-full max-w-7xl mx-auto h-auto min-h-0">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-8 relative w-full shrink-0"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />
          
          <h1 className="text-[clamp(1.5rem,3.5vw,3.5rem)] font-headline text-white mb-2 tracking-widest uppercase relative z-10 leading-tight">
            Bienvenido a <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">BarberPortal</span>
          </h1>
          <p className="text-white/40 font-light text-[clamp(0.75rem,1.2vw,1rem)] tracking-wide max-w-2xl mx-auto relative z-10 px-4">
            Tu panel de control profesional. Selecciona un módulo para gestionar tu agenda, clientes y ganancias de forma rápida y sencilla.
          </p>
        </motion.div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full items-start content-start py-2">
          {modules.map((mod, i) => {
            const isExpanded = expandedIndex === i;
            
            return (
              <motion.div
                key={mod.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + (i * 0.1) }}
                className="relative bg-[#0A0A0A] border border-white/5 rounded-[16px] md:rounded-[24px] flex flex-col overflow-hidden transition-all duration-500 hover:bg-white/[0.02] hover:border-amber-500/30 group"
              >
                {/* Hover Glow Effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <Link href={mod.href} className="flex-1 p-5 md:p-6 flex flex-col items-center justify-center text-center relative z-10">
                  {/* Icon Wrapper */}
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-[16px] md:rounded-[24px] bg-black border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-amber-950/30 group-hover:border-amber-500/30 group-hover:shadow-[0_0_40px_rgba(245,158,11,0.25)] transition-all duration-500">
                    <mod.icon className="w-6 h-6 md:w-8 md:h-8 text-white/50 group-hover:text-amber-400 transition-colors duration-500" />
                  </div>
                  
                  {/* Typography */}
                  <h3 className="text-[clamp(0.875rem,1.5vw,1.25rem)] font-headline tracking-widest uppercase text-white mb-2 group-hover:text-amber-100 transition-colors">
                    {mod.name}
                  </h3>
                  <p className="text-[clamp(0.65rem,1vw,0.875rem)] font-light tracking-wide text-white/40 group-hover:text-white/60 transition-colors">
                    {mod.desc}
                  </p>
                </Link>

                {/* Dropdown Toggle Button */}
                <div className="px-5 pb-5 relative z-10 flex flex-col items-center">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      setExpandedIndex(isExpanded ? null : i);
                    }}
                    className="flex items-center gap-2 text-xs font-headline tracking-widest uppercase text-amber-500/70 hover:text-amber-400 py-2 px-4 rounded-full bg-amber-500/5 hover:bg-amber-500/10 transition-all border border-amber-500/10 hover:border-amber-500/30"
                  >
                    <Info className="w-3 h-3" />
                    <span>{isExpanded ? 'Ocultar' : 'Más Info'}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden w-full"
                      >
                        <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-sm font-light text-white/60 text-center leading-relaxed backdrop-blur-sm shadow-inner">
                          {mod.details}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom Highlight Line */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent group-hover:w-1/2 transition-all duration-500" />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 w-full text-center text-white/30 text-[10px] font-headline tracking-widest uppercase z-10 opacity-60 shrink-0">
        © 2026 {shopName} • Panel de Profesionales
      </div>

    </div>
  );
}

