"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, DollarSign, DownloadCloud, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const billingHistory = [
  { id: 'INV-2026-081', tenant: 'The Royal Barber', plan: 'Black Label', amount: '$150.000 COP', date: '14/07/2026', status: 'Paid' },
  { id: 'INV-2026-080', tenant: 'Urban Style Barbería', plan: 'Black Label', amount: '$150.000 COP', date: '12/07/2026', status: 'Paid' },
  { id: 'INV-2026-079', tenant: 'Gentleman\'s Lounge', plan: 'Barber Club', amount: '$80.000 COP', date: '05/07/2026', status: 'Paid' },
  { id: 'INV-2026-078', tenant: 'Classic Cuts Club', plan: 'Corte Clásico', amount: '$40.000 COP', date: '28/06/2026', status: 'Pending' },
];

export default function SubscriptionsPage() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-12 px-4 sm:px-6 lg:px-8 py-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="flex items-center gap-3 mb-3">
               <div className="h-px w-8 bg-amber-500" />
               <span className="text-amber-500 font-headline tracking-[0.3em] text-xs uppercase">Facturación B2B</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
              Suscripciones <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">& Pagos</span>
            </h1>
            <p className="text-white/40 font-light mt-4 tracking-wide max-w-xl text-sm">
              Control financiero del software. Visualiza la distribución de planes activos y el historial de facturación recurrente de tus clientes.
            </p>
        </motion.div>
      </div>

      {/* Plans Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
              { name: 'Corte Clásico', price: '$40.000/mes', users: 45, color: 'from-white/10 to-transparent', border: 'border-white/10' },
              { name: 'Barber Club', price: '$80.000/mes', users: 62, color: 'from-amber-500/10 to-transparent', border: 'border-amber-500/20' },
              { name: 'Black Label', price: '$150.000/mes', users: 17, color: 'from-amber-900/40 to-transparent', border: 'border-amber-500/50' }
          ].map((plan, i) => (
              <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className={`relative rounded-3xl bg-gradient-to-b ${plan.color} border ${plan.border} p-6 overflow-hidden`}
              >
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="text-sm font-headline tracking-widest text-white/70 uppercase">{plan.name}</h3>
                          <p className="text-2xl font-bold font-headline text-white mt-1">{plan.price}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                          <UsersIcon className="w-4 h-4 text-white/50" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                      <span className="text-lg font-bold text-white">{plan.users}</span>
                      <span className="text-xs font-light text-white/40">Suscripciones Activas</span>
                  </div>
              </motion.div>
          ))}
      </div>

      {/* Billing History */}
      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.8, delay: 0.4 }}
         className="relative rounded-[32px] bg-black border border-white/5 p-8"
      >
          <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-headline text-white tracking-widest uppercase">Historial de Facturación</h3>
              <button className="flex items-center gap-2 text-xs font-headline tracking-widest text-amber-400 hover:text-amber-300 uppercase transition-colors">
                  <DownloadCloud className="w-4 h-4" /> Exportar CSV
              </button>
          </div>

          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="border-b border-white/5">
                          <th className="pb-4 text-xs font-headline tracking-widest text-white/40 uppercase">ID Factura</th>
                          <th className="pb-4 text-xs font-headline tracking-widest text-white/40 uppercase">Cliente (Tenant)</th>
                          <th className="pb-4 text-xs font-headline tracking-widest text-white/40 uppercase">Plan</th>
                          <th className="pb-4 text-xs font-headline tracking-widest text-white/40 uppercase">Fecha</th>
                          <th className="pb-4 text-xs font-headline tracking-widest text-white/40 uppercase">Monto</th>
                          <th className="pb-4 text-xs font-headline tracking-widest text-white/40 uppercase text-right">Estado</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {billingHistory.map((invoice, i) => (
                          <tr key={i} className="group">
                              <td className="py-5">
                                  <span className="text-sm font-medium text-white/70 group-hover:text-amber-400 transition-colors cursor-pointer">
                                      {invoice.id}
                                  </span>
                              </td>
                              <td className="py-5 text-sm font-light text-white">{invoice.tenant}</td>
                              <td className="py-5">
                                  <span className="text-xs font-headline tracking-widest text-white/50 uppercase">{invoice.plan}</span>
                              </td>
                              <td className="py-5 text-sm font-light text-white/40">{invoice.date}</td>
                              <td className="py-5 text-sm font-medium text-white">{invoice.amount}</td>
                              <td className="py-5 text-right">
                                  {invoice.status === 'Paid' ? (
                                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-500 border border-green-500/20">
                                          <CheckCircle2 className="w-3 h-3" /> Pagado
                                      </span>
                                  ) : (
                                      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400 border border-orange-500/20">
                                          Pendiente
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
  );
}

// Temporary icon to avoid importing many
function UsersIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    )
}
