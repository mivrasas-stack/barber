"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, Users, Building2, Server, Database, MemoryStick as Memory, Download } from 'lucide-react';

const kpis = [
  { id: 1, title: 'Ingresos Mensuales (MRR)', value: '$12,450', change: '+14%', isPositive: true, icon: TrendingUp },
  { id: 2, title: 'Barberías Activas', value: '142', change: '+5', isPositive: true, icon: Building2 },
  { id: 3, title: 'Usuarios Totales', value: '12,503', change: '+842', isPositive: true, icon: Users },
  { id: 4, title: 'Uptime del Servidor', value: '99.99%', change: '-0.01%', isPositive: false, icon: Server },
];

export default function MetricsPage() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-12 px-4 sm:px-6 lg:px-8 py-8 pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="flex items-center gap-3 mb-3">
               <div className="h-px w-8 bg-amber-500" />
               <span className="text-amber-500 font-headline tracking-[0.3em] text-xs uppercase">Rendimiento</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
              Métricas <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">del Sistema</span>
            </h1>
            <p className="text-white/40 font-light mt-4 tracking-wide max-w-xl text-sm">
              Monitoreo en tiempo real del desempeño de la plataforma, crecimiento de franquicias y estado actual de los servidores globales.
            </p>
        </motion.div>
        
        <motion.button 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5, delay: 0.2 }}
           className="group relative flex items-center gap-2 px-6 h-12 bg-white/[0.03] border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 text-white font-headline tracking-widest uppercase text-xs rounded-xl transition-all overflow-hidden w-full md:w-auto justify-center shrink-0"
        >
           <Download className="w-4 h-4 text-white/50 group-hover:text-amber-400 transition-colors" />
           <span className="group-hover:text-amber-100 transition-colors">Exportar Reporte</span>
        </motion.button>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative z-10">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * i }}
            className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                <kpi.icon className="w-16 h-16 text-amber-500" />
            </div>
            
            <p className="text-white/40 text-xs font-headline tracking-widest uppercase mb-4">{kpi.title}</p>
            <div className="flex items-end gap-4">
                <h3 className="text-3xl font-headline text-white tracking-wide">{kpi.value}</h3>
                <div className={`flex items-center gap-1 text-xs font-medium mb-1 ${kpi.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                    <span>{kpi.change}</span>
                </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* System Health & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          
          {/* Growth Chart (Mocked with CSS) */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.4 }}
             className="lg:col-span-2 bg-[#0A0A0A] border border-white/5 rounded-[24px] p-6 md:p-8 flex flex-col relative overflow-hidden"
          >
              <h3 className="text-white text-sm font-headline tracking-widest uppercase mb-8">Crecimiento de Franquicias (Últimos 6 meses)</h3>
              <div className="flex-1 flex items-end justify-between gap-2 h-48 relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                      <div className="border-t border-white/10 w-full"></div>
                      <div className="border-t border-white/10 w-full"></div>
                      <div className="border-t border-white/10 w-full"></div>
                      <div className="border-t border-white/10 w-full"></div>
                  </div>
                  
                  {/* Bars */}
                  {[40, 55, 45, 70, 90, 100].map((height, idx) => (
                      <div key={idx} className="w-full max-w-[40px] bg-white/5 rounded-t-lg relative group">
                          <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: `${height}%` }}
                              transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }}
                              className="absolute bottom-0 w-full bg-gradient-to-t from-amber-600/50 to-amber-400 rounded-t-lg group-hover:opacity-80 transition-opacity"
                          />
                          <div className="absolute -bottom-6 w-full text-center text-[10px] text-white/40 uppercase tracking-widest">
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
             className="bg-[#0A0A0A] border border-white/5 rounded-[24px] p-6 md:p-8"
          >
              <div className="flex items-center justify-between mb-8">
                  <h3 className="text-white text-sm font-headline tracking-widest uppercase">Salud del Servidor</h3>
                  <Activity className="w-5 h-5 text-amber-500 animate-pulse" />
              </div>
              
              <div className="space-y-6">
                  {/* CPU */}
                  <div>
                      <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-white/60">
                              <Activity className="w-4 h-4" />
                              <span className="text-xs uppercase tracking-widest">CPU Usage</span>
                          </div>
                          <span className="text-xs text-amber-400 font-medium">42%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: '42%' }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="h-full bg-amber-500 rounded-full"
                          />
                      </div>
                  </div>

                  {/* RAM */}
                  <div>
                      <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-white/60">
                              <Memory className="w-4 h-4" />
                              <span className="text-xs uppercase tracking-widest">Memory (RAM)</span>
                          </div>
                          <span className="text-xs text-amber-400 font-medium">68%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: '68%' }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="h-full bg-amber-500 rounded-full"
                          />
                      </div>
                  </div>

                  {/* DB */}
                  <div>
                      <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-white/60">
                              <Database className="w-4 h-4" />
                              <span className="text-xs uppercase tracking-widest">Database Load</span>
                          </div>
                          <span className="text-xs text-emerald-400 font-medium">21%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: '21%' }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="h-full bg-emerald-500 rounded-full"
                          />
                      </div>
                  </div>
              </div>
          </motion.div>
      </div>

    </div>
  );
}
