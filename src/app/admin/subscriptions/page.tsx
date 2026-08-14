"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, DollarSign, DownloadCloud, ArrowUpRight, CheckCircle2, Users } from 'lucide-react';

const billingHistory = [
  { id: 'INV-2026-081', tenant: 'The Royal Barber', plan: 'Black Label', amount: '$150.000 COP', date: '14/07/2026', status: 'Paid' },
  { id: 'INV-2026-080', tenant: 'Urban Style Barbería', plan: 'Black Label', amount: '$150.000 COP', date: '12/07/2026', status: 'Paid' },
  { id: 'INV-2026-079', tenant: 'Gentleman\'s Lounge', plan: 'Barber Club', amount: '$80.000 COP', date: '05/07/2026', status: 'Paid' },
  { id: 'INV-2026-078', tenant: 'Classic Cuts Club', plan: 'Corte Clásico', amount: '$40.000 COP', date: '28/06/2026', status: 'Pending' },
];

const plans = [
  { 
    name: 'Corte Clásico', 
    price: '$40.000/mes', 
    users: 45, 
    gradient: 'from-zinc-900 to-black', 
    borderGlow: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:border-white/20',
    accent: 'text-zinc-400'
  },
  { 
    name: 'Barber Club', 
    price: '$80.000/mes', 
    users: 62, 
    gradient: 'from-zinc-900 via-black to-black', 
    borderGlow: 'hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] hover:border-amber-500/30',
    accent: 'text-amber-500'
  },
  { 
    name: 'Black Label', 
    price: '$150.000/mes', 
    users: 17, 
    gradient: 'from-amber-950/20 to-black', 
    borderGlow: 'hover:shadow-[0_0_40px_rgba(212,175,55,0.25)] hover:border-amber-400/50',
    accent: 'text-amber-400'
  }
];

export default function SubscriptionsPage() {
  return (
    <div className="min-h-screen w-full bg-[#050505] text-white selection:bg-amber-500/30 font-sans pb-24">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-amber-500/5 blur-[120px] rounded-full opacity-50" />
      </div>

      <div className="w-full max-w-7xl mx-auto space-y-16 px-6 lg:px-8 py-12 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
              <div className="flex items-center gap-4">
                 <div className="h-px w-12 bg-amber-500/50" />
                 <span className="text-amber-500 tracking-[0.4em] text-[10px] uppercase font-medium">Reporte Financiero</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl tracking-widest uppercase font-light">
                Suscripciones <span className="italic text-white/40">&</span> Pagos
              </h1>
              <p className="text-zinc-500 font-light mt-4 tracking-wide max-w-2xl text-sm leading-relaxed">
                Control financiero centralizado. Monitor de ingresos recurrentes, distribución de licencias activas y registro transaccional en tiempo real.
              </p>
          </motion.div>
        </div>

        {/* Plans Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.1 }}
                    className={`group relative rounded-2xl bg-gradient-to-b ${plan.gradient} border border-white/5 bg-black/60 backdrop-blur-2xl p-8 overflow-hidden transition-all duration-500 ${plan.borderGlow}`}
                >
                    <div className="flex justify-between items-start mb-12 relative z-10">
                        <div>
                            <h3 className={`text-[10px] tracking-[0.3em] uppercase ${plan.accent} mb-2 font-medium`}>{plan.name}</h3>
                            <p className="text-3xl font-light tracking-wide text-white">{plan.price}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-white/10 transition-colors">
                            <Users className={`w-5 h-5 ${plan.accent} opacity-80`} />
                        </div>
                    </div>
                    
                    <div className="flex items-end justify-between relative z-10">
                        <div className="flex flex-col gap-1">
                            <span className="text-4xl font-light text-white tracking-wider">{plan.users}</span>
                            <span className="text-[10px] tracking-[0.2em] text-white/40 uppercase">Suscripciones Activas</span>
                        </div>
                        <ArrowUpRight className={`w-6 h-6 ${plan.accent} opacity-50 group-hover:opacity-100 group-hover:-translate-y-1 group-hover:translate-x-1 transition-all duration-300`} />
                    </div>
                </motion.div>
            ))}
        </div>

        {/* Billing History */}
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.4 }}
           className="relative rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/5 p-8 overflow-hidden group hover:border-white/10 transition-colors duration-500"
        >
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/5">
                <h3 className="text-xs tracking-[0.3em] text-white/70 uppercase font-medium">Historial Transaccional</h3>
                <button className="flex items-center gap-3 text-[10px] tracking-[0.2em] text-amber-500 hover:text-amber-400 uppercase transition-colors group/btn">
                    <DownloadCloud className="w-4 h-4 transition-transform group-hover/btn:-translate-y-0.5" /> 
                    <span className="mt-0.5">Exportar Reporte</span>
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="pb-6 text-[10px] tracking-[0.2em] text-white/30 uppercase font-medium">ID Factura</th>
                            <th className="pb-6 text-[10px] tracking-[0.2em] text-white/30 uppercase font-medium">Cliente (Tenant)</th>
                            <th className="pb-6 text-[10px] tracking-[0.2em] text-white/30 uppercase font-medium">Licencia</th>
                            <th className="pb-6 text-[10px] tracking-[0.2em] text-white/30 uppercase font-medium">Emisión</th>
                            <th className="pb-6 text-[10px] tracking-[0.2em] text-white/30 uppercase font-medium">Monto</th>
                            <th className="pb-6 text-[10px] tracking-[0.2em] text-white/30 uppercase font-medium text-right">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {billingHistory.map((invoice, i) => (
                            <tr key={i} className="group/row hover:bg-white/[0.02] transition-colors">
                                <td className="py-6 pl-4 md:pl-0">
                                    <span className="text-sm font-light text-white/60 group-hover/row:text-amber-400 transition-colors cursor-pointer tracking-wider">
                                        {invoice.id}
                                    </span>
                                </td>
                                <td className="py-6 text-sm font-light text-white/90">{invoice.tenant}</td>
                                <td className="py-6">
                                    <span className="text-[10px] tracking-[0.2em] text-white/50 uppercase">{invoice.plan}</span>
                                </td>
                                <td className="py-6 text-sm font-light text-white/40 tracking-wider">{invoice.date}</td>
                                <td className="py-6 text-sm font-medium text-white tracking-wider">{invoice.amount}</td>
                                <td className="py-6 text-right pr-4 md:pr-0">
                                    {invoice.status === 'Paid' ? (
                                        <span className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-[10px] tracking-[0.1em] text-zinc-300 border border-white/10 uppercase">
                                            <CheckCircle2 className="w-3 h-3 text-green-500" /> Liquidado
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-[10px] tracking-[0.1em] text-zinc-300 border border-white/10 uppercase">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> En Proceso
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>

      </div>
    </div>
  );
}
