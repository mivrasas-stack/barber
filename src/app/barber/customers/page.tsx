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
    <div className="flex flex-col w-full min-h-screen animate-in fade-in duration-700 relative pb-20">
      <div className="fixed top-0 left-0 w-[50vw] h-[50vw] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none -translate-y-1/2 mix-blend-screen" />
      
      <div className="mb-10 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-[#0F0F0F] border border-white/5 flex items-center justify-center hidden sm:flex shadow-2xl">
            <Users className="w-8 h-8 text-white/80" />
          </div>
          <div>
            <p className="text-blue-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm mb-2">Directorio VIP</p>
            <h2 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">Mis <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">Clientes</span></h2>
          </div>
        </div>
        
        <div className="relative w-full md:w-80 z-10 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-blue-500 transition-colors" />
          <Input 
            placeholder="Buscar por nombre o ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-14 bg-[#0F0F0F]/80 border-white/5 text-white rounded-3xl focus-visible:ring-blue-500/30 focus-visible:border-blue-500/50 backdrop-blur-md h-14 font-light tracking-wide shadow-inner"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
        {filtered.map((customer, index) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
            key={customer.id} 
            className={`group relative overflow-hidden rounded-[32px] bg-[#0F0F0F] border border-white/5 hover:border-blue-500/30 transition-all duration-500 p-8 flex flex-col justify-between shadow-2xl hover:bg-[#151515] ${index % 5 === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="flex flex-col gap-6 relative z-10 h-full">
              <div className="flex justify-between items-start">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Avatar className="relative h-16 w-16 border border-white/10 group-hover:border-blue-500/30 ring-4 ring-black/50 shadow-2xl transition-all duration-500 bg-[#1A1A1A]">
                    <AvatarFallback className="bg-transparent text-white/80 text-lg font-headline">{customer.avatar}</AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1A1A] border border-white/5">
                    <Star className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
                    <span className="text-xs font-medium text-white/80">{customer.rating}</span>
                  </div>
                  <span className="text-[10px] text-white/30 uppercase tracking-widest font-headline px-2">LTV: Alto</span>
                </div>
              </div>
              
              <div className="mt-auto">
                <h3 className={`font-headline text-white tracking-widest group-hover:text-blue-100 transition-colors ${index % 5 === 0 ? 'text-3xl mb-2' : 'text-xl'}`}>{customer.name}</h3>
                
                <div className="w-full h-px bg-gradient-to-r from-white/10 to-transparent my-4" />
                
                <div className="flex w-full justify-between items-center text-xs text-white/40">
                  <div className="flex items-center gap-2 group-hover:text-white/60 transition-colors">
                    <History className="w-3.5 h-3.5" />
                    <span className="font-light">{customer.lastVisit}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5 uppercase tracking-[0.2em] font-medium text-[9px] group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all">
                    {customer.visits} Visitas
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {filtered.length === 0 && (
        <div className="w-full py-32 flex flex-col items-center justify-center text-white/20 bg-[#0F0F0F] rounded-[40px] border border-white/5 mt-8">
          <Search className="w-16 h-16 mb-6 opacity-30" />
          <p className="font-headline tracking-[0.2em] text-lg uppercase">No se encontraron clientes</p>
        </div>
      )}
    </div>
  );
}
