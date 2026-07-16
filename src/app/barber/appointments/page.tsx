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
    <div className="flex flex-col w-full animate-in fade-in duration-700">
      {/* Header */}
      <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-headline text-white tracking-widest uppercase">Mi Agenda</h2>
          <p className="text-white/40 font-light tracking-wide mt-2 text-sm">
            Tienes{' '}
            <span className="text-amber-500 font-medium">{appointments.length} citas</span> programadas hoy —{' '}
            <span className="text-amber-400/70">{pendingCount} pendientes</span>.
          </p>
        </div>

        <PremiumButton
          variant="outline"
          className="relative z-10 hidden sm:flex items-center gap-2"
          onClick={() => {
            setEditingAppointment(null);
            setIsFormOpen(true);
          }}
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Nueva Cita (Walk-in)</span>
        </PremiumButton>
      </div>

      {/* Appointment List */}
      <div className="space-y-4 relative z-10">
        {appointments.map((apt, index) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            key={apt.id}
            className="group relative overflow-hidden rounded-[20px] bg-black/40 border border-white/5 hover:bg-black/60 hover:border-amber-500/30 transition-all duration-500 p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex items-center gap-5 md:gap-8 relative z-10 w-full sm:w-auto">
              <div className="flex flex-col items-center justify-center min-w-[80px] border-r border-white/10 pr-5 md:pr-8">
                <Clock
                  className={`w-5 h-5 mb-1 ${
                    apt.status === 'completed'
                      ? 'text-green-500'
                      : apt.status === 'in-progress'
                      ? 'text-amber-500'
                      : 'text-white/40'
                  }`}
                />
                <span className="text-sm md:text-base font-headline tracking-widest text-white whitespace-nowrap">
                  {apt.time}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border border-white/10 group-hover:border-amber-500/30 transition-colors bg-white/5">
                  <AvatarFallback className="bg-transparent text-white/80 font-headline">
                    {apt.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-base md:text-lg font-headline text-white tracking-widest group-hover:text-amber-100 transition-colors">
                    {apt.client}
                  </h3>
                  <p className="text-xs md:text-sm text-white/40 font-light tracking-wide">{apt.service}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto relative z-10 pl-[100px] sm:pl-0">
              {apt.status === 'completed' && (
                <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-4 py-2 rounded-full text-[10px] md:text-xs font-headline uppercase tracking-widest border border-green-500/20">
                  <CheckCircle2 className="w-4 h-4" /> Finalizado
                </div>
              )}
              {apt.status === 'in-progress' && (
                <PremiumButton
                  size="sm"
                  className="w-full sm:w-auto text-xs"
                  onClick={() => updateStatus(apt.id, 'completed')}
                >
                  Completar
                </PremiumButton>
              )}
              {apt.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto border-white/10 hover:bg-white/10 hover:text-white text-white/60 text-xs tracking-widest uppercase"
                  onClick={() => updateStatus(apt.id, 'in-progress')}
                >
                  Iniciar
                </Button>
              )}
              <button className="text-white/40 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors shrink-0">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}

        {appointments.length === 0 && (
          <div className="text-center py-16 text-white/30 font-light tracking-wide">
            No hay citas programadas. Agrega una nueva cita walk-in.
          </div>
        )}
      </div>

      {/* Mobile only button */}
      <PremiumButton
        variant="outline"
        className="w-full mt-6 sm:hidden flex items-center justify-center gap-2"
        onClick={() => {
          setEditingAppointment(null);
          setIsFormOpen(true);
        }}
      >
        <CalendarPlus className="w-4 h-4" />
        <span>Nueva Cita</span>
      </PremiumButton>

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
