"use client";
import React, { useState } from 'react';
import { Clock, CheckCircle2, MoreHorizontal, CalendarPlus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PremiumButton } from '@/components/ui/premium-button';
import { AddAppointmentForm } from '@/components/dashboard/AddAppointmentForm';
import type { Appointment } from '@/lib/types';
import { motion } from 'framer-motion';

type LocalAppointment = {
  id: number;
  time: string;
  client: string;
  service: string;
  status: 'completed' | 'in-progress' | 'pending';
  avatar: string;
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<LocalAppointment[]>([
    { id: 1, time: "10:00 AM", client: "Carlos Mendoza", service: "Corte y Barba", status: "completed", avatar: "CM" },
    { id: 2, time: "11:30 AM", client: "David Torres", service: "Corte Clásico", status: "in-progress", avatar: "DT" },
    { id: 3, time: "01:00 PM", client: "Miguel Ángel", service: "Fade + Cejas", status: "pending", avatar: "MA" },
    { id: 4, time: "03:30 PM", client: "Alejandro Ruiz", service: "Tinte y Corte", status: "pending", avatar: "AR" },
  ]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  function handleSaveAppointment(data: Omit<Appointment, 'id' | 'status'> | Appointment) {
    if ('id' in data && data.id) {
      // Edición: no hacemos nada con la lista local por ahora
    } else {
      // Nueva cita walk-in: agregar a la lista local
      const date = new Date(data.date);
      const hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 === 0 ? 12 : hours % 12;
      const timeStr = `${displayHour}:${minutes} ${ampm}`;

      const newApt: LocalAppointment = {
        id: Date.now(),
        time: timeStr,
        client: data.customerName,
        service: data.service,
        status: 'pending',
        avatar: data.customerName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
      };
      setAppointments((prev) => [...prev, newApt]);
    }
    setIsFormOpen(false);
    setEditingAppointment(null);
  }

  function updateStatus(id: number, newStatus: LocalAppointment['status']) {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status: newStatus } : apt))
    );
  }

  const pendingCount = appointments.filter((a) => a.status === 'pending' || a.status === 'in-progress').length;

  return (
    <div className="flex flex-col w-full min-h-screen animate-in fade-in duration-700 relative pb-20">
      
      {/* Elementos Ambientales (Glows) */}
      <div className="fixed top-0 left-1/4 w-[50vw] h-[50vw] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 mix-blend-screen" />

      {/* Header */}
      <div className="mb-10 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <p className="text-amber-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm mb-2">Agenda de Hoy</p>
          <h2 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
            Tus <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">Citas</span>
          </h2>
          <p className="text-white/40 font-light tracking-wide mt-3 text-sm md:text-base">
            Tienes <span className="text-amber-500 font-medium">{appointments.length} citas</span> hoy — <span className="text-amber-400/70">{pendingCount} pendientes</span>.
          </p>
        </div>

        <PremiumButton
          className="relative z-10 flex items-center justify-center gap-2"
          onClick={() => {
            setEditingAppointment(null);
            setIsFormOpen(true);
          }}
        >
          <CalendarPlus className="w-4 h-4" />
          <span className="tracking-widest text-[10px] sm:text-xs uppercase">Nueva Cita (Walk-in)</span>
        </PremiumButton>
      </div>

      {/* Timeline Layout */}
      <div className="relative z-10 pl-6 sm:pl-10 md:pl-16">
        
        {/* Línea vertical central */}
        <div className="absolute top-0 bottom-0 left-[23px] sm:left-[39px] md:left-[63px] w-px bg-gradient-to-b from-amber-500/50 via-white/10 to-transparent" />

        <div className="space-y-8 md:space-y-12">
          {appointments.map((apt, index) => (
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15, type: "spring", stiffness: 100 }}
              key={apt.id}
              className="relative group"
            >
              
              {/* Timeline Dot */}
              <div className="absolute -left-6 sm:-left-10 md:-left-16 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#0A0A0A] border-2 border-white/20 group-hover:border-amber-500 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all duration-300 z-10">
                {apt.status === 'in-progress' && <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-50" />}
                {apt.status === 'in-progress' && <div className="absolute inset-[3px] bg-amber-500 rounded-full" />}
                {apt.status === 'completed' && <div className="absolute inset-[3px] bg-green-500 rounded-full" />}
              </div>

              {/* Timeline Card */}
              <div className="relative overflow-hidden rounded-3xl bg-[#0F0F0F] border border-white/5 group-hover:border-amber-500/30 transition-all duration-500 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 group-hover:bg-[#151515] shadow-2xl">
                
                {/* Reflejo Glass */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10 w-full md:w-auto">
                  
                  {/* Hora */}
                  <div className="flex flex-row md:flex-col items-center justify-between md:justify-center w-full md:w-28 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 pr-0 md:pr-6">
                    <span className={`text-xl md:text-2xl font-headline tracking-widest ${apt.status === 'completed' ? 'text-white/40' : apt.status === 'in-progress' ? 'text-amber-500' : 'text-white'} whitespace-nowrap`}>
                      {apt.time.split(' ')[0]}
                    </span>
                    <span className="text-[10px] md:text-xs tracking-[0.2em] text-white/40 font-light mt-1">
                      {apt.time.split(' ')[1]}
                    </span>
                  </div>

                  {/* Info Cliente */}
                  <div className="flex items-center gap-5">
                    <Avatar className="h-14 w-14 border border-white/10 group-hover:border-amber-500/30 transition-colors bg-black/50 shadow-inner">
                      <AvatarFallback className="bg-transparent text-white/80 font-headline text-lg">
                        {apt.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg md:text-xl font-headline text-white tracking-widest group-hover:text-amber-100 transition-colors">
                        {apt.client}
                      </h3>
                      <p className="text-sm text-amber-500/70 font-light tracking-wide mt-1">{apt.service}</p>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto relative z-10 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                  {apt.status === 'completed' && (
                    <div className="flex items-center gap-2 text-green-400/80 bg-green-500/10 px-5 py-2 rounded-full text-[10px] md:text-xs font-headline uppercase tracking-widest border border-green-500/20">
                      <CheckCircle2 className="w-4 h-4" /> Finalizado
                    </div>
                  )}
                  {apt.status === 'in-progress' && (
                    <PremiumButton
                      size="sm"
                      className="w-full md:w-auto text-[10px] tracking-widest"
                      onClick={() => updateStatus(apt.id, 'completed')}
                    >
                      Completar
                    </PremiumButton>
                  )}
                  {apt.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full md:w-auto border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-white/70 text-[10px] tracking-widest uppercase transition-all rounded-full h-10 px-6"
                      onClick={() => updateStatus(apt.id, 'in-progress')}
                    >
                      Iniciar
                    </Button>
                  )}
                  <button className="text-white/30 hover:text-amber-500 p-2 rounded-full hover:bg-amber-500/10 transition-colors shrink-0">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {appointments.length === 0 && (
            <div className="text-center py-20 bg-[#0F0F0F] rounded-3xl border border-white/5">
              <Clock className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 font-light tracking-wide text-sm">No hay citas programadas para hoy.</p>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Form Dialog */}
      <AddAppointmentForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSaveAppointment={handleSaveAppointment}
        existingAppointment={editingAppointment}
      />
    </div>
  );
}
