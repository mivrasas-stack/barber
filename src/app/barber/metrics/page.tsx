"use client";
import React from 'react';
import { Activity, TrendingUp, Users, Scissors, Star, Calendar, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { PremiumButton } from '@/components/ui/premium-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MetricsPage() {
  const metrics = [
    { title: "Retención de Clientes", value: "85%", icon: Users, trend: "+5%", positive: true },
    { title: "Servicio más popular", value: "Corte y Barba", icon: Scissors, trend: "40% del total", positive: true },
    { title: "Calificación Promedio", value: "4.9", icon: Star, trend: "+0.1", positive: true },
    { title: "Días más ocupados", value: "Viernes, Sábado", icon: Calendar, trend: "Estable", positive: true },
  ];

  return (
    <div className="flex flex-col w-full animate-in fade-in duration-700">
      <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        <div className="absolute top-0 right-2/3 w-40 h-40 bg-amber-500/10 blur-[70px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center hidden sm:flex">
            <Activity className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-headline text-white tracking-widest uppercase">Métricas y Rendimiento</h2>
            <p className="text-white/40 font-light tracking-wide mt-2 text-sm">
              Analiza tu desempeño y crecimiento profesional.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex gap-2 w-full md:w-auto">
            <Select defaultValue="este_año">
                <SelectTrigger className="bg-black/40 border-amber-500/20 text-white rounded-lg px-4 h-11 text-sm focus:ring-0 focus:outline-none focus:border-amber-500/50 backdrop-blur-md w-[160px] md:w-[180px] hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-amber-500" />
                        <SelectValue placeholder="Periodo" />
                    </div>
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-amber-500/20 text-white">
                    <SelectItem value="este_mes" className="focus:bg-amber-500/10 focus:text-amber-500 cursor-pointer">Este mes</SelectItem>
                    <SelectItem value="mes_pasado" className="focus:bg-amber-500/10 focus:text-amber-500 cursor-pointer">Mes pasado</SelectItem>
                    <SelectItem value="ultimos_3_meses" className="focus:bg-amber-500/10 focus:text-amber-500 cursor-pointer">Últimos 3 meses</SelectItem>
                    <SelectItem value="este_año" className="focus:bg-amber-500/10 focus:text-amber-500 cursor-pointer">Este año</SelectItem>
                </SelectContent>
            </Select>
            <PremiumButton variant="outline" className="hidden md:flex whitespace-nowrap">
                Descargar Reporte
            </PremiumButton>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10 mb-8">
        {metrics.map((metric, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            key={index} 
            className="group relative overflow-hidden rounded-[24px] bg-black/40 border border-white/5 hover:border-amber-500/30 transition-all duration-500 p-6 md:p-8 flex flex-col gap-4 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="flex items-start justify-between relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-amber-500/10 group-hover:border-amber-500/20 transition-colors">
                    <metric.icon className="w-6 h-6 text-white/60 group-hover:text-amber-500 transition-colors" />
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] md:text-xs font-headline tracking-widest uppercase px-3 py-1.5 rounded-full border ${metric.positive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    <TrendingUp className={`w-3 h-3 ${metric.positive ? '' : 'rotate-180'}`} />
                    {metric.trend}
                </div>
            </div>
            
            <div className="relative z-10 mt-4">
              <p className="text-[10px] md:text-xs text-white/50 tracking-[0.2em] uppercase font-medium mb-1">{metric.title}</p>
              <h3 className="text-2xl md:text-3xl font-headline text-white group-hover:text-amber-100 transition-colors">{metric.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart Placeholder */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full h-64 md:h-80 rounded-[24px] bg-black/40 border border-white/5 backdrop-blur-xl p-6 flex flex-col relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 to-transparent pointer-events-none" />
        <h3 className="text-sm font-headline tracking-widest text-white/60 uppercase mb-4 relative z-10">Evolución de Ingresos</h3>
        
        <div className="flex-1 w-full flex items-end justify-between gap-2 md:gap-4 relative z-10 pt-4">
            {[40, 60, 45, 80, 55, 90, 75, 100, 85, 110, 95, 120].map((height, i) => (
                <div key={i} className="w-full bg-white/5 hover:bg-amber-500/40 transition-colors rounded-t-sm md:rounded-t-md relative group cursor-pointer" style={{ height: `${height}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 font-headline tracking-widest">
                        ${height * 10}
                    </div>
                </div>
            ))}
        </div>
        <div className="w-full flex justify-between mt-4 text-[10px] text-white/30 font-headline tracking-widest uppercase relative z-10">
            <span>Ene</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Abr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Ago</span>
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dic</span>
        </div>
      </motion.div>
    </div>
  );
}
