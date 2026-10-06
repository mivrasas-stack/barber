"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Star, Shield, Medal, Crown, 
  Zap, UserCircle, Edit3, CheckCircle2, ChevronRight 
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// Mock Data for the Profile
const userProfile = {
  name: "John Doe",
  email: "john.doe@example.com",
  avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&h=400&fit=crop",
  phone: "+57 300 123 4567",
  joined: "Octubre 2023",
  rank: {
    current: "Oro VIP",
    next: "Platino VIP",
    points: 12450,
    nextTierPoints: 15000,
  },
  stats: {
    totalCortes: 14,
    totalGastado: "450.000",
    diasRacha: 3
  },
  achievements: [
    { id: 1, title: "Primer Corte", desc: "Completaste tu primera cita", icon: Scissors, color: "text-blue-400", bg: "bg-blue-500/10", unlocked: true },
    { id: 2, title: "Cliente Frecuente", desc: "10 cortes completados", icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10", unlocked: true },
    { id: 3, title: "Puntualidad Perfecta", desc: "Llegaste a tiempo a 5 citas seguidas", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", unlocked: true },
    { id: 4, title: "Trendsetter", desc: "Compraste 3 productos boutique", icon: Star, color: "text-purple-400", bg: "bg-purple-500/10", unlocked: false },
  ]
};

// Custom Icon for achievements
function Scissors(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="6" r="3" />
      <path d="M8.12 8.12 12 12" />
      <path d="M20 4 8.12 15.88" />
      <circle cx="6" cy="18" r="3" />
      <path d="M14.8 14.8 20 20" />
    </svg>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function ProfilePage() {
  const progressPercentage = (userProfile.rank.points / userProfile.rank.nextTierPoints) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground/90 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full blur opacity-30" />
              <Avatar className="w-24 h-24 border-2 border-amber-500/50 shadow-2xl relative">
                <AvatarImage src={userProfile.avatar} />
                <AvatarFallback className="bg-[#111] text-2xl"><UserCircle className="w-12 h-12 text-foreground/20" /></AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-amber-600 p-1.5 rounded-full border-2 border-[#0A0A0A]">
                <Crown className="w-4 h-4 text-black" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-headline tracking-widest uppercase text-foreground mb-1">{userProfile.name}</h1>
              <p className="text-foreground/50 text-sm tracking-wide mb-2">{userProfile.email} • {userProfile.phone}</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/5 border border-border text-xs text-foreground/70">
                <Shield className="w-3 h-3 text-amber-500" /> Miembro desde {userProfile.joined}
              </div>
            </div>
          </div>
          <Button variant="outline" className="rounded-full border-border bg-foreground/5 hover:bg-foreground/10 text-foreground gap-2">
            <Edit3 className="w-4 h-4" /> Editar Perfil
          </Button>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Rank & Points Card (Game UI) */}
          <motion.div variants={itemVariants} className="md:col-span-2 relative group rounded-[2rem] overflow-hidden p-8 border border-amber-500/20 bg-gradient-to-br from-[#1A150C] to-[#0A0805]">
            <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <p className="text-[10px] font-headline tracking-[0.2em] text-amber-500/70 uppercase mb-2">Rango Actual</p>
                <h2 className="text-4xl font-headline tracking-widest uppercase text-foreground drop-shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-3">
                  {userProfile.rank.current} <Trophy className="w-8 h-8 text-amber-400" />
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-headline tracking-[0.2em] text-foreground/40 uppercase mb-2">Puntos Totales</p>
                <p className="text-3xl font-bold font-sans tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                  {userProfile.rank.points.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex justify-between text-xs font-medium tracking-wider">
                <span className="text-foreground/60">{userProfile.rank.current}</span>
                <span className="text-amber-500/80">{userProfile.rank.next}</span>
              </div>
              <div className="relative h-4 w-full bg-black/50 rounded-full overflow-hidden border border-border">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300"
                />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBsNDAtNDBIMzBMMCAzMHpNNDAgMGgtMTBMMCAzMHYxMGgzMEw0MCAxMHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-20 mix-blend-overlay" />
              </div>
              <p className="text-right text-[10px] tracking-widest text-foreground/40 uppercase">
                Faltan {(userProfile.rank.nextTierPoints - userProfile.rank.points).toLocaleString()} pts para subir
              </p>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={itemVariants} className="grid grid-rows-3 gap-4">
            <div className="bg-card border border-border rounded-[2rem] p-5 flex items-center justify-between hover:border-border transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-foreground/40">Cortes Totales</p>
                  <p className="text-xl font-bold">{userProfile.stats.totalCortes}</p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-[2rem] p-5 flex items-center justify-between hover:border-border transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-foreground/40">Racha de visitas</p>
                  <p className="text-xl font-bold">{userProfile.stats.diasRacha} 🔥</p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-[2rem] p-5 flex items-center justify-between hover:border-border transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Medal className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-foreground/40">Total Gastado</p>
                  <p className="text-xl font-bold text-amber-500">${userProfile.stats.totalGastado}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Achievements (Logros) */}
          <motion.div variants={itemVariants} className="md:col-span-3 bg-card border border-border rounded-[2rem] p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-headline tracking-widest uppercase text-foreground">Insignias & Logros</h3>
              <Button variant="ghost" className="text-foreground/40 hover:text-amber-400 hover:bg-amber-500/10 text-xs tracking-widest uppercase rounded-full">
                Ver Todos <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {userProfile.achievements.map((ach) => (
                <div 
                  key={ach.id} 
                  className={`p-5 rounded-2xl border transition-all duration-300 ${
                    ach.unlocked 
                      ? 'border-border bg-foreground/5 hover:border-border' 
                      : 'border-border bg-black/20 opacity-50 grayscale'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${ach.unlocked ? ach.bg : 'bg-foreground/5'}`}>
                    <ach.icon className={`w-6 h-6 ${ach.unlocked ? ach.color : 'text-foreground/20'}`} />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-1 tracking-wide">{ach.title}</h4>
                  <p className="text-xs text-foreground/40 leading-relaxed">{ach.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
