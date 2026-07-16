"use client";
import React from 'react';
import { Scissors, Clock, DollarSign, Plus } from 'lucide-react';
import { PremiumButton } from '@/components/ui/premium-button';
import { motion } from 'framer-motion';

export default function ServicesPage() {
  const services = [
    { id: 1, name: "Corte Clásico", duration: "45 min", price: "$150", category: "Cortes" },
    { id: 2, name: "Corte y Barba", duration: "60 min", price: "$250", category: "Paquetes" },
    { id: 3, name: "Fade / Degradado", duration: "45 min", price: "$180", category: "Cortes" },
    { id: 4, name: "Alineación de Barba", duration: "20 min", price: "$100", category: "Barba" },
    { id: 5, name: "Tinte y Corte", duration: "90 min", price: "$400", category: "Color" },
  ];

  return (
    <div className="flex flex-col w-full animate-in fade-in duration-700">
      <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        <div className="absolute top-0 right-1/2 w-48 h-48 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center hidden sm:flex">
            <Scissors className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-headline text-white tracking-widest uppercase">Catálogo de Servicios</h2>
            <p className="text-white/40 font-light tracking-wide mt-2 text-sm">
              Administra los cortes y servicios que ofreces.
            </p>
          </div>
        </div>
        
        <PremiumButton variant="outline" className="relative z-10 w-full sm:w-auto flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Nuevo Servicio</span>
        </PremiumButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 relative z-10">
        {services.map((service, index) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            key={service.id} 
            className="group relative overflow-hidden rounded-[24px] bg-black/40 border border-white/5 hover:border-amber-500/30 transition-all duration-500 p-6 flex flex-col justify-between backdrop-blur-xl hover:bg-black/60 min-h-[160px]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-headline tracking-widest uppercase px-3 py-1 bg-white/5 border border-white/10 rounded-full text-white/60 group-hover:bg-amber-500/10 group-hover:border-amber-500/20 group-hover:text-amber-500 transition-colors">
                  {service.category}
                </span>
                <button className="text-white/20 hover:text-white transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>
              </div>
              
              <h3 className="text-xl font-headline text-white tracking-widest group-hover:text-amber-100 transition-colors">{service.name}</h3>
            </div>
            
            <div className="relative z-10 flex items-center justify-between mt-6 pt-4 border-t border-white/5 group-hover:border-white/10 transition-colors">
              <div className="flex items-center gap-2 text-white/40 group-hover:text-white/60">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-light">{service.duration}</span>
              </div>
              
              <div className="flex items-center gap-1 text-white font-headline tracking-wider text-lg">
                <DollarSign className="w-4 h-4 text-amber-500" />
                {service.price.replace('$', '')}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
