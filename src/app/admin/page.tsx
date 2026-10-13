"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, CreditCard, Users, Settings, Activity, ShieldCheck, LogOut, Moon, ArrowRight } from "lucide-react";
import { motion, type Variants } from "framer-motion";

export default function AdminDashboard() {
  const [greeting, setGreeting] = useState("Bienvenido");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Buen día, Admin");
    else if (hour < 18) setGreeting("Buenas tardes, Admin");
    else setGreeting("Buenas noches, Admin");
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden justify-center">
      
      {/* Elementos Ambientales (Glows) */}
      <div className="fixed top-0 left-1/4 w-[50vw] h-[50vw] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 mix-blend-screen" />
      <div className="fixed bottom-0 right-0 w-[40vw] h-[40vw] bg-amber-700/10 rounded-full blur-[100px] pointer-events-none translate-x-1/4 translate-y-1/4 mix-blend-screen" />

      {/* Controles Top Right */}
      <div className="fixed top-6 right-6 lg:top-8 lg:right-10 z-50 flex items-center gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="px-4 py-2 rounded-full text-xs font-headline tracking-widest uppercase shadow-[0_8px_32px_rgba(0,0,0,0.4)] bg-amber-500/20 text-amber-500 border border-amber-500/50"
        >
          Vista: Super Admin
        </motion.div>

        {/* Botón Flotante Cerrar Sesión */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Link href="/" className="group flex items-center justify-center w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-border hover:border-red-500/30 hover:bg-red-500/10 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)]" title="Cerrar Sesión">
            <LogOut className="w-5 h-5 text-foreground/50 group-hover:text-red-400 transition-colors translate-x-[1px]" />
          </Link>
        </motion.div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-8 md:py-12 z-10 w-full max-w-7xl mx-auto">
        
        {/* Cabecera Personalizada */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 md:mb-12 relative w-full"
        >
          <p className="text-amber-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm mb-2">{greeting}</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-headline text-foreground tracking-widest uppercase relative z-10 leading-tight">
            Control <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">Central</span>
          </h1>
        </motion.div>

        {/* Bento Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 auto-rows-[160px] md:auto-rows-[180px]"
        >
          
          {/* Card Destacada: Franquicias */}
          <motion.div variants={itemVariants} className="md:col-span-2 md:row-span-2 lg:col-span-3 lg:row-span-2 relative group rounded-[32px] overflow-hidden cursor-pointer shadow-2xl">
            <Link href="/admin/tenants" className="block w-full h-full relative z-10">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-background/50 to-amber-900/10 border border-border group-hover:border-amber-500/40 transition-all duration-700 rounded-[32px]" />
              <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl -z-10" />
              
              {/* Dynamic Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-500/20 blur-[60px] group-hover:scale-150 transition-transform duration-700" />
              
              <div 
                className="absolute top-0 right-0 w-full h-full bg-cover bg-center opacity-10 group-hover:opacity-30 transition-opacity duration-700 mix-blend-overlay" 
                style={{ 
                  backgroundImage: "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop')",
                  maskImage: 'linear-gradient(to left, black, transparent)' 
                }} 
              />

              <div className="p-8 md:p-10 flex flex-col justify-between h-full relative z-10">
                <div className="w-16 h-16 bg-foreground/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-border group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <Building2 className="w-8 h-8 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-headline tracking-widest uppercase text-foreground mb-3 group-hover:text-amber-300 transition-colors">Franquicias</h2>
                  <p className="text-foreground/40 font-light text-sm md:text-base tracking-[0.2em] flex items-center gap-3 group-hover:text-foreground/80 transition-colors uppercase">
                    Control de red global <ArrowRight className="w-5 h-5 text-amber-500 group-hover:translate-x-3 transition-transform duration-500" />
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Card: Suscripciones */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3 lg:row-span-1 relative group rounded-[32px] overflow-hidden cursor-pointer shadow-xl">
            <Link href="/admin/subscriptions" className="block w-full h-full p-8 bg-black/40 backdrop-blur-xl border border-border hover:border-emerald-500/30 transition-all duration-700 rounded-[32px] flex items-center justify-between relative">
              <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-14 h-14 bg-foreground/5 rounded-2xl flex items-center justify-center border border-border group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all duration-500 group-hover:scale-110">
                  <CreditCard className="w-6 h-6 text-foreground/50 group-hover:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-colors" />
                </div>
                <div>
                  <h3 className="text-xl font-headline tracking-[0.2em] uppercase text-foreground mb-2 group-hover:text-emerald-100 transition-colors">Suscripciones</h3>
                  <p className="text-foreground/30 text-[10px] tracking-[0.3em] uppercase">Membresías & Facturación</p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Card: Usuarios */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3 lg:row-span-1 relative group rounded-[32px] overflow-hidden cursor-pointer shadow-xl">
             <Link href="/admin/users" className="block w-full h-full p-8 bg-black/40 backdrop-blur-xl border border-border hover:border-blue-500/30 transition-all duration-700 rounded-[32px] flex items-center justify-between relative">
                <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-14 h-14 bg-foreground/5 rounded-2xl flex items-center justify-center border border-border group-hover:bg-blue-500/20 group-hover:border-blue-500/40 transition-all duration-500 group-hover:scale-110">
                    <Users className="w-6 h-6 text-foreground/50 group-hover:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-headline tracking-[0.2em] uppercase text-foreground mb-2 group-hover:text-blue-100 transition-colors">Usuarios</h3>
                    <p className="text-foreground/30 text-[10px] tracking-[0.3em] uppercase">Control de Accesos</p>
                  </div>
                </div>
             </Link>
          </motion.div>

          {/* Card: Métricas */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2 lg:row-span-1 relative group rounded-[32px] overflow-hidden cursor-pointer shadow-xl">
            <Link href="/admin/metrics" className="flex flex-col items-center justify-center h-full p-6 bg-black/40 backdrop-blur-xl border border-border hover:border-fuchsia-500/30 transition-all duration-700 rounded-[32px] text-center relative">
                <div className="absolute inset-0 bg-gradient-to-t from-fuchsia-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="w-12 h-12 bg-foreground/5 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-fuchsia-500/20 group-hover:scale-110 transition-all duration-500 border border-border group-hover:border-fuchsia-500/30">
                  <Activity className="w-5 h-5 text-foreground/50 group-hover:text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]" />
                </div>
                <h3 className="text-xs font-headline tracking-[0.25em] uppercase text-foreground mb-2 group-hover:text-fuchsia-100 transition-colors">Rendimiento</h3>
            </Link>
          </motion.div>

          {/* Card: Auditoría */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2 lg:row-span-1 relative group rounded-[32px] overflow-hidden cursor-pointer shadow-xl">
            <Link href="/admin/audit" className="flex flex-col items-center justify-center h-full p-6 bg-black/40 backdrop-blur-xl border border-border hover:border-red-500/30 transition-all duration-700 rounded-[32px] text-center relative">
                <div className="absolute inset-0 bg-gradient-to-t from-red-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="w-12 h-12 bg-foreground/5 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-red-500/20 group-hover:scale-110 transition-all duration-500 border border-border group-hover:border-red-500/30">
                  <ShieldCheck className="w-5 h-5 text-foreground/50 group-hover:text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                </div>
                <h3 className="text-xs font-headline tracking-[0.25em] uppercase text-foreground mb-2 group-hover:text-red-100 transition-colors">Seguridad</h3>
            </Link>
          </motion.div>

          {/* Card: Configuración */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2 lg:row-span-1 relative group rounded-[32px] overflow-hidden cursor-pointer shadow-xl">
            <Link href="/admin/settings" className="flex flex-col items-center justify-center h-full p-6 bg-black/40 backdrop-blur-xl border border-border hover:border-gray-300/30 transition-all duration-700 rounded-[32px] text-center relative">
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="w-12 h-12 bg-foreground/5 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-foreground/10 group-hover:scale-110 transition-all duration-500 border border-border group-hover:border-foreground/30">
                  <Settings className="w-5 h-5 text-foreground/50 group-hover:text-foreground drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                </div>
                <h3 className="text-xs font-headline tracking-[0.25em] uppercase text-foreground mb-2 group-hover:text-foreground transition-colors">Ajustes</h3>
            </Link>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
