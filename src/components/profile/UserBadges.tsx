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
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-border relative">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-48 h-48 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="relative z-10 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start gap-2 mb-2">
            <h2 className="text-3xl md:text-4xl font-headline font-bold tracking-[0.2em] uppercase text-foreground">
              Logros <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 text-transparent bg-clip-text">Desbloqueados</span>
            </h2>
          </div>
          <p className="text-foreground/60 font-light tracking-wide text-sm md:text-base max-w-xl">
            Insignias y reconocimientos exclusivos a tu lealtad e impecable estilo. Cada galardón cuenta tu historia en Barber Paradise.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-6 bg-black/40 backdrop-blur-md border border-border px-8 py-4 rounded-2xl shadow-xl">
          <div className="flex flex-col text-center">
            <span className="text-2xl font-headline text-amber-400 font-bold drop-shadow-md">{badges.filter(b => b.earned).length}</span>
            <span className="text-[10px] tracking-widest text-foreground/40 uppercase">Obtenidos</span>
          </div>
          <div className="w-px h-10 bg-foreground/10" />
          <div className="flex flex-col text-center">
            <span className="text-2xl font-headline text-foreground/40 font-bold">{badges.length}</span>
            <span className="text-[10px] tracking-widest text-foreground/40 uppercase">Total</span>
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
                  className="group relative flex flex-col items-center justify-center p-6 h-64 md:h-72 cursor-pointer outline-none bg-white/[0.01] hover:bg-white/[0.03] border border-transparent hover:border-border rounded-3xl transition-all duration-500"
                >
                  {/* Badge Container */}
                  <div className={`relative w-28 h-28 md:w-36 md:h-36 mb-8 flex items-center justify-center transition-all duration-700 z-10 ${
                    badge.earned ? 'group-hover:-translate-y-3 group-hover:scale-105' : ''
                  }`}>
                    
                    {/* Background Shape */}
                    {badge.earned ? (
                      <>
                        {/* Glow */}
                        <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full opacity-40 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        {/* Outer Ring */}
                        <div className="absolute inset-0 rounded-full border border-amber-500/30 group-hover:border-amber-400/80 group-hover:rotate-90 transition-all duration-1000 bg-black/80 backdrop-blur-sm shadow-[inset_0_0_20px_rgba(245,158,11,0.2)]" />
                        
                        {/* Inner Diamond */}
                        <div className="absolute inset-3 rounded-full border border-amber-500/20 bg-gradient-to-br from-amber-500/20 via-transparent to-amber-900/40 group-hover:-rotate-90 transition-all duration-1000 flex items-center justify-center">
                          <badge.icon className="h-10 w-10 md:h-12 md:w-12 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] group-hover:scale-110 transition-transform duration-700" />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Dashed Outer Ring for unearned */}
                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-border group-hover:border-border transition-all duration-700 bg-black/40 backdrop-blur-sm" />
                        
                        {/* Inner locked state */}
                        <div className="absolute inset-3 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/[0.05] transition-colors duration-700">
                          <badge.icon className="h-10 w-10 md:h-12 md:w-12 text-foreground/10 group-hover:text-foreground/20 transition-colors duration-700" />
                          <div className="absolute -bottom-1 -right-1 bg-background p-2 rounded-full border border-border group-hover:border-border transition-colors duration-700 shadow-xl">
                            <Lock className="w-4 h-4 text-foreground/30" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Text */}
                  <div className="text-center relative z-10 w-full space-y-3">
                    <h3 className={`text-xs md:text-sm font-headline tracking-widest uppercase transition-colors duration-500 ${
                      badge.earned ? 'text-foreground group-hover:text-amber-400' : 'text-foreground/30'
                    }`}>
                      {badge.title}
                    </h3>
                    <div className={`h-1 w-4 mx-auto rounded-full transition-all duration-700 ${
                      badge.earned ? 'bg-gradient-to-r from-amber-500 to-amber-200 group-hover:w-12 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-foreground/10'
                    }`} />
                  </div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className="bg-black/90 backdrop-blur-xl border-border text-foreground/80 px-5 py-4 rounded-2xl shadow-2xl max-w-[220px] text-center"
              >
                <p className="text-sm tracking-wide leading-relaxed font-light">{badge.description}</p>
                {!badge.earned && (
                  <div className="mt-3 inline-block bg-foreground/5 px-3 py-1 rounded-full border border-border">
                    <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">Por desbloquear</p>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  )
}

