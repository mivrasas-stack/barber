"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Search, Filter, AlertTriangle, Info, AlertCircle, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';

const auditLogs = [
  { id: 1, action: 'Suscripción Cancelada', user: 'Carlos Torres (Tenant)', ip: '190.158.204.12', date: '16/07/2026 - 14:32:00', level: 'critical' },
  { id: 2, action: 'Inicio de sesión fallido', user: 'Desconocido', ip: '45.230.12.99', date: '16/07/2026 - 12:15:22', level: 'warning' },
  { id: 3, action: 'Cambio en configuración global', user: 'Admin Principal', ip: '181.54.21.1', date: '15/07/2026 - 09:45:10', level: 'info' },
  { id: 4, action: 'Nuevo Tenant Registrado', user: 'Jorge Silva (Tenant)', ip: '190.24.110.5', date: '14/07/2026 - 16:20:05', level: 'info' },
  { id: 5, action: 'Tenant Suspendido', user: 'Soporte Técnico', ip: '181.54.21.1', date: '12/07/2026 - 10:05:40', level: 'warning' },
];

const getLevelIcon = (level: string) => {
    switch(level) {
        case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
        case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        default: return <Info className="w-4 h-4 text-blue-400" />;
    }
};

const getLevelStyles = (level: string) => {
    switch(level) {
        case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
        case 'warning': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
};

export default function AuditPage() {
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
               <span className="text-amber-500 font-headline tracking-[0.3em] text-xs uppercase">Seguridad</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
              Auditoría <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">del Sistema</span>
            </h1>
            <p className="text-white/40 font-light mt-4 tracking-wide max-w-xl text-sm">
              Registro inmutable de todas las acciones críticas, inicios de sesión y cambios de configuración realizados en la plataforma.
            </p>
        </motion.div>
        
        <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5, delay: 0.2 }}
           className="flex items-center gap-2 px-6 h-12 bg-white/[0.02] border border-white/5 rounded-xl shrink-0"
        >
           <ShieldCheck className="w-5 h-5 text-amber-500" />
           <span className="text-white/60 font-headline tracking-widest uppercase text-xs">Sistema Protegido</span>
        </motion.div>
      </div>

      {/* Main Content */}
      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.8, delay: 0.2 }}
         className="relative rounded-[32px] bg-gradient-to-b from-white/[0.02] to-transparent border border-white/5 overflow-hidden"
      >
          {/* Controls */}
          <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center bg-black/40">
              <div className="relative w-full max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input 
                      placeholder="Buscar evento, usuario o IP..." 
                      className="w-full bg-white/5 border-white/10 text-white pl-12 h-12 rounded-xl focus:border-amber-500/50 focus:ring-amber-500/20"
                  />
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                  <button className="flex-1 sm:flex-none items-center gap-2 px-6 h-12 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors flex justify-center">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-light tracking-widest uppercase hidden sm:inline">Fecha</span>
                  </button>
                  <button className="flex-1 sm:flex-none items-center gap-2 px-6 h-12 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors flex justify-center">
                      <Filter className="w-4 h-4" />
                      <span className="text-sm font-light tracking-widest uppercase">Filtros</span>
                  </button>
              </div>
          </div>

          {/* Logs List */}
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01]">
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Nivel</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Evento</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Usuario / IP</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Fecha y Hora</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-8 py-6">
                                  <span className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[10px] font-headline tracking-widest uppercase border ${getLevelStyles(log.level)}`}>
                                      {getLevelIcon(log.level)}
                                      {log.level}
                                  </span>
                              </td>
                              <td className="px-8 py-6">
                                  <p className="font-headline tracking-wide text-white group-hover:text-amber-300 transition-colors">{log.action}</p>
                              </td>
                              <td className="px-8 py-6">
                                  <p className="text-sm font-medium text-white/80">{log.user}</p>
                                  <p className="text-[10px] font-light text-white/40 mt-1 font-mono">{log.ip}</p>
                              </td>
                              <td className="px-8 py-6 text-white/50 text-sm font-light">
                                  {log.date}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </motion.div>

    </div>
  );
}
