"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Search, Filter, AlertTriangle, Info, AlertCircle, Calendar, ChevronRight, Terminal, Clock, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';

const auditLogs = [
  { id: 1, action: 'Suscripción Cancelada', user: 'Carlos Torres (Tenant)', ip: '190.158.204.12', date: '16/07/2026 - 14:32:00', level: 'critical', details: 'El tenant ha cancelado la suscripción de forma manual desde el panel de facturación. Motivo: Cambio de software.' },
  { id: 2, action: 'Inicio de sesión fallido', user: 'Desconocido', ip: '45.230.12.99', date: '16/07/2026 - 12:15:22', level: 'warning', details: 'Se detectaron 5 intentos de inicio de sesión fallidos en menos de 1 minuto desde esta dirección IP.' },
  { id: 3, action: 'Cambio en configuración global', user: 'Admin Principal', ip: '181.54.21.1', date: '15/07/2026 - 09:45:10', level: 'info', details: 'Se modificó el límite de tiempo de inactividad de la sesión global de 30 a 60 minutos.' },
  { id: 4, action: 'Nuevo Tenant Registrado', user: 'Jorge Silva (Tenant)', ip: '190.24.110.5', date: '14/07/2026 - 16:20:05', level: 'info', details: 'Registro completado para la barbería "Estilo y Corte". Se habilitó el periodo de prueba de 14 días.' },
  { id: 5, action: 'Tenant Suspendido', user: 'Soporte Técnico', ip: '181.54.21.1', date: '12/07/2026 - 10:05:40', level: 'warning', details: 'Suspensión manual por falta de pago. Se envió notificación por correo electrónico al administrador del tenant.' },
];

const getLevelIcon = (level: string) => {
    switch(level) {
        case 'critical': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
        case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
        default: return <Info className="w-3.5 h-3.5 text-blue-400" />;
    }
};

const getLevelStyles = (level: string) => {
    switch(level) {
        case 'critical': return 'text-red-400/90 border-red-500/20 bg-red-500/[0.05] shadow-[0_0_10px_rgba(239,68,68,0.1)]';
        case 'warning': return 'text-amber-400/90 border-amber-500/20 bg-amber-500/[0.05] shadow-[0_0_10px_rgba(245,158,11,0.1)]';
        default: return 'text-blue-400/90 border-blue-500/20 bg-blue-500/[0.05] shadow-[0_0_10px_rgba(59,130,246,0.1)]';
    }
};

export default function AuditPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] text-white/80 font-sans selection:bg-white/10 selection:text-white pb-20">
      
      {/* Top Navigation / Terminal Bar */}
      <div className="w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-white/40" />
            <span className="font-mono text-[10px] text-white/40 tracking-widest uppercase">sys.audit_log // 2026.08.14</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[10px] text-white/40 uppercase tracking-wider">Live Monitoring</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-12 space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
              <h1 className="text-4xl md:text-6xl font-light tracking-tight text-white mb-2">
                System <span className="font-serif italic text-white/50">Audit</span>
              </h1>
              <p className="text-white/40 font-light mt-4 tracking-wide max-w-xl text-sm leading-relaxed">
                Registro inmutable y criptográficamente seguro de las operaciones críticas. Monitorizando eventos en tiempo real.
              </p>
          </motion.div>
          
          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
             className="flex flex-col items-end gap-2"
          >
            <div className="flex items-center gap-3 px-4 py-2 border border-white/5 bg-white/[0.01] rounded-full backdrop-blur-sm">
               <ShieldCheck className="w-4 h-4 text-emerald-400" />
               <span className="font-mono text-[10px] text-white/60 tracking-widest uppercase">Security Level: Maximum</span>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <motion.div 
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
                <div className="relative w-full max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 transition-colors group-focus-within:text-white/60" />
                    <Input 
                        placeholder="Query log entries..." 
                        className="w-full bg-white/[0.02] border-white/5 text-white/80 placeholder:text-white/20 pl-11 h-12 rounded-none border-b focus:border-white/20 focus:ring-0 focus-visible:ring-0 shadow-none transition-all font-mono text-xs"
                    />
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none items-center gap-2 px-5 h-10 rounded-none border border-white/5 bg-transparent text-white/40 hover:text-white hover:bg-white/[0.02] hover:border-white/10 transition-all flex justify-center group">
                        <Calendar className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[10px] font-mono tracking-widest uppercase hidden sm:inline">Date Range</span>
                    </button>
                    <button className="flex-1 sm:flex-none items-center gap-2 px-5 h-10 rounded-none border border-white/5 bg-transparent text-white/40 hover:text-white hover:bg-white/[0.02] hover:border-white/10 transition-all flex justify-center group">
                        <Filter className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[10px] font-mono tracking-widest uppercase">Filters</span>
                    </button>
                </div>
            </div>

            {/* Logs List Container - Luxury Receipt/Terminal Style */}
            <div className="border border-white/5 bg-[#050505] relative before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] before:from-white/[0.03] before:to-transparent before:pointer-events-none shadow-2xl shadow-black">
                
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-white/5 bg-white/[0.01] sticky top-14 z-40 backdrop-blur-md">
                    <div className="col-span-2 text-[10px] font-mono tracking-widest text-white/30 uppercase">Status</div>
                    <div className="col-span-4 text-[10px] font-mono tracking-widest text-white/30 uppercase">Action / Event</div>
                    <div className="col-span-3 text-[10px] font-mono tracking-widest text-white/30 uppercase">Identity / Origin</div>
                    <div className="col-span-3 text-[10px] font-mono tracking-widest text-white/30 uppercase text-right">Timestamp</div>
                </div>

                <div className="flex flex-col">
                    {auditLogs.map((log) => {
                        const isExpanded = expandedId === log.id;
                        return (
                        <div key={log.id} className="group flex flex-col border-b border-white/5 last:border-0 relative">
                            {/* Hover Highlight Border */}
                            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white opacity-0 group-hover:opacity-100 transition-opacity" style={{ boxShadow: '0 0 10px rgba(255,255,255,0.5)' }} />

                            <div 
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}
                              className={`grid grid-cols-12 gap-4 px-8 py-5 cursor-pointer transition-colors duration-300 ${isExpanded ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'}`}
                            >
                                <div className="col-span-2 flex items-center">
                                    <span className={`inline-flex items-center gap-2 px-2.5 py-1 text-[9px] font-mono tracking-widest uppercase border rounded-sm ${getLevelStyles(log.level)}`}>
                                        {getLevelIcon(log.level)}
                                        {log.level}
                                    </span>
                                </div>
                                
                                <div className="col-span-4 flex flex-col justify-center gap-1.5">
                                    <span className="text-sm font-light text-white/90 group-hover:text-white transition-colors">{log.action}</span>
                                    <span className="font-mono text-[10px] text-white/30">[EVT-{log.id.toString().padStart(4, '0')}]</span>
                                </div>
                                
                                <div className="col-span-3 flex flex-col justify-center gap-1.5">
                                    <span className="text-xs text-white/60">{log.user}</span>
                                    <div className="flex items-center gap-1.5">
                                      <Activity className="w-3 h-3 text-white/20" />
                                      <span className="font-mono text-[10px] text-white/40">{log.ip}</span>
                                    </div>
                                </div>
                                
                                <div className="col-span-3 flex items-center justify-end gap-6">
                                    <div className="flex flex-col items-end gap-1.5">
                                      <span className="font-mono text-[10px] text-white/50">{log.date.split(' - ')[0]}</span>
                                      <div className="flex items-center gap-1.5 text-white/30">
                                        <Clock className="w-3 h-3" />
                                        <span className="font-mono text-[10px]">{log.date.split(' - ')[1]}</span>
                                      </div>
                                    </div>
                                    <div className="w-4 flex justify-end">
                                      <ChevronRight className={`w-4 h-4 text-white/20 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-white/60' : 'group-hover:text-white/40'}`} />
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                  className="overflow-hidden bg-white/[0.01]"
                                >
                                  <div className="p-8 pt-2">
                                    <div className="p-6 border border-white/5 bg-[#050505] rounded-none flex flex-col gap-4 relative overflow-hidden">
                                        {/* Subtle pattern background for the detail box */}
                                        <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                                        
                                        <div className="relative z-10">
                                          <h4 className="font-mono text-[10px] tracking-widest text-white/40 uppercase mb-3 flex items-center gap-2">
                                              <Terminal className="w-3 h-3" />
                                              Verbose Output
                                          </h4>
                                          <p className="text-sm font-light text-white/70 leading-relaxed font-mono">
                                            {log.details}
                                          </p>
                                        </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                        </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="mt-6 flex justify-between items-center px-4">
              <span className="font-mono text-[10px] text-white/30 tracking-widest uppercase">Showing 5 of 5 entries</span>
              <span className="font-mono text-[10px] text-white/30 tracking-widest uppercase">End of Log</span>
            </div>
        </motion.div>

      </div>
    </div>
  );
}

