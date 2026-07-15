"use client";

import React, { useEffect } from 'react';
import { Award, Calendar, Gem, Star } from "lucide-react"
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
    { icon: Calendar, title: "Cliente Frecuente", description: "5 visitas en un mes.", earned: true },
    { icon: Award, title: "Lealtad de Oro", description: "25 citas completadas.", earned: false },
    { icon: Gem, title: "Embajador", description: "Recomienda a 5 amigos.", earned: false },
]

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
              <badge.icon className="h-5 w-5 text-primary" />
              <p>Has sido reconocido como: <strong>{badge.title}</strong></p>
            </div>
          ),
        });
        sessionStorage.setItem(badgeKey, 'true');
      }
    });
  }, [toast]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="pb-6 border-b border-white/10">
        <h2 className="text-3xl font-headline text-white tracking-wide">GALERÍA DE LOGROS</h2>
        <p className="text-muted-foreground font-light mt-1">Reconocimientos a tu lealtad y estilo inconfundible.</p>
      </div>
      
      <TooltipProvider delayDuration={100}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {badges.map((badge, index) => (
              <Tooltip key={index}>
                  <TooltipTrigger asChild>
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className={`group relative flex flex-col items-center justify-center p-8 h-48 border transition-all duration-500 overflow-hidden ${
                          badge.earned 
                          ? 'border-primary/50 bg-primary/5 hover:bg-primary/10 hover:shadow-[0_0_30px_rgba(200,155,60,0.15)]' 
                          : 'border-white/5 bg-transparent opacity-50 grayscale hover:grayscale-0 hover:opacity-100'
                        }`}
                      >
                          {badge.earned && (
                             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" /> 
                          )}
                          <badge.icon className={`h-12 w-12 mb-4 transition-colors duration-500 ${
                            badge.earned ? 'text-primary drop-shadow-[0_0_15px_rgba(200,155,60,0.5)]' : 'text-white/40 group-hover:text-white/60'
                          }`} />
                          <p className="text-sm font-headline tracking-widest uppercase text-white relative z-10">{badge.title}</p>
                      </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-background border-white/10 text-muted-foreground">
                      <p>{badge.description}</p>
                  </TooltipContent>
              </Tooltip>
          ))}
          </div>
      </TooltipProvider>
    </div>
  )
}
