"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Clock,
  ShoppingBag,
  Star,
  Award,
  MessageSquarePlus,
  LogOut,
  Scissors,
  ShoppingCart,
  Moon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { UserWaitRoomCart } from '@/components/profile/UserWaitRoomCart';
import { UserCart } from '@/components/profile/UserCart';

const modules = [
  {
    name: 'Mis Citas',
    icon: CalendarDays,
    desc: 'Reservas y próximas visitas',
    tab: 'appointments',
    color: 'amber',
  },
  {
    name: 'Sala de Espera',
    icon: Clock,
    desc: 'Tu turno en tiempo real',
    tab: 'waiting-room',
    color: 'blue',
  },
  {
    name: 'Boutique',
    icon: ShoppingBag,
    desc: 'Productos y compras',
    tab: 'products',
    color: 'emerald',
  },
  {
    name: 'Puntos',
    icon: Star,
    desc: 'Recompensas acumuladas',
    tab: 'points',
    color: 'amber',
  },
  {
    name: 'Logros',
    icon: Award,
    desc: 'Insignias desbloqueadas',
    tab: 'badges',
    color: 'purple',
  },
  {
    name: 'Reseñas',
    icon: MessageSquarePlus,
    desc: 'Deja tu opinión',
    tab: 'review',
    color: 'rose',
  },
];

const colorMap: Record<string, { glow: string; icon: string; border: string; bg: string }> = {
  amber: {
    glow: 'rgba(245,158,11,0.2)',
    icon: 'text-amber-400',
    border: 'group-hover:border-amber-500/30',
    bg: 'group-hover:bg-amber-950/30 group-hover:border-amber-500/30 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]',
  },
  blue: {
    glow: 'rgba(96,165,250,0.2)',
    icon: 'text-blue-400',
    border: 'group-hover:border-blue-500/30',
    bg: 'group-hover:bg-blue-950/30 group-hover:border-blue-500/30 group-hover:shadow-[0_0_30px_rgba(96,165,250,0.2)]',
  },
  emerald: {
    glow: 'rgba(52,211,153,0.2)',
    icon: 'text-emerald-400',
    border: 'group-hover:border-emerald-500/30',
    bg: 'group-hover:bg-emerald-950/30 group-hover:border-emerald-500/30 group-hover:shadow-[0_0_30px_rgba(52,211,153,0.2)]',
  },
  purple: {
    glow: 'rgba(168,85,247,0.2)',
    icon: 'text-purple-400',
    border: 'group-hover:border-purple-500/30',
    bg: 'group-hover:bg-purple-950/30 group-hover:border-purple-500/30 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]',
  },
  rose: {
    glow: 'rgba(251,113,133,0.2)',
    icon: 'text-rose-400',
    border: 'group-hover:border-rose-500/30',
    bg: 'group-hover:bg-rose-950/30 group-hover:border-rose-500/30 group-hover:shadow-[0_0_30px_rgba(251,113,133,0.2)]',
  },
};

export default function ClientPortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // If a tab is selected, show the detail view
  if (activeTab) {
    return <ClientPortalDetail tab={activeTab} onBack={() => setActiveTab(null)} />;
  }

  return (
    <div className="flex-1 bg-background flex flex-col relative overflow-x-hidden font-sans min-h-[calc(100vh-72px)] w-full pt-4 md:pt-10">
      

      {/* Main Content - Launchpad */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-4 md:py-8 z-10 w-full max-w-7xl mx-auto">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-2 md:mb-4 relative w-full shrink-0"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />
          
          <h1 className="text-[clamp(1.5rem,3.5vw,3.5rem)] font-headline text-foreground mb-2 tracking-widest uppercase relative z-10 leading-tight">
            Bienvenido a <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">ClientePortal</span>
          </h1>
          <p className="text-foreground/40 font-light text-[clamp(0.75rem,1.2vw,1rem)] tracking-wide max-w-2xl mx-auto relative z-10 px-4">
            Gestiona tus citas, revisa tu turno en tiempo real, explora la boutique y consulta tus recompensas.
          </p>
        </motion.div>

        {/* Modules Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 w-full items-stretch py-4">
          {modules.map((mod, i) => (
            <button key={mod.tab} onClick={() => setActiveTab(mod.tab)} className="block group outline-none w-full text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + (i * 0.1) }}
                className="relative h-full bg-background border border-border rounded-[16px] md:rounded-[24px] p-4 md:p-5 flex flex-col items-center justify-center text-center overflow-hidden transition-all duration-500 group-hover:bg-foreground/5 group-hover:border-amber-500/30 group-focus:border-amber-500/50"
              >
                {/* Hover Glow Effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {/* Icon Wrapper */}
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-[16px] md:rounded-[24px] bg-foreground/5 border border-border flex items-center justify-center mb-3 md:mb-5 group-hover:scale-110 group-hover:bg-amber-950/30 group-hover:border-amber-500/30 group-hover:shadow-[0_0_40px_rgba(245,158,11,0.25)] transition-all duration-500 z-10 relative">
                  <mod.icon className="w-6 h-6 md:w-8 md:h-8 text-foreground/50 group-hover:text-amber-400 transition-colors duration-500" />
                </div>
                
                {/* Typography */}
                <h3 className="text-[clamp(0.875rem,1.5vw,1.25rem)] font-headline tracking-widest uppercase text-foreground mb-1 md:mb-2 z-10 group-hover:text-amber-100 transition-colors">
                  {mod.name}
                </h3>
                <p className="text-[clamp(0.65rem,1vw,0.875rem)] font-light tracking-wide text-foreground/40 z-10 group-hover:text-foreground/60 transition-colors px-2">
                  {mod.desc}
                </p>

                {/* Bottom Highlight Line */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent group-hover:w-1/2 transition-all duration-500" />
              </motion.div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="py-2 w-full text-center text-foreground/30 text-[10px] font-bold tracking-widest uppercase z-10 opacity-60 shrink-0">
        © 2026 Barber Paradise • Portal Exclusivo para Clientes
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Detail View — renders original tabs content
   when a module card is clicked
────────────────────────────────────────────── */
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserWaitingRoom } from '@/components/profile/UserWaitingRoom';
import { UserPoints } from '@/components/profile/UserPoints';
import { UserBadges } from '@/components/profile/UserBadges';
import { ArrowLeft } from 'lucide-react';
import { UserAppointments } from '@/components/profile/UserAppointments';
import { UserReviewForm, UserReviewInlineForm } from '@/components/profile/UserReviewForm';
import { UserProducts } from '@/components/profile/UserProducts';
import { PremiumButton } from '@/components/ui/premium-button';

function ClientPortalDetail({
  tab,
  onBack,
}: {
  tab: string;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-background text-slate-200 flex flex-col font-sans relative overflow-x-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Back Navigation */}
      <div className="w-full bg-transparent pt-6 pb-2">
        <div className="container mx-auto px-6 md:px-12">
            <button
              onClick={onBack}
              className="text-foreground/60 hover:text-foreground transition-colors flex items-center gap-3 group w-fit"
            >
              <div className="p-2 bg-foreground/5 border border-border rounded-lg group-hover:bg-foreground/10 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-xs font-headline tracking-widest uppercase">
                Volver al Inicio
              </span>
            </button>
        </div>
      </div>

      {/* User Banner */}
      <div className="relative border-b border-border overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-foreground/[0.02] to-transparent -z-10 pointer-events-none" />
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-6 md:px-12 py-12 lg:py-16 relative z-10">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-10 lg:gap-16 w-full">
            
            {/* Profile Info (Left) */}
            <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8 text-center sm:text-left w-full xl:w-auto justify-center xl:justify-start">
              <div className="relative group shrink-0">
                <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-2xl group-hover:bg-amber-500/50 transition-colors duration-700" />
                <div className="absolute -inset-2 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full animate-spin-slow opacity-50" style={{ animationDuration: '10s' }} />
                <Avatar className="relative h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 border-2 border-amber-500/40 p-1 bg-background shadow-[0_0_40px_rgba(245,158,11,0.15)] transition-transform duration-500 group-hover:scale-105">
                  <div className="w-full h-full rounded-full border border-border overflow-hidden relative">
                    <AvatarImage src="https://picsum.photos/seed/user-profile/200/200" alt="John Doe" className="object-cover" />
                    <AvatarFallback className="bg-neutral-900 text-foreground font-bold text-2xl sm:text-4xl">JD</AvatarFallback>
                  </div>
                </Avatar>
                {/* Small level badge */}
                <div className="absolute -bottom-2 md:-bottom-4 left-1/2 -translate-x-1/2 bg-background border border-amber-500/50 px-3 py-1 md:px-4 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.3)] z-20 whitespace-nowrap">
                  <span className="text-amber-500 font-bold text-[10px] md:text-xs tracking-widest">LVL 12</span>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4 mt-2 sm:mt-0 flex-1 min-w-0 flex flex-col items-center sm:items-start">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-border rounded-full shadow-[0_0_15px_rgba(245,158,11,0.05)] backdrop-blur-sm w-fit">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.8)] shrink-0" />
                  <span className="text-amber-500 font-medium tracking-[0.2em] uppercase text-[9px] md:text-[10px]">Miembro Black Tier</span>
                </div>
                <div className="w-full flex flex-col items-center sm:items-start">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground tracking-widest uppercase drop-shadow-md truncate w-full text-center sm:text-left">
                    JOHN DOE
                  </h1>
                  <p className="text-slate-400 font-light tracking-wide flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-1 sm:gap-3 mt-2 text-xs sm:text-sm text-center sm:text-left">
                    <span className="truncate max-w-[200px] sm:max-w-none">john.d@example.com</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full hidden sm:block shrink-0 mt-2" />
                    <span className="text-amber-500/70 shrink-0">Cliente VIP desde 2023</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Showcase & Stats (Right) */}
            <div className="flex flex-col lg:flex-row items-center gap-6 w-full xl:w-auto justify-center xl:justify-end">
              
              {/* Badges Showcase (Game Profile Style) */}
              <div className="flex flex-col items-center lg:items-start space-y-3 p-5 md:p-6 bg-foreground/5 border border-border rounded-3xl backdrop-blur-sm w-full sm:w-auto relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
                <span className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase text-slate-400 font-bold z-10 text-center w-full lg:text-left">Vitrina de Logros</span>
                <div className="flex gap-3 z-10 justify-center w-full lg:justify-start">
                  {/* Badge 1 */}
                  <div className="group/badge relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center cursor-pointer shrink-0">
                    <div className="absolute inset-0 bg-amber-500/20 rounded-xl rotate-45 group-hover/badge:rotate-90 transition-transform duration-500 border border-amber-500/30" />
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] relative z-10 group-hover/badge:scale-110 transition-transform" />
                  </div>
                  {/* Badge 2 */}
                  <div className="group/badge relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center cursor-pointer shrink-0">
                    <div className="absolute inset-0 bg-amber-500/20 rounded-xl rotate-45 group-hover/badge:rotate-90 transition-transform duration-500 border border-amber-500/30" />
                    <Scissors className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] relative z-10 group-hover/badge:scale-110 transition-transform" />
                  </div>
                  {/* Badge 3 */}
                  <div className="group/badge relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center cursor-pointer shrink-0">
                    <div className="absolute inset-0 bg-amber-500/20 rounded-xl rotate-45 group-hover/badge:rotate-90 transition-transform duration-500 border border-amber-500/30" />
                    <Award className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] relative z-10 group-hover/badge:scale-110 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-4 w-full sm:w-auto">
                <div className="flex gap-4 md:gap-6 justify-center sm:justify-start bg-background p-4 md:p-5 rounded-3xl border border-border shadow-inner w-full sm:w-auto">
                  <div className="space-y-1 text-center sm:text-left flex-1 sm:flex-none">
                    <p className="text-slate-500 text-[8px] md:text-[9px] tracking-[0.2em] uppercase font-bold">Pts Totales</p>
                    <p className="text-xl md:text-2xl font-black text-foreground tracking-widest">12<span className="text-amber-500">K</span></p>
                  </div>
                  <div className="w-px h-8 md:h-10 bg-foreground/10 hidden sm:block my-auto" />
                  <div className="space-y-1 text-center sm:text-left flex-1 sm:flex-none">
                    <p className="text-slate-500 text-[8px] md:text-[9px] tracking-[0.2em] uppercase font-bold">Visitas</p>
                    <p className="text-xl md:text-2xl font-black text-foreground tracking-widest">14</p>
                  </div>
                </div>
                <PremiumButton variant="outline" size="sm" className="w-full px-6 rounded-2xl border-border hover:border-amber-500/50 hover:bg-amber-500/5 text-[10px] md:text-xs tracking-widest h-10 md:h-12 font-bold uppercase whitespace-nowrap">
                  Editar Perfil
                </PremiumButton>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <main className="flex-1 container mx-auto px-6 md:px-12 py-12 relative z-10">
        <Tabs defaultValue={tab} className="w-full space-y-12">
          <div className="w-full mb-12">
            <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 bg-transparent p-0 gap-4 md:gap-6 h-auto w-full">
              <TabsTrigger value="appointments" className="group relative overflow-hidden rounded-3xl bg-foreground/5 border border-border data-[state=active]:border-border data-[state=active]:bg-foreground/[0.04] hover:bg-foreground/[0.04] transition-all duration-500 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 data-[state=active]:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-border">
                <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 data-[state=active]:scale-110 transition-all duration-500 shadow-lg">
                  <CalendarDays className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" />
                </div>
                <div className="relative z-10 text-center space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-foreground tracking-widest uppercase transition-colors">Citas</h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wider uppercase">Tus reservas</p>
                </div>
              </TabsTrigger>

              <TabsTrigger value="waiting-room" className="group relative overflow-hidden rounded-3xl bg-foreground/5 border border-border data-[state=active]:border-border data-[state=active]:bg-foreground/[0.04] hover:bg-foreground/[0.04] transition-all duration-500 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 data-[state=active]:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-border">
                <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-400/20 to-indigo-500/5 border border-blue-400/20 flex items-center justify-center group-hover:scale-110 data-[state=active]:scale-110 transition-all duration-500 shadow-lg">
                  <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />
                </div>
                <div className="relative z-10 text-center space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-foreground tracking-widest uppercase transition-colors">Espera</h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wider uppercase">Turno Actual</p>
                </div>
              </TabsTrigger>

              <TabsTrigger value="products" className="group relative overflow-hidden rounded-3xl bg-foreground/5 border border-border data-[state=active]:border-border data-[state=active]:bg-foreground/[0.04] hover:bg-foreground/[0.04] transition-all duration-500 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 data-[state=active]:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-border">
                <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-500/5 border border-emerald-400/20 flex items-center justify-center group-hover:scale-110 data-[state=active]:scale-110 transition-all duration-500 shadow-lg">
                  <ShoppingBag className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
                </div>
                <div className="relative z-10 text-center space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-foreground tracking-widest uppercase transition-colors">Compras</h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wider uppercase">Boutique</p>
                </div>
              </TabsTrigger>

              <TabsTrigger value="points" className="group relative overflow-hidden rounded-3xl bg-foreground/5 border border-border data-[state=active]:border-border data-[state=active]:bg-foreground/[0.04] hover:bg-foreground/[0.04] transition-all duration-500 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 data-[state=active]:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-border">
                <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/5 border border-amber-400/20 flex items-center justify-center group-hover:scale-110 data-[state=active]:scale-110 transition-all duration-500 shadow-lg">
                  <Star className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" />
                </div>
                <div className="relative z-10 text-center space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-foreground tracking-widest uppercase transition-colors">Puntos</h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wider uppercase">Recompensas</p>
                </div>
              </TabsTrigger>

              <TabsTrigger value="badges" className="group relative overflow-hidden rounded-3xl bg-foreground/5 border border-border data-[state=active]:border-border data-[state=active]:bg-foreground/[0.04] hover:bg-foreground/[0.04] transition-all duration-500 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 data-[state=active]:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-border col-span-2 md:col-span-1 mx-auto w-full max-w-[300px] md:max-w-none">
                <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-400/20 to-pink-500/5 border border-purple-400/20 flex items-center justify-center group-hover:scale-110 data-[state=active]:scale-110 transition-all duration-500 shadow-lg">
                  <Award className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400" />
                </div>
                <div className="relative z-10 text-center space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-foreground tracking-widest uppercase transition-colors">Logros</h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wider uppercase">Insignias</p>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-[400px]">
            <TabsContent value="appointments" className="mt-0 outline-none"><UserAppointments /></TabsContent>
            <TabsContent value="waiting-room" className="mt-0 outline-none"><UserWaitingRoom /></TabsContent>
            <TabsContent value="products" className="mt-0 outline-none"><UserProducts /></TabsContent>
            <TabsContent value="points" className="mt-0 outline-none"><UserPoints /></TabsContent>
            <TabsContent value="badges" className="mt-0 outline-none"><UserBadges /></TabsContent>
            <TabsContent value="review" className="mt-0 outline-none">
              <UserReviewInlineForm />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Floating Review Widget */}
      <UserReviewForm />
    </div>
  );
}
