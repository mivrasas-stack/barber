"use client";
import React, { useState } from 'react';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, Scissors, PlusCircle, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AddAppointmentForm } from '@/components/dashboard/AddAppointmentForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Datos de las barberías y sus barberos
const barberias = [
  {
    id: "barberia_1",
    name: "The Gentleman's Lounge",
    barbers: [
      { id: "carlos", name: "Carlos (Maestro Barbero)" },
      { id: "miguel", name: "Miguel (Especialista en Barbas)" }
    ]
  },
  {
    id: "barberia_2",
    name: "Classic Cuts Barber",
    barbers: [
      { id: "andres", name: "Andrés (Cortes Clásicos)" },
      { id: "luis", name: "Luis (Fade y Diseños)" }
    ]
  }
];

// Datos estáticos simulados para el cliente actual (ej. JOHN DOE)
const misCitas = [
  {
    id: 'APP1',
    date: '2023-10-28',
    time: '10:00',
    service: 'Corte de pelo + Afeitado',
    barberId: 'B1',
    barberName: 'Carlos',
    barberImage: 'https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=150&h=150&fit=crop',
    status: 'Confirmada',
    price: 35000
  },
  {
    id: 'APP2',
    date: '2023-09-15',
    time: '14:30',
    service: 'Corte de pelo',
    barberId: 'B2',
    barberName: 'Miguel',
    barberImage: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop',
    status: 'Completada',
    price: 20000
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function MyAppointmentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBarberia, setSelectedBarberia] = useState("");

  const handleOpenForm = () => {
    setIsFormOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmada': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Pendiente': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Completada': return 'text-foreground/60 bg-foreground/5 border-border';
      case 'Cancelada': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-foreground/60 bg-foreground/5 border-border';
    }
  };

  return (
    <div className="space-y-8 min-h-screen text-foreground/90">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-headline tracking-widest uppercase text-foreground mb-2">Mis <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">Reservas</span></h1>
          <p className="text-foreground/40 text-sm font-light tracking-wide">Tu historial de servicios y próximas citas.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" className="gap-2 bg-[#E1A03F] hover:bg-[#c98e37] text-black font-semibold h-11 px-6 rounded-full transition-all" onClick={handleOpenForm}>
            <PlusCircle className="h-5 w-5 text-black" strokeWidth={2.5} />
            <span className="text-sm tracking-wide">Agendar Nueva Cita</span>
          </Button>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {misCitas.map((cita) => (
          <motion.div 
            key={cita.id} 
            variants={itemVariants}
            className="group relative flex flex-col p-6 rounded-[2rem] bg-gradient-to-b from-foreground/[0.04] to-transparent border border-border hover:border-amber-500/30 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)] overflow-hidden"
          >
            {/* Cita Status */}
            <div className="flex justify-between items-start mb-6 relative z-10">
              <span className={`px-3 py-1 text-[10px] font-headline tracking-widest uppercase rounded-full border ${getStatusColor(cita.status)}`}>
                {cita.status}
              </span>
              
              {cita.status === 'Pendiente' || cita.status === 'Confirmada' ? (
                <button className="text-foreground/30 hover:text-rose-400 transition-colors text-xs font-headline tracking-widest uppercase">
                  Cancelar
                </button>
              ) : null}
            </div>

            {/* Servicio */}
            <div className="mb-8 relative z-10">
              <h3 className="text-xl font-headline tracking-wider text-foreground group-hover:text-amber-100 transition-colors uppercase">{cita.service}</h3>
            </div>

            {/* Detalles (Fecha, Hora) */}
            <div className="flex flex-col gap-3 mb-8 relative z-10">
              <div className="flex items-center gap-3 text-foreground/50 text-sm tracking-wide">
                <CalendarIcon className="w-4 h-4 text-amber-500/50" />
                <span>{format(new Date(cita.date), "dd MMM, yyyy", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-3 text-foreground/50 text-sm tracking-wide">
                <Clock className="w-4 h-4 text-amber-500/50" />
                <span>{cita.time}</span>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-border flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border group-hover:border-amber-500/30 transition-colors">
                  <AvatarImage src={cita.barberImage} />
                  <AvatarFallback className="bg-black/50 text-foreground/50 text-xs font-headline">{cita.barberName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[10px] font-headline tracking-[0.2em] text-foreground/30 uppercase mb-0.5">Barbero</p>
                  <p className="text-sm font-medium text-foreground/80">{cita.barberName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-headline tracking-[0.2em] text-foreground/30 uppercase mb-0.5">Total</p>
                <p className="text-lg font-bold text-amber-500 font-sans tracking-wide">
                  ${cita.price.toLocaleString('es-CO')} COP
                </p>
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </motion.div>
        ))}
      </motion.div>

      {/* Modal Agregar Cita */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-background border border-border rounded-[2rem] shadow-2xl overflow-hidden z-10"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-foreground/5">
                <h2 className="text-xl font-headline tracking-widest uppercase text-foreground">Agendar Nueva Cita</h2>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-foreground/10 text-foreground/50 hover:text-foreground transition-colors" onClick={() => setIsFormOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-8 space-y-6">
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-headline tracking-widest text-foreground/50">Servicio</label>
                    <Select>
                      <SelectTrigger className="w-full h-12 bg-foreground/5 border border-border rounded-xl px-4 text-foreground/90 text-sm focus:ring-1 focus:ring-amber-500/50 transition-colors">
                        <SelectValue placeholder="Selecciona un servicio..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-border text-foreground rounded-xl">
                        <SelectItem value="corte" className="focus:bg-foreground/10 focus:text-foreground rounded-lg cursor-pointer">Corte Premium</SelectItem>
                        <SelectItem value="barba" className="focus:bg-foreground/10 focus:text-foreground rounded-lg cursor-pointer">Diseño de Barba</SelectItem>
                        <SelectItem value="completo" className="focus:bg-foreground/10 focus:text-foreground rounded-lg cursor-pointer">Corte + Barba</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-headline tracking-widest text-foreground/50">Barbería</label>
                    <Select value={selectedBarberia} onValueChange={(val) => setSelectedBarberia(val)}>
                      <SelectTrigger className="w-full h-12 bg-foreground/5 border border-border rounded-xl px-4 text-foreground/90 text-sm focus:ring-1 focus:ring-amber-500/50 transition-colors">
                        <SelectValue placeholder="Selecciona una barbería..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-border text-foreground rounded-xl">
                        {barberias.map(sede => (
                          <SelectItem key={sede.id} value={sede.id} className="focus:bg-foreground/10 focus:text-foreground rounded-lg cursor-pointer">
                            {sede.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-headline tracking-widest text-foreground/50">Barbero (Opcional)</label>
                    <Select disabled={!selectedBarberia}>
                      <SelectTrigger className="w-full h-12 bg-foreground/5 border border-border rounded-xl px-4 text-foreground/90 text-sm focus:ring-1 focus:ring-amber-500/50 transition-colors disabled:opacity-50">
                        <SelectValue placeholder={selectedBarberia ? "Cualquier Barbero" : "Primero selecciona una barbería"} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-border text-foreground rounded-xl">
                        <SelectItem value="cualquier" className="focus:bg-foreground/10 focus:text-foreground rounded-lg cursor-pointer">Cualquier Barbero</SelectItem>
                        {selectedBarberia && barberias.find(b => b.id === selectedBarberia)?.barbers.map(barber => (
                          <SelectItem key={barber.id} value={barber.id} className="focus:bg-foreground/10 focus:text-foreground rounded-lg cursor-pointer">
                            {barber.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-headline tracking-widest text-foreground/50">Fecha</label>
                      <input type="date" className="w-full h-12 bg-foreground/5 border border-border rounded-xl px-4 text-foreground/90 text-sm focus:outline-none focus:border-amber-500/50 transition-colors [color-scheme:dark]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-headline tracking-widest text-foreground/50">Hora</label>
                      <input type="time" className="w-full h-12 bg-foreground/5 border border-border rounded-xl px-4 text-foreground/90 text-sm focus:outline-none focus:border-amber-500/50 transition-colors [color-scheme:dark]" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-full px-6">
                    Cancelar
                  </Button>
                  <Button onClick={() => setIsFormOpen(false)} className="bg-[#DFA343] hover:bg-[#c99036] text-black font-semibold rounded-full px-8 shadow-[0_4px_20px_rgba(223,163,67,0.3)] transition-all">
                    Confirmar Reserva
                  </Button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
