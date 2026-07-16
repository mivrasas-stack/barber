"use client";

import React, { useEffect } from 'react';
import { Award, Calendar, Gem, Star, Scissors, Clock, Zap, Crown, Lock } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const badges = [
  { icon: Star, title: "Primer Corte", description: "Completaste tu primera cita.", earned: true },
  { icon: Calendar, title: "Frecuente", description: "5 visitas en un mes.", earned: true },
  { icon: Scissors, title: "Estilo Único", description: "Probaste 3 estilos diferentes.", earned: true },
  { icon: Clock, title: "Puntualidad", description: "Llegaste a tiempo a 10 citas seguidas.", earned: true },
  { icon: Award, title: "Lealtad Oro", description: "25 citas completadas en el año.", earned: false },
  { icon: Gem, title: "Embajador", description: "Recomienda a 5 amigos.", earned: false },
  { icon: Zap, title: "Trendsetter", description: "Fuiste de los primeros en probar un nuevo servicio.", earned: false },
  { icon: Crown, title: "VIP Black", description: "Mantén un nivel de gasto premium por 6 meses.", earned: false },
];

export function UserBadges() {
  const { toast } = useToast();

  useEffect(() => {
    badges.forEach(badge => {
      const badgeKey = `badge-earned-${badge.title.replace(/\s+/g, '-')}`;
      if (badge.earned && !sessionStorage.getItem(badgeKey)) {
        toast({
          title: "Galardón Obtenido",
          description: (
            <div className="flex items-center gap-2">
              <badge.icon className="h-5 w-5 text-amber-500" />
              <p>Has sido reconocido como: <strong>{badge.title}</strong></p>
            </div>
          ),
        });
        sessionStorage.setItem(badgeKey, 'true');
      }
    });
  }, [toast]);

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-12">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/5 relative">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none" />
        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase text-white mb-2">
            Logros <span className="text-amber-500">Desbloqueados</span>
          </h2>
          <p className="text-white/40 font-light tracking-wide text-sm md:text-base">
            Insignias y reconocimientos a tu lealtad e impecable estilo.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-4 bg-white/[0.02] border border-white/5 px-6 py-3 rounded-full">
          <div className="flex flex-col text-center">
            <span className="text-xl font-bold text-white">{badges.filter(b => b.earned).length}</span>
            <span className="text-[10px] tracking-widest text-slate-400 uppercase">Obtenidos</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col text-center">
            <span className="text-xl font-bold text-white/40">{badges.length}</span>
            <span className="text-[10px] tracking-widest text-slate-400 uppercase">Total</span>
          </div>
        </div>
      </div>
      
      <TooltipProvider delayDuration={100}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-8 relative z-10">
          {badges.map((badge, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="group relative flex flex-col items-center justify-center p-6 h-56 md:h-64 cursor-pointer outline-none"
                >
                  {/* Badge Container */}
                  <div className={`relative w-24 h-24 md:w-32 md:h-32 mb-6 flex items-center justify-center transition-all duration-500 z-10 ${
                    badge.earned ? 'group-hover:-translate-y-2' : ''
                  }`}>
                    
                    {/* Background Shape */}
                    {badge.earned ? (
                      <>
                        {/* Glow */}
                        <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        {/* Outer Ring */}
                        <div className="absolute inset-0 rounded-full border border-amber-500/30 group-hover:border-amber-500/60 group-hover:rotate-45 transition-all duration-700 bg-[#0A0A0A]" />
                        
                        {/* Inner Hexagon / Diamond effect via rotate */}
                        <div className="absolute inset-2 rounded-full border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent group-hover:-rotate-45 transition-all duration-700 flex items-center justify-center">
                          <badge.icon className="h-8 w-8 md:h-10 md:w-10 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] group-hover:scale-110 transition-transform duration-500" />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Dashed Outer Ring for unearned */}
                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/10 group-hover:border-white/20 transition-all duration-500 bg-[#0A0A0A]" />
                        
                        {/* Inner locked state */}
                        <div className="absolute inset-2 rounded-full bg-white/[0.02] flex items-center justify-center group-hover:bg-white/[0.05] transition-colors duration-500">
                          <badge.icon className="h-8 w-8 md:h-10 md:w-10 text-white/10 group-hover:text-white/20 transition-colors duration-500" />
                          <div className="absolute -bottom-2 -right-2 bg-[#0A0A0A] p-1.5 rounded-full border border-white/10 group-hover:border-white/20 transition-colors duration-500">
                            <Lock className="w-3 h-3 text-white/30" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Text */}
                  <div className="text-center relative z-10 w-full space-y-2">
                    <h3 className={`text-xs md:text-sm font-bold tracking-widest uppercase transition-colors duration-500 ${
                      badge.earned ? 'text-white group-hover:text-amber-400' : 'text-white/30'
                    }`}>
                      {badge.title}
                    </h3>
                    <div className={`h-0.5 w-4 mx-auto rounded-full transition-all duration-500 ${
                      badge.earned ? 'bg-amber-500 group-hover:w-8' : 'bg-white/10'
                    }`} />
                  </div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className="bg-[#111] border-white/10 text-white/70 px-4 py-3 rounded-xl shadow-2xl max-w-[200px] text-center"
              >
                <p className="text-xs tracking-wide leading-relaxed">{badge.description}</p>
                {!badge.earned && (
                  <p className="text-[10px] uppercase tracking-widest text-amber-500 mt-2 font-bold">Por desbloquear</p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  )
}
