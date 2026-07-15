"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Search, Filter, MoreHorizontal, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';

const tenantsData = [
  { id: 1, name: 'The Royal Barber', owner: 'Carlos Torres', location: 'Bogotá, Colombia', plan: 'Black Label', status: 'Active', date: '10/07/2026' },
  { id: 2, name: 'Gentleman\'s Lounge', owner: 'Luis Mendoza', location: 'Medellín, Colombia', plan: 'Barber Club', status: 'Active', date: '05/07/2026' },
  { id: 3, name: 'Classic Cuts Club', owner: 'Andrés Felipe', location: 'Cartagena, Colombia', plan: 'Corte Clásico', status: 'Suspended', date: '28/06/2026' },
  { id: 4, name: 'Urban Style Barbería', owner: 'Jorge Silva', location: 'Cali, Colombia', plan: 'Black Label', status: 'Active', date: '12/07/2026' },
];

export default function TenantsPage() {
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
               <span className="text-amber-500 font-headline tracking-[0.3em] text-xs uppercase">Gestión de Inquilinos</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
              Franquicias <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">(Tenants)</span>
            </h1>
            <p className="text-white/40 font-light mt-4 tracking-wide max-w-xl text-sm">
              Administración global de todas las barberías que utilizan la plataforma. Visualiza estados, planes y suspende accesos si es necesario.
            </p>
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
                      placeholder="Buscar por nombre, dueño o ciudad..." 
                      className="w-full bg-white/5 border-white/10 text-white pl-12 h-12 rounded-xl focus:border-amber-500/50 focus:ring-amber-500/20"
                  />
              </div>
              <button className="flex items-center gap-2 px-6 h-12 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors w-full sm:w-auto justify-center">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-light tracking-widest uppercase">Filtros</span>
              </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01]">
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Barbería</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Propietario / Ubicación</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Plan Actual</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Estado</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {tenantsData.map((tenant) => (
                          <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center">
                                          <Building2 className={`w-4 h-4 ${tenant.status === 'Active' ? 'text-amber-400' : 'text-white/30'}`} />
                                      </div>
                                      <div>
                                          <p className="font-headline tracking-wide text-white group-hover:text-amber-300 transition-colors">{tenant.name}</p>
                                          <p className="text-[10px] font-light text-white/30 mt-1">Suscrito: {tenant.date}</p>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-8 py-6">
                                  <p className="text-sm font-medium text-white/80">{tenant.owner}</p>
                                  <p className="text-xs font-light text-white/40 mt-1">{tenant.location}</p>
                              </td>
                              <td className="px-8 py-6">
                                  <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-[10px] font-headline tracking-widest text-white/70 uppercase border border-white/10">
                                      {tenant.plan}
                                  </span>
                              </td>
                              <td className="px-8 py-6">
                                  {tenant.status === 'Active' ? (
                                      <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                                          <span className="text-[10px] font-medium text-green-500 uppercase tracking-widest">Activo</span>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]" />
                                          <span className="text-[10px] font-medium text-amber-500 uppercase tracking-widest">Suspendido</span>
                                      </div>
                                  )}
                              </td>
                              <td className="px-8 py-6 text-right">
                                  <button className="text-white/40 hover:text-white transition-colors p-2">
                                      <MoreHorizontal className="w-5 h-5" />
                                  </button>
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
