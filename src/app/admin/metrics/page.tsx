"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, Users, Building2, Server, Database, MemoryStick as Memory, Download, Zap, ChevronUp, ChevronDown } from 'lucide-react';

const kpis = [
  { id: 1, title: 'Ingresos MRR', value: '$12,450', change: '+14%', isPositive: true, icon: TrendingUp },
  { id: 2, title: 'Barberías', value: '142', change: '+5', isPositive: true, icon: Building2 },
  { id: 3, title: 'Usuarios', value: '12,503', change: '+842', isPositive: true, icon: Users },
  { id: 4, title: 'Uptime', value: '99.99%', change: '-0.01%', isPositive: false, icon: Server },
];

export default function MetricsPage() {
  return (
    <div className="min-h-screen bg-[#050505] w-full p-4 sm:p-6 lg:p-8 font-sans selection:bg-emerald-500/30 text-white/90">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
              <div className="flex items-center gap-3 mb-4">
                 <div className="h-[2px] w-12 bg-gradient-to-r from-emerald-400 to-transparent rounded-full" />
                 <span className="text-emerald-400 font-medium tracking-[0.2em] text-[10px] uppercase">Intelligence Dashboard</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-light text-white tracking-tight">
                Métricas <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/30">Globales</span>
              </h1>
              <p className="text-white/40 font-light mt-4 tracking-wide max-w-xl text-sm leading-relaxed">
                Monitoreo algorítmico y estado de la red en tiempo real. Analíticas de rendimiento avanzadas y distribución de carga.
              </p>
          </motion.div>
          
          <motion.button 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.5, delay: 0.2 }}
             className="group relative flex items-center gap-3 px-8 h-14 bg-black/50 backdrop-blur-xl border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-white font-medium tracking-wide text-sm rounded-3xl transition-all duration-500 overflow-hidden w-full md:w-auto justify-center shadow-[0_0_40px_-15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)]"
          >
             <Download className="w-4 h-4 text-white/50 group-hover:text-emerald-400 transition-colors duration-500" />
             <span className="group-hover:text-emerald-50 transition-colors duration-500">Extraer Reporte</span>
          </motion.button>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-white/20 transition-all duration-500 shadow-2xl shadow-black/50"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-700" />
              
              <div className="flex justify-between items-start mb-8 relative">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors duration-500">
                  <kpi.icon className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${kpi.isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                  {kpi.isPositive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {kpi.change}
                </div>
              </div>
              
              <div className="relative">
                <p className="text-white/40 text-xs font-medium tracking-wider uppercase mb-2">{kpi.title}</p>
                <h3 className="text-4xl md:text-5xl font-light text-white tracking-tight">
                  <span className={kpi.isPositive ? 'text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60' : 'text-white'}>
                    {kpi.value}
                  </span>
                </h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* System Health & Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
            
            {/* Growth Chart */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, delay: 0.4 }}
               className="lg:col-span-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 md:p-10 flex flex-col relative overflow-hidden shadow-2xl shadow-black/50"
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                
                <div className="flex justify-between items-center mb-12">
                  <h3 className="text-white/80 text-sm font-medium tracking-widest uppercase">Expansión de Nodos</h3>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">En línea</span>
                  </div>
                </div>
                
                <div className="flex-1 flex items-end justify-between gap-4 h-56 relative mt-auto">
                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div className="border-t border-white/[0.03] w-full border-dashed" />
                        <div className="border-t border-white/[0.03] w-full border-dashed" />
                        <div className="border-t border-white/[0.03] w-full border-dashed" />
                        <div className="border-t border-white/[0.03] w-full border-dashed" />
                    </div>
                    
                    {/* Bars */}
                    {[40, 55, 45, 70, 90, 100].map((height, idx) => (
                        <div key={idx} className="w-full max-w-[48px] h-full flex flex-col justify-end relative group z-10">
                            <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ duration: 1.2, delay: 0.5 + (idx * 0.1), ease: [0.16, 1, 0.3, 1] }}
                                className="w-full bg-gradient-to-t from-white/5 to-white/20 rounded-t-2xl relative overflow-hidden group-hover:from-emerald-500/20 group-hover:to-emerald-400/60 transition-all duration-500 backdrop-blur-sm border-t border-white/10"
                            >
                              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.div>
                            <div className="absolute -bottom-8 w-full text-center text-[11px] font-medium text-white/30 group-hover:text-white/80 transition-colors uppercase tracking-widest">
                                {['Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'][idx]}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Server Status */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, delay: 0.5 }}
               className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-black/50 relative overflow-hidden"
            >
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-white/80 text-sm font-medium tracking-widest uppercase">Diagnóstico</h3>
                    <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                      <Zap className="w-4 h-4 text-emerald-400" />
                    </div>
                </div>
                
                <div className="space-y-8">
                    {/* CPU */}
                    <div className="group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 text-white/50 group-hover:text-white/80 transition-colors">
                                <Activity className="w-4 h-4" />
                                <span className="text-[11px] uppercase tracking-widest font-medium">Carga Lógica</span>
                            </div>
                            <span className="text-[11px] text-white/80 font-mono">42%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '42%' }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-emerald-500/50 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                            />
                        </div>
                    </div>

                    {/* RAM */}
                    <div className="group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 text-white/50 group-hover:text-white/80 transition-colors">
                                <Memory className="w-4 h-4" />
                                <span className="text-[11px] uppercase tracking-widest font-medium">Memoria Activa</span>
                            </div>
                            <span className="text-[11px] text-white/80 font-mono">68%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '68%' }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-amber-500/50 to-amber-400 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                            />
                        </div>
                    </div>

                    {/* DB */}
                    <div className="group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 text-white/50 group-hover:text-white/80 transition-colors">
                                <Database className="w-4 h-4" />
                                <span className="text-[11px] uppercase tracking-widest font-medium">Latencia DB</span>
                            </div>
                            <span className="text-[11px] text-emerald-400 font-mono">21%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '21%' }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-emerald-500/50 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>

      </div>
    </div>
  );
}
