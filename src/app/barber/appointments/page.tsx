"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PremiumButton } from '@/components/ui/premium-button';

export default function AppointmentsPage() {
  const appointments = [
    { id: 1, time: "10:00 AM", client: "Carlos Mendoza", service: "Corte y Barba", status: "completed", avatar: "CM" },
    { id: 2, time: "11:30 AM", client: "David Torres", service: "Corte Clásico", status: "in-progress", avatar: "DT" },
    { id: 3, time: "01:00 PM", client: "Miguel Ángel", service: "Fade + Cejas", status: "pending", avatar: "MA" },
    { id: 4, time: "03:30 PM", client: "Alejandro Ruiz", service: "Tinte y Corte", status: "pending", avatar: "AR" },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-white/5 py-6">
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link href="/barber" className="text-white/60 hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-light tracking-widest uppercase hidden sm:block">Volver al Portal</span>
                </Link>
            </div>
            <h1 className="text-xl font-headline tracking-widest text-primary uppercase">Mi Agenda</h1>
            <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="container mx-auto px-6 md:px-12 py-12 flex-1 max-w-4xl">
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-headline text-white tracking-widest uppercase">Citas de Hoy</h2>
            <p className="text-muted-foreground font-light tracking-wide mt-2">Tienes 4 citas programadas para hoy.</p>
          </div>
          <PremiumButton variant="outline">
            Nueva Cita (Walk-in)
          </PremiumButton>
        </div>

        <div className="space-y-6">
          {appointments.map((apt) => (
            <div key={apt.id} className="group relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/30 transition-all duration-300 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl pointer-events-none" />

              <div className="flex items-center gap-6 relative z-10">
                <div className="flex flex-col items-center justify-center w-24 border-r border-white/10 pr-6">
                  <Clock className="w-5 h-5 text-primary mb-1" />
                  <span className="text-sm font-headline tracking-widest text-white whitespace-nowrap">{apt.time}</span>
                </div>

                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary">{apt.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-headline text-white tracking-widest">{apt.client}</h3>
                    <p className="text-sm text-muted-foreground font-light">{apt.service}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto relative z-10 pl-24 sm:pl-0">
                {apt.status === 'completed' && (
                  <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-4 py-2 rounded-full text-xs uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4" /> Finalizado
                  </div>
                )}
                {apt.status === 'in-progress' && (
                  <PremiumButton size="sm" className="w-full sm:w-auto">
                    Completar
                  </PremiumButton>
                )}
                {apt.status === 'pending' && (
                  <Button variant="outline" size="sm" className="w-full sm:w-auto border-white/10 hover:bg-white/5 hover:text-white">
                    Iniciar
                  </Button>
                )}
                <button className="text-white/40 hover:text-white p-2">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
