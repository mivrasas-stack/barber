"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarDays, Users, DollarSign, UserCircle, LogOut, Moon, Scissors, Activity, ArrowRight, Package, Coffee, UserPlus, Wallet, QrCode } from "lucide-react";
import { motion } from "framer-motion";


import { LogoutButton } from '@/components/auth/logout-button';
export default function BarberDashboard() {
  const [shopName, setShopName] = useState("The Royal Barber"); 
  const [greeting, setGreeting] = useState("Bienvenido");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Buen día, Maestro");
    else if (hour < 18) setGreeting("Buenas tardes, Maestro");
    else setGreeting("Buenas noches, Maestro");
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
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
        {/* Toggle Rol */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link
            href="/business"
            className="px-4 py-2 rounded-full text-xs font-headline tracking-widest uppercase transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] bg-foreground/5 text-foreground/60 border border-border hover:bg-foreground/10 hover:text-amber-500 flex items-center gap-2"
            title="Cambiar a Vista Dueño / Admin"
          >
            Vista: Empleado
          </Link>
        </motion.div>

        {/* Botón Flotante Cerrar Sesión */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <LogoutButton className="group flex items-center justify-center w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-border hover:border-red-500/30 hover:bg-red-500/10 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)]" title="Cerrar Sesión">
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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">Profesional</span>
          </h1>
        </motion.div>

        {/* Bento Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-5 md:gap-6 auto-rows-[170px] lg:auto-rows-[195px]"
        >
          
          {/* Card Destacada: Mi Agenda */}
          <motion.div variants={itemVariants} className="md:col-span-2 md:row-span-2 lg:col-span-3 lg:row-span-2 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/barber/appointments" className="block w-full h-full relative z-10">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-900/10 border border-border group-hover:border-amber-500/30 transition-colors duration-500 rounded-3xl" />
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm -z-10" />
              
              <div className="absolute top-0 right-0 w-64 h-64 bg-[url('https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity duration-700 mix-blend-luminosity" style={{ maskImage: 'radial-gradient(circle at top right, black, transparent 70%)' }} />

              <div className="p-6 md:p-8 flex flex-col justify-between h-full relative z-10">
                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                  <CalendarDays className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-headline tracking-widest uppercase text-foreground mb-2 group-hover:text-amber-100 transition-colors">Mi Agenda</h2>
                  <p className="text-foreground/40 font-light text-sm md:text-base tracking-wide flex items-center gap-2 group-hover:text-foreground/60 transition-colors">
                    Tus citas de hoy y mañana <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-2 transition-transform duration-300" />
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Card: Contabilidad Diaria */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3 lg:row-span-1 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/barber/accounting" className="block w-full h-full p-6 bg-card hover:bg-white/[0.03] border border-border hover:border-emerald-500/40 transition-all duration-500 rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center border border-border group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-colors duration-500">
                  <Wallet className="w-5 h-5 text-foreground/50 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-headline tracking-widest uppercase text-foreground mb-0.5 group-hover:text-emerald-100 transition-colors">Contabilidad</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-headline bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Filtro Diario</span>
                  </div>
                  <p className="text-foreground/40 text-xs tracking-wide">Caja, comisiones y balance del día</p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Card: Barberos (Gestión de Equipo) */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3 lg:row-span-1 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/barber/barberos" className="block w-full h-full p-6 bg-card hover:bg-white/[0.03] border border-border hover:border-amber-500/40 transition-all duration-500 rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center border border-border group-hover:bg-amber-500/10 group-hover:border-amber-500/30 transition-colors duration-500">
                  <Users className="w-5 h-5 text-foreground/50 group-hover:text-amber-400 transition-colors" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-headline tracking-widest uppercase text-foreground mb-0.5 group-hover:text-amber-100 transition-colors">Barberos</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-headline bg-amber-500/10 text-amber-400 border border-amber-500/20">Equipo</span>
                  </div>
                  <p className="text-foreground/40 text-xs tracking-wide">Añadir barberos, turnos y comisiones</p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Card: Mi Perfil & Código QR */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3 lg:row-span-1 relative group rounded-3xl overflow-hidden cursor-pointer">
             <Link href="/barber/profile" className="block w-full h-full p-6 bg-card hover:bg-white/[0.03] border border-border hover:border-amber-500/20 transition-all duration-500 rounded-3xl flex items-center justify-between relative overflow-hidden">
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-amber-500/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
                
                <div className="flex items-center gap-5 relative z-10">
                  <div className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center border border-border group-hover:bg-amber-500/10 group-hover:border-amber-500/30 transition-colors duration-500">
                    <QrCode className="w-5 h-5 text-foreground/50 group-hover:text-amber-400 transition-colors" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-headline tracking-widest uppercase text-foreground mb-0.5 group-hover:text-amber-100 transition-colors">Mi Perfil</h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-headline bg-amber-500/10 text-amber-400 border border-amber-500/20">QR Alianza</span>
                    </div>
                    <p className="text-foreground/40 text-xs tracking-wide">Código QR y datos del dueño</p>
                  </div>
                </div>
             </Link>
          </motion.div>

          {/* Card: Mis Clientes */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3 lg:row-span-1 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/barber/customers" className="block w-full h-full p-6 bg-card hover:bg-white/[0.03] border border-border hover:border-blue-500/30 transition-all duration-500 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center border border-border group-hover:bg-blue-500/10 transition-colors">
                    <UserPlus className="w-5 h-5 text-foreground/50 group-hover:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-headline tracking-widest uppercase text-foreground mb-0.5">Mis Clientes</h3>
                    <p className="text-foreground/40 text-xs tracking-wide">Historial y fidelización</p>
                  </div>
                </div>
            </Link>
          </motion.div>

          {/* Card: Servicios */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3 lg:row-span-1 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/barber/services" className="flex flex-col items-center justify-center h-full p-6 bg-card hover:bg-white/[0.03] border border-border hover:border-rose-500/30 transition-all duration-500 rounded-3xl text-center">
                <div className="w-10 h-10 bg-foreground/5 rounded-xl flex items-center justify-center mb-3 group-hover:bg-rose-500/10 transition-colors">
                  <Scissors className="w-5 h-5 text-foreground/50 group-hover:text-rose-400" />
                </div>
                <h3 className="text-sm font-headline tracking-widest uppercase text-foreground mb-1">Servicios</h3>
                <p className="text-[10px] text-foreground/40 tracking-wider">Catálogo</p>
            </Link>
          </motion.div>

          {/* Card: Sala de Espera */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3 lg:row-span-1 relative group rounded-3xl overflow-hidden cursor-pointer">
            <Link href="/barber/wait-room" className="flex flex-col items-center justify-center h-full p-6 bg-card hover:bg-white/[0.03] border border-border hover:border-sky-500/30 transition-all duration-500 rounded-3xl text-center">
                <div className="w-10 h-10 bg-foreground/5 rounded-xl flex items-center justify-center mb-3 group-hover:bg-sky-500/10 transition-colors">
                  <Coffee className="w-5 h-5 text-foreground/50 group-hover:text-sky-400" />
                </div>
                <h3 className="text-sm font-headline tracking-widest uppercase text-foreground mb-1">Sala de Espera</h3>
                <p className="text-[10px] text-foreground/40 tracking-wider">Pedidos</p>
            </Link>
          </motion.div>

        </motion.div>
      </div>

      {/* Footer */}
      <div className="py-6 w-full text-center z-10 shrink-0">
        <p className="text-foreground/30 text-[10px] font-headline tracking-widest uppercase opacity-60">
          © {new Date().getFullYear()} {shopName} • Panel de Profesionales
        </p>
      </div>

    </div>
  );
}

