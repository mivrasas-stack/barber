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
    <div className="flex flex-col w-full min-h-screen animate-in fade-in duration-700 relative pb-20">
      {/* Elementos Ambientales */}
      <div className="fixed top-1/4 right-0 w-[40vw] h-[40vw] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
      <div className="fixed bottom-0 left-0 w-[50vw] h-[50vw] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

      {/* Header */}
      <div className="mb-10 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <p className="text-purple-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm mb-2">Performance</p>
          <h2 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
            Centro de <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-purple-500 to-purple-700 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">Métricas</span>
          </h2>
        </div>

        <div className="relative z-10 flex gap-4 w-full md:w-auto">
          <Select defaultValue="este_año">
              <SelectTrigger className="bg-[#0F0F0F] border-white/5 text-white rounded-2xl px-6 h-14 text-sm focus:ring-0 focus:outline-none focus:border-purple-500/50 backdrop-blur-md w-full md:w-[200px] hover:bg-[#151515] transition-colors shadow-inner">
                  <div className="flex items-center gap-3">
                      <CalendarDays className="w-4 h-4 text-purple-500" />
                      <SelectValue placeholder="Periodo" className="tracking-widest" />
                  </div>
              </SelectTrigger>
              <SelectContent className="bg-[#0A0A0A] border-white/10 text-white rounded-2xl">
                  <SelectItem value="este_mes" className="focus:bg-purple-500/20 focus:text-purple-400 cursor-pointer rounded-xl">Este mes</SelectItem>
                  <SelectItem value="mes_pasado" className="focus:bg-purple-500/20 focus:text-purple-400 cursor-pointer rounded-xl">Mes pasado</SelectItem>
                  <SelectItem value="ultimos_3_meses" className="focus:bg-purple-500/20 focus:text-purple-400 cursor-pointer rounded-xl">Últimos 3 meses</SelectItem>
                  <SelectItem value="este_año" className="focus:bg-purple-500/20 focus:text-purple-400 cursor-pointer rounded-xl">Este año</SelectItem>
              </SelectContent>
          </Select>
          <PremiumButton className="hidden md:flex whitespace-nowrap px-8">
              Exportar
          </PremiumButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10 mb-12">
        {metrics.map((metric, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
            key={index} 
            className="group relative overflow-hidden rounded-[32px] bg-[#0F0F0F] border border-white/5 hover:border-purple-500/30 transition-all duration-500 p-8 flex flex-col gap-6 backdrop-blur-xl shadow-2xl hover:bg-[#151515]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="flex items-start justify-between relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-black border border-white/5 flex items-center justify-center group-hover:bg-purple-500/10 group-hover:border-purple-500/30 transition-all duration-500 shadow-inner group-hover:scale-110">
                    <metric.icon className="w-6 h-6 text-white/40 group-hover:text-purple-400 transition-colors" />
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] md:text-xs font-headline tracking-widest uppercase px-4 py-2 rounded-full border ${metric.positive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    <TrendingUp className={`w-3 h-3 ${metric.positive ? '' : 'rotate-180'}`} />
                    {metric.trend}
                </div>
            </div>
            
            <div className="relative z-10 mt-auto pt-4 border-t border-white/5">
              <p className="text-[10px] text-white/40 tracking-[0.2em] uppercase font-light mb-2">{metric.title}</p>
              <h3 className="text-3xl font-headline text-white group-hover:text-purple-100 transition-colors">{metric.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
        className="w-full h-[400px] rounded-[40px] bg-[#0F0F0F] border border-white/5 backdrop-blur-xl p-8 md:p-10 flex flex-col relative overflow-hidden shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <h3 className="text-lg font-headline tracking-widest text-white uppercase">Evolución del Negocio</h3>
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/30 border border-white/10 px-4 py-1.5 rounded-full">Reporte Anual</span>
        </div>
        
        <div className="flex-1 w-full flex items-end justify-between gap-3 md:gap-6 relative z-10">
            {[40, 60, 45, 80, 55, 90, 75, 100, 85, 110, 95, 120].map((height, i) => (
                <div key={i} className="w-full bg-[#1A1A1A] hover:bg-gradient-to-t hover:from-purple-600 hover:to-purple-400 transition-all duration-500 rounded-t-xl relative group cursor-pointer shadow-inner" style={{ height: `${height}%` }}>
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 font-headline tracking-widest shadow-2xl">
                        {height * 12} Citas
                    </div>
                    {/* Inner glow on hover */}
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl mix-blend-overlay" />
                </div>
            ))}
        </div>
        <div className="w-full flex justify-between mt-6 text-[10px] text-white/40 font-headline tracking-widest uppercase relative z-10 border-t border-white/5 pt-6">
            <span>Ene</span>
            <span>Feb</span>
            <span className="hidden sm:block">Mar</span>
            <span>Abr</span>
            <span className="hidden sm:block">May</span>
            <span>Jun</span>
            <span className="hidden sm:block">Jul</span>
            <span>Ago</span>
            <span className="hidden sm:block">Sep</span>
            <span>Oct</span>
            <span className="hidden sm:block">Nov</span>
            <span>Dic</span>
        </div>
      </motion.div>
    </div>
  );
}
