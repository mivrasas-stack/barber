"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CalendarDays, 
  Users, 
  CreditCard, 
  ShoppingBag, 
  Scissors, 
  Settings, 
  UserCheck, 
  ShieldCheck, 
  LogOut, 
  ArrowRight
} from "lucide-react";
import { motion, type Variants } from "framer-motion";


import { LogoutButton } from '@/components/auth/logout-button';
export default function AdminDashboard() {
  const [shopName] = useState("The Royal Barber"); 
  const [greeting, setGreeting] = useState("Bienvenido");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Buen día, Administrador");
    else if (hour < 18) setGreeting("Buenas tardes, Administrador");
    else setGreeting("Buenas noches, Administrador");
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden justify-center">
      
      {/* Elementos Ambientales (Glows) */}
      <div className="fixed top-0 left-1/4 w-[50vw] h-[50vw] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 mix-blend-screen" />
      <div className="fixed bottom-0 right-0 w-[40vw] h-[40vw] bg-amber-700/10 rounded-full blur-[100px] pointer-events-none translate-x-1/4 translate-y-1/4 mix-blend-screen" />

      {/* Controles Top Right */}
      <div className="fixed top-6 right-6 lg:top-8 lg:right-10 z-50 flex items-center gap-4">
        {/* Toggle Rol: Vista Dueño (enlace a vista empleado) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link
            href="/barber"
            className="px-4 py-2 rounded-full text-xs font-headline tracking-widest uppercase transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] bg-amber-500/20 text-amber-500 border border-amber-500/50 hover:bg-amber-500/30 flex items-center gap-2"
            title="Cambiar a Vista Empleado"
          >
            Vista: Dueño
          </Link>
        </motion.div>

        {/* Botón Flotante Cerrar Sesión */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <LogoutButton 
            className="group flex items-center justify-center w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-border hover:border-red-500/30 hover:bg-red-500/10 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)]" 
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5 text-foreground/50 group-hover:text-red-400 transition-colors translate-x-[1px]" />
          </LogoutButton>
        </motion.div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col px-4 sm:px-8 lg:px-12 py-8 md:py-12 z-10 w-full max-w-[1700px] mx-auto">
        
        {/* Cabecera Personalizada */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 md:mb-12 relative w-full"
        >
          <p className="text-amber-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm mb-2">{greeting}</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-headline text-foreground tracking-widest uppercase relative z-10 leading-tight">
            Panel <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">Administrativo</span>
          </h1>
        </motion.div>

        {/* Bento Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-5 md:gap-6 auto-rows-[170px] lg:auto-rows-[195px]"
        >
          
          {/* Card Destacada: Agenda Global (Hero 2x2) */}
          <motion.div variants={itemVariants} className="md:col-span-2 md:row-span-2 lg:col-span-3 lg:row-span-2 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/business/appointments" className="block w-full h-full relative z-10">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-900/10 border border-border group-hover:border-amber-500/30 transition-colors duration-500 rounded-3xl" />
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm -z-10" />
              
              <div 
                className="absolute top-0 right-0 w-64 h-64 bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity duration-700 mix-blend-luminosity" 
                style={{ 
                  backgroundImage: "url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop')",
                  maskImage: 'radial-gradient(circle at top right, black, transparent 70%)' 
                }} 
              />

              <div className="p-6 md:p-8 flex flex-col justify-between h-full relative z-10">
                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                  <CalendarDays className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-headline tracking-widest uppercase text-foreground mb-2 group-hover:text-amber-100 transition-colors">Agenda Global</h2>
                  <p className="text-foreground/40 font-light text-sm md:text-base tracking-wide flex items-center gap-2 group-hover:text-foreground/60 transition-colors">
                    Revisa las reservas de toda la barbería <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-2 transition-transform duration-300" />
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Card: Finanzas */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3 lg:row-span-1 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/business/accounting" className="block w-full h-full p-6 bg-card hover:bg-white/[0.03] border border-border hover:border-emerald-500/40 transition-all duration-500 rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center border border-border group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-colors duration-500">
                  <CreditCard className="w-5 h-5 text-foreground/50 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-headline tracking-widest uppercase text-foreground mb-0.5 group-hover:text-emerald-100 transition-colors">Finanzas</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-headline bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Caja & Balance</span>
                  </div>
                  <p className="text-foreground/40 text-xs tracking-wide">Revisa los ingresos y comisiones</p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Card: Staff Barberos */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3 lg:row-span-1 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/business/barberos" className="block w-full h-full p-6 bg-card hover:bg-white/[0.03] border border-border hover:border-amber-500/40 transition-all duration-500 rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center border border-border group-hover:bg-amber-500/10 group-hover:border-amber-500/30 transition-colors duration-500">
                  <UserCheck className="w-5 h-5 text-foreground/50 group-hover:text-amber-400 transition-colors" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-headline tracking-widest uppercase text-foreground mb-0.5 group-hover:text-amber-100 transition-colors">Staff Barberos</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-headline bg-amber-500/10 text-amber-400 border border-amber-500/20">Equipo</span>
                  </div>
                  <p className="text-foreground/40 text-xs tracking-wide">Administra tu equipo y horarios</p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Card: Clientes VIP */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3 lg:row-span-1 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/business/customers" className="block w-full h-full p-6 bg-card hover:bg-white/[0.03] border border-border hover:border-blue-500/30 transition-all duration-500 rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center border border-border group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition-colors duration-500">
                  <Users className="w-5 h-5 text-foreground/50 group-hover:text-blue-400 transition-colors" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-headline tracking-widest uppercase text-foreground mb-0.5 group-hover:text-blue-100 transition-colors">Clientes VIP</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-headline bg-blue-500/10 text-blue-400 border border-blue-500/20">Fidelización</span>
                  </div>
                  <p className="text-foreground/40 text-xs tracking-wide">Administra tus clientes y membresías</p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Card: Boutique (Inv) */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3 lg:row-span-1 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/business/products" className="block w-full h-full p-6 bg-card hover:bg-white/[0.03] border border-border hover:border-purple-500/30 transition-all duration-500 rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center border border-border group-hover:bg-purple-500/10 group-hover:border-purple-500/30 transition-colors duration-500">
                  <ShoppingBag className="w-5 h-5 text-foreground/50 group-hover:text-purple-400 transition-colors" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-headline tracking-widest uppercase text-foreground mb-0.5 group-hover:text-purple-100 transition-colors">Boutique (Inv)</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-headline bg-purple-500/10 text-purple-400 border border-purple-500/20">Inventario</span>
                  </div>
                  <p className="text-foreground/40 text-xs tracking-wide">Controla productos y catálogo de tienda</p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Card: Afiliaciones */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2 lg:row-span-1 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/business/affiliations" className="flex flex-col items-center justify-center h-full p-6 bg-card hover:bg-white/[0.03] border border-border hover:border-cyan-500/30 transition-all duration-500 rounded-3xl text-center">
              <div className="w-10 h-10 bg-foreground/5 rounded-xl flex items-center justify-center mb-3 group-hover:bg-cyan-500/10 transition-colors">
                <ShieldCheck className="w-5 h-5 text-foreground/50 group-hover:text-cyan-400" />
              </div>
              <h3 className="text-sm font-headline tracking-widest uppercase text-foreground mb-1">Afiliaciones</h3>
              <p className="text-[10px] text-foreground/40 tracking-wider">Alianzas</p>
            </Link>
          </motion.div>

          {/* Card: Servicios */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2 lg:row-span-1 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/business/services" className="flex flex-col items-center justify-center h-full p-6 bg-card hover:bg-white/[0.03] border border-border hover:border-rose-500/30 transition-all duration-500 rounded-3xl text-center">
              <div className="w-10 h-10 bg-foreground/5 rounded-xl flex items-center justify-center mb-3 group-hover:bg-rose-500/10 transition-colors">
                <Scissors className="w-5 h-5 text-foreground/50 group-hover:text-rose-400" />
              </div>
              <h3 className="text-sm font-headline tracking-widest uppercase text-foreground mb-1">Servicios</h3>
              <p className="text-[10px] text-foreground/40 tracking-wider">Gestión</p>
            </Link>
          </motion.div>

          {/* Card: Configuración */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2 lg:row-span-1 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/business/settings" className="flex flex-col items-center justify-center h-full p-6 bg-card hover:bg-white/[0.03] border border-border hover:border-amber-500/30 transition-all duration-500 rounded-3xl text-center">
              <div className="w-10 h-10 bg-foreground/5 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-500/10 transition-colors">
                <Settings className="w-5 h-5 text-foreground/50 group-hover:text-amber-400" />
              </div>
              <h3 className="text-sm font-headline tracking-widest uppercase text-foreground mb-1">Configuración</h3>
              <p className="text-[10px] text-foreground/40 tracking-wider">Ajustes</p>
            </Link>
          </motion.div>

        </motion.div>
      </div>

      {/* Footer */}
      <div className="py-6 w-full text-center z-10 shrink-0">
        <p className="text-foreground/30 text-[10px] font-headline tracking-widest uppercase opacity-60">
          © {new Date().getFullYear()} {shopName} • Panel Administrativo
        </p>
      </div>

    </div>
  );
}
