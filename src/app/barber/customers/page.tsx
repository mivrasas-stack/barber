"use client";
import React, { useState } from 'react';
import { Search, Star, History, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const customers = [
    { id: 1, name: "Carlos Mendoza", lastVisit: "Hoy", visits: 12, rating: 5, avatar: "CM" },
    { id: 2, name: "David Torres", lastVisit: "Hace 1 semana", visits: 8, rating: 4.8, avatar: "DT" },
    { id: 3, name: "Miguel Ángel", lastVisit: "Hace 2 semanas", visits: 24, rating: 5, avatar: "MA" },
    { id: 4, name: "Alejandro Ruiz", lastVisit: "Hace 1 mes", visits: 3, rating: 4.5, avatar: "AR" },
    { id: 5, name: "Javier Blanco", lastVisit: "Hace 2 meses", visits: 15, rating: 4.9, avatar: "JB" },
    { id: 6, name: "Pedro Luis", lastVisit: "Ayer", visits: 6, rating: 4.2, avatar: "PL" },
  ];

  const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col w-full animate-in fade-in duration-700">
      <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center hidden sm:flex">
            <Users className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-headline text-white tracking-widest uppercase">Mis Clientes</h2>
            <p className="text-white/40 font-light tracking-wide mt-2 text-sm">
              Directorio e historial de atenciones.
            </p>
          </div>
        </div>
        
        <div className="relative w-full md:w-72 z-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input 
            placeholder="Buscar cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 bg-black/40 border-white/10 text-white rounded-full focus-visible:ring-amber-500/50 backdrop-blur-md h-12"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 relative z-10">
        {filtered.map((customer, index) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            key={customer.id} 
            className="group relative overflow-hidden rounded-[24px] bg-black/40 border border-white/5 hover:border-amber-500/30 transition-all duration-500 p-6 flex flex-col items-center text-center gap-4 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/0 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Avatar className="relative h-20 w-20 border border-white/10 group-hover:border-amber-500/30 ring-4 ring-black shadow-2xl transition-all duration-500 bg-white/5">
                <AvatarFallback className="bg-transparent text-white/80 text-xl font-headline">{customer.avatar}</AvatarFallback>
              </Avatar>
            </div>
            
            <div className="relative z-10 mt-2">
              <h3 className="text-lg font-headline text-white tracking-widest group-hover:text-amber-100 transition-colors">{customer.name}</h3>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">{customer.rating}</span>
              </div>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />
            
            <div className="flex w-full justify-between items-center text-xs text-white/40 relative z-10 px-2">
              <div className="flex items-center gap-2 group-hover:text-white/60 transition-colors">
                <History className="w-3.5 h-3.5" />
                <span>{customer.lastVisit}</span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest font-medium text-[10px] group-hover:bg-amber-500/10 group-hover:text-amber-400 group-hover:border-amber-500/20 transition-all">
                {customer.visits} Visitas
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {filtered.length === 0 && (
        <div className="w-full py-20 flex flex-col items-center justify-center text-white/30">
          <Search className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-headline tracking-widest uppercase">No se encontraron clientes</p>
        </div>
      )}
    </div>
  );
}
