"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Star, History } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const customers = [
    { id: 1, name: "Carlos Mendoza", lastVisit: "Hoy", visits: 12, rating: 5, avatar: "CM" },
    { id: 2, name: "David Torres", lastVisit: "Hace 1 semana", visits: 8, rating: 4.8, avatar: "DT" },
    { id: 3, name: "Miguel Ángel", lastVisit: "Hace 2 semanas", visits: 24, rating: 5, avatar: "MA" },
    { id: 4, name: "Alejandro Ruiz", lastVisit: "Hace 1 mes", visits: 3, rating: 4.5, avatar: "AR" },
    { id: 5, name: "Javier Blanco", lastVisit: "Hace 2 meses", visits: 15, rating: 4.9, avatar: "JB" },
  ];

  const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-white/5 py-6">
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
            <Link href="/barber" className="text-white/60 hover:text-white transition-colors flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-light tracking-widest uppercase hidden sm:block">Volver</span>
            </Link>
            <h1 className="text-xl font-headline tracking-widest text-primary uppercase">Mis Clientes</h1>
            <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-6 md:px-12 py-12 flex-1 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <h2 className="text-3xl font-headline text-white tracking-widest uppercase">Directorio</h2>
            <p className="text-muted-foreground font-light tracking-wide mt-2">Historial de clientes atendidos.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 bg-white/5 border-white/10 text-white rounded-full focus-visible:ring-primary/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((customer) => (
            <div key={customer.id} className="group relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/30 transition-all duration-300 p-6 flex flex-col items-center text-center gap-4">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl pointer-events-none" />
              
              <Avatar className="h-20 w-20 border border-primary/20 ring-4 ring-background shadow-xl">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-headline">{customer.avatar}</AvatarFallback>
              </Avatar>
              
              <div className="relative z-10">
                <h3 className="text-lg font-headline text-white tracking-widest">{customer.name}</h3>
                <div className="flex items-center justify-center gap-1 mt-1 text-primary">
                  <Star className="w-3 h-3 fill-primary" />
                  <span className="text-xs font-medium">{customer.rating}</span>
                </div>
              </div>

              <div className="w-full h-px bg-white/5 my-2" />
              
              <div className="flex w-full justify-between items-center text-xs text-muted-foreground relative z-10">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  <span>{customer.lastVisit}</span>
                </div>
                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest">
                  {customer.visits} Visitas
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
