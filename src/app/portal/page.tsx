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
    <div className="min-h-screen bg-[#080808] flex flex-col relative overflow-hidden font-sans">
      {/* Background ambient glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[50vw] max-w-[900px] max-h-[600px] bg-amber-500/[0.04] rounded-full blur-[160px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-8 z-20"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Scissors className="w-5 h-5 text-amber-500" />
          </div>
          <span className="font-bold tracking-widest text-lg uppercase text-white">
            Cliente<span className="text-amber-500">Portal</span>
          </span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          <UserWaitRoomCart />
          <UserCart />
          <div className="w-px h-6 bg-white/10 hidden sm:block" />
          <Link
            href="/"
            className="flex items-center gap-2 px-5 h-10 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold tracking-widest uppercase hover:bg-red-500/20 hover:text-red-300 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Link>
        </div>
      </motion.div>

      {/* Main Content - Launchpad */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-6 z-10 w-full max-w-7xl mx-auto -mt-10">

        {/* Hero heading */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16 relative"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-widest uppercase relative z-10">
            Bienvenido a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              ClientePortal
            </span>
          </h1>
          <p className="text-white/40 font-light text-sm tracking-wide max-w-xl mx-auto relative z-10">
            Gestiona tus citas, revisa tu turno en tiempo real, explora la boutique y consulta tus recompensas.
          </p>
        </motion.div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {modules.map((mod, i) => {
            const c = colorMap[mod.color] ?? colorMap['amber'];
            return (
              <button
                key={mod.tab}
                onClick={() => setActiveTab(mod.tab)}
                className="block group outline-none text-left w-full"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                  className={`relative h-full bg-[#0A0A0A] border border-white/5 rounded-[24px] p-8 flex flex-col items-center justify-center text-center overflow-hidden transition-all duration-500 group-hover:bg-white/[0.02] ${c.border} cursor-pointer`}
                >
                  {/* Hover Glow */}
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <div
                    className="absolute -top-10 -right-10 w-32 h-32 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: c.glow }}
                  />

                  {/* Icon */}
                  <div
                    className={`w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 ${c.bg} transition-all duration-500 z-10 relative`}
                  >
                    <mod.icon className={`w-7 h-7 text-white/50 group-hover:${c.icon.replace('text-', '')} transition-colors duration-500 ${c.icon} opacity-50 group-hover:opacity-100`} />
                  </div>

                  {/* Text */}
                  <h3 className="text-lg font-bold tracking-widest uppercase text-white mb-2 z-10 group-hover:text-amber-100 transition-colors">
                    {mod.name}
                  </h3>
                  <p className="text-xs font-light tracking-wide text-white/40 z-10 group-hover:text-white/60 transition-colors">
                    {mod.desc}
                  </p>

                  {/* Bottom line */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent group-hover:w-1/2 transition-all duration-500" />
                </motion.div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 w-full text-center text-white/30 text-[10px] font-bold tracking-widest uppercase z-10 opacity-60">
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
import { UserReviewForm } from '@/components/profile/UserReviewForm';
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
    <div className="min-h-screen bg-[#0A0A0A] text-slate-200 flex flex-col font-sans relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5 py-4">
        <div className="container mx-auto flex items-center justify-between px-6 md:px-12">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-white/60 hover:text-white transition-colors flex items-center gap-2 group"
            >
              <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="text-sm font-light tracking-widest uppercase hidden sm:block">
                Inicio Portal
              </span>
            </button>
            <div className="h-6 w-px bg-white/10 hidden md:block" />
            <button
              onClick={onBack}
              className="text-xl md:text-2xl font-bold tracking-widest text-white hover:text-amber-500 transition-colors flex items-center gap-2"
            >
              BARBER <span className="text-amber-500">PARADISE</span>
            </button>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <UserWaitRoomCart />
            <UserCart />
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <Link
              href="/"
              className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <div className="p-2 bg-white/5 rounded-lg group-hover:bg-red-500/10 group-hover:text-red-400 transition-colors">
                <LogOut className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* User Banner */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/[0.02] to-transparent -z-10 pointer-events-none" />
        <div className="container mx-auto px-6 md:px-12 py-12 lg:py-20 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            {/* Profile */}
            <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left w-full lg:w-auto">
              <div className="relative group">
                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-colors duration-700" />
                <Avatar className="relative h-32 w-32 md:h-40 md:w-40 border border-amber-500/20 p-1 bg-[#0A0A0A] shadow-2xl transition-transform duration-500 group-hover:scale-105">
                  <div className="w-full h-full rounded-full border border-white/10 overflow-hidden relative">
                    <AvatarImage src="https://picsum.photos/seed/user-profile/200/200" alt="John Doe" className="object-cover" />
                    <AvatarFallback className="bg-neutral-900 text-white font-bold text-4xl">JD</AvatarFallback>
                  </div>
                </Avatar>
              </div>
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/10 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                  <span className="text-amber-500 font-medium tracking-[0.2em] uppercase text-[10px]">Miembro Black Tier</span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-widest">JOHN DOE</h1>
                <p className="text-slate-400 font-light tracking-wide flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <span>john.d@example.com</span>
                  <span className="w-1 h-1 bg-white/20 rounded-full hidden sm:block" />
                  <span className="text-amber-500/70">Cliente VIP desde Oct 2023</span>
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-col sm:flex-row items-center gap-8 w-full lg:w-auto lg:border-l border-white/5 pt-8 lg:pt-0 lg:pl-12">
              <div className="flex gap-8 text-center sm:text-left bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                <div className="space-y-1">
                  <p className="text-slate-400 text-[10px] tracking-[0.2em] uppercase">Puntos Totales</p>
                  <p className="text-3xl font-bold text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">12,450</p>
                </div>
                <div className="w-px h-12 bg-white/10 hidden sm:block my-auto" />
                <div className="space-y-1">
                  <p className="text-slate-400 text-[10px] tracking-[0.2em] uppercase">Visitas</p>
                  <p className="text-3xl font-bold text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">14</p>
                </div>
              </div>
              <PremiumButton variant="outline" size="sm" className="w-full sm:w-auto px-8 rounded-full border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 text-sm tracking-widest h-12">
                Editar Perfil
              </PremiumButton>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <main className="flex-1 container mx-auto px-6 md:px-12 py-12 relative z-10">
        <Tabs defaultValue={tab} className="w-full space-y-12">
          <div className="w-full mb-12">
            <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 bg-transparent p-0 gap-4 md:gap-6 h-auto w-full">
              <TabsTrigger value="appointments" className="group relative overflow-hidden rounded-3xl bg-white/[0.02] border border-white/5 data-[state=active]:border-white/20 data-[state=active]:bg-white/[0.04] hover:bg-white/[0.04] transition-all duration-500 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 data-[state=active]:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-white/10">
                <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 data-[state=active]:scale-110 transition-all duration-500 shadow-lg">
                  <CalendarDays className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" />
                </div>
                <div className="relative z-10 text-center space-y-1 sm:space-y-2">
                  <h3 className="text-sm sm:text-lg font-bold text-white tracking-widest uppercase transition-colors">Citas</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-light tracking-wide uppercase">Tus reservas</p>
                </div>
              </TabsTrigger>

              <TabsTrigger value="waiting-room" className="group relative overflow-hidden rounded-3xl bg-white/[0.02] border border-white/5 data-[state=active]:border-white/20 data-[state=active]:bg-white/[0.04] hover:bg-white/[0.04] transition-all duration-500 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 data-[state=active]:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-white/10">
                <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-400/20 to-indigo-500/5 border border-blue-400/20 flex items-center justify-center group-hover:scale-110 data-[state=active]:scale-110 transition-all duration-500 shadow-lg">
                  <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />
                </div>
                <div className="relative z-10 text-center space-y-1 sm:space-y-2">
                  <h3 className="text-sm sm:text-lg font-bold text-white tracking-widest uppercase transition-colors">Espera</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-light tracking-wide uppercase">Turno Actual</p>
                </div>
              </TabsTrigger>

              <TabsTrigger value="products" className="group relative overflow-hidden rounded-3xl bg-white/[0.02] border border-white/5 data-[state=active]:border-white/20 data-[state=active]:bg-white/[0.04] hover:bg-white/[0.04] transition-all duration-500 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 data-[state=active]:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-white/10">
                <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-500/5 border border-emerald-400/20 flex items-center justify-center group-hover:scale-110 data-[state=active]:scale-110 transition-all duration-500 shadow-lg">
                  <ShoppingBag className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
                </div>
                <div className="relative z-10 text-center space-y-1 sm:space-y-2">
                  <h3 className="text-sm sm:text-lg font-bold text-white tracking-widest uppercase transition-colors">Compras</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-light tracking-wide uppercase">Boutique</p>
                </div>
              </TabsTrigger>

              <TabsTrigger value="points" className="group relative overflow-hidden rounded-3xl bg-white/[0.02] border border-white/5 data-[state=active]:border-white/20 data-[state=active]:bg-white/[0.04] hover:bg-white/[0.04] transition-all duration-500 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 data-[state=active]:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-white/10">
                <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/5 border border-amber-400/20 flex items-center justify-center group-hover:scale-110 data-[state=active]:scale-110 transition-all duration-500 shadow-lg">
                  <Star className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" />
                </div>
                <div className="relative z-10 text-center space-y-1 sm:space-y-2">
                  <h3 className="text-sm sm:text-lg font-bold text-white tracking-widest uppercase transition-colors">Puntos</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-light tracking-wide uppercase">Recompensas</p>
                </div>
              </TabsTrigger>

              <TabsTrigger value="badges" className="group relative overflow-hidden rounded-3xl bg-white/[0.02] border border-white/5 data-[state=active]:border-white/20 data-[state=active]:bg-white/[0.04] hover:bg-white/[0.04] transition-all duration-500 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 data-[state=active]:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-white/10 col-span-2 md:col-span-1 mx-auto w-full max-w-[300px] md:max-w-none">
                <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-400/20 to-pink-500/5 border border-purple-400/20 flex items-center justify-center group-hover:scale-110 data-[state=active]:scale-110 transition-all duration-500 shadow-lg">
                  <Award className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400" />
                </div>
                <div className="relative z-10 text-center space-y-1 sm:space-y-2">
                  <h3 className="text-sm sm:text-lg font-bold text-white tracking-widest uppercase transition-colors">Logros</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-light tracking-wide uppercase">Insignias</p>
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
              <div className="text-center py-20 text-white/40">Abre el formulario de reseña desde el botón flotante ↗</div>
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Floating Review Widget */}
      <UserReviewForm />
    </div>
  );
}
