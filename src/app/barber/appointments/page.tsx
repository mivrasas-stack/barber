"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Calendar as CalendarIcon, Clock, Scissors, UserCheck, CheckCircle2, 
  AlertCircle, ChevronLeft, ChevronRight, Plus, Filter, Phone, 
  CalendarDays, User, DollarSign, XCircle, PlayCircle, Sparkles, RefreshCw
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PremiumButton } from '@/components/ui/premium-button';
import { AddAppointmentForm } from '@/components/dashboard/AddAppointmentForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dummyBarbers, dummyServices } from '@/app/clientes/data';
import type { Appointment } from '@/lib/types';
import { format, addDays, subDays, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'APT-101',
    customerName: 'Mateo Fernández',
    customerEmail: 'mateo.f@gmail.com',
    customerPhone: '+57 311 555 4321',
    service: 'Corte y Barba',
    date: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    status: 'Completada',
    barberId: 'BBR001',
    barberName: 'Carlos Mendoza',
    price: 65000,
    duration: 60,
  },
  {
    id: 'APT-102',
    customerName: 'Santiago Vélez',
    customerEmail: 'santiago.v@hotmail.com',
    customerPhone: '+57 320 888 1234',
    service: 'Corte de pelo',
    date: new Date(new Date().setHours(10, 30, 0, 0)).toISOString(),
    status: 'En Proceso',
    barberId: 'BBR001',
    barberName: 'Carlos Mendoza',
    price: 40000,
    duration: 40,
  },
  {
    id: 'APT-103',
    customerName: 'Alejandro Morales',
    customerEmail: 'alejandro.m@yahoo.com',
    customerPhone: '+57 318 999 7788',
    service: 'Fade + Cejas',
    date: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    status: 'Confirmada',
    barberId: 'BBR002',
    barberName: 'Roberto Gómez',
    price: 45000,
    duration: 45,
  },
  {
    id: 'APT-104',
    customerName: 'David Torres',
    customerEmail: 'david.torres@gmail.com',
    customerPhone: '+57 314 222 3344',
    service: 'Afeitado tradicional',
    date: new Date(new Date().setHours(15, 30, 0, 0)).toISOString(),
    status: 'Pendiente',
    barberId: 'BBR001',
    barberName: 'Carlos Mendoza',
    price: 35000,
    duration: 35,
  },
  {
    id: 'APT-105',
    customerName: 'Nicolás Quintana',
    customerEmail: 'nicolas.q@gmail.com',
    customerPhone: '+57 319 777 5566',
    service: 'Corte de pelo + Afeitado',
    date: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(),
    status: 'Confirmada',
    barberId: 'BBR003',
    barberName: 'Miguel Ángel Torres',
    price: 70000,
    duration: 60,
  },
];

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const preselectedBarberId = searchParams.get('barberId');

  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>(preselectedBarberId || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    async function loadTenantAndAppointments() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) return;
        const meData = await meRes.json();
        const tId = meData?.activeTenantId;
        if (!tId) return;
        setTenantId(tId);

        const apptRes = await fetch(`/api/v1/appointments?tenantId=${tId}`);
        if (!apptRes.ok) return;
        const apptData = await apptRes.json();

        if (Array.isArray(apptData?.data) && apptData.data.length > 0) {
          const mapped: Appointment[] = apptData.data.map((item: any) => {
            const apt = item.appointment;
            const primaryService = item.services?.[0]?.serviceNameSnapshot || "Servicio General";
            let statusLabel: Appointment['status'] = 'Confirmada';
            if (apt.status === 'PENDING') statusLabel = 'Pendiente';
            if (apt.status === 'CANCELLED') statusLabel = 'Cancelada';
            if (apt.status === 'COMPLETED') statusLabel = 'Completada';
            if (apt.status === 'IN_PROGRESS') statusLabel = 'En Proceso';

            return {
              id: apt.id,
              customerName: apt.customerNameSnapshot,
              customerEmail: apt.customerEmailSnapshot || 'cliente@barber.dev',
              customerPhone: apt.customerPhoneSnapshot || '300 000 0000',
              service: primaryService,
              date: apt.startsAt,
              status: statusLabel,
              barberId: apt.staffId,
              barberName: 'Barbero',
              price: item.services?.[0]?.priceMinor || 35000,
              duration: item.services?.[0]?.durationMinutes || 30,
            };
          });
          setAppointments(mapped);
        }
      } catch (err) {
        console.error("Error loading appointments:", err);
      }
    }
    loadTenantAndAppointments();
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Week strip calculation
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = -3; i <= 3; i++) {
      days.push(addDays(selectedDate, i));
    }
    return days;
  }, [selectedDate]);

  // Appointments filtered by date, barber and status
  const dailyAppointments = useMemo(() => {
    const selDateStr = format(selectedDate, 'yyyy-MM-dd');
    return appointments.filter(apt => {
      const aptDateStr = format(new Date(apt.date), 'yyyy-MM-dd');
      const matchesDate = aptDateStr === selDateStr;
      const matchesBarber = selectedBarberFilter === 'all' || apt.barberId === selectedBarberFilter;
      const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
      return matchesDate && matchesBarber && matchesStatus;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments, selectedDate, selectedBarberFilter, statusFilter]);

  // Count appointments for any date
  const getAppointmentCountForDate = (date: Date) => {
    const dStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => {
      const matchD = format(new Date(apt.date), 'yyyy-MM-dd') === dStr;
      const matchB = selectedBarberFilter === 'all' || apt.barberId === selectedBarberFilter;
      return matchD && matchB;
    }).length;
  };

  const handleSaveAppointment = async (data: Omit<Appointment, 'id' | 'status'> | Appointment) => {
    if ('id' in data && data.id) {
      setAppointments(prev =>
        prev.map(apt => (apt.id === data.id ? { ...apt, ...data } : apt))
      );
      showNotification('Cita actualizada correctamente.');
    } else {
      const newApt: Appointment = {
        ...data,
        id: `APT-${Date.now().toString().slice(-4)}`,
        status: 'Confirmada',
      };
      setAppointments(prev => [...prev, newApt]);
      showNotification('Nueva cita agregada al calendario exitosamente.');
    }
    setIsFormOpen(false);
    setEditingAppointment(null);
  };

  const handleUpdateStatus = async (id: string, newStatus: Appointment['status']) => {
    setAppointments(prev =>
      prev.map(apt => (apt.id === id ? { ...apt, status: newStatus } : apt))
    );
    showNotification(`Estado de la cita cambiado a: ${newStatus}`);

    if (tenantId && id.includes('-')) {
      // Map frontend status to backend status
      let backendStatus = 'CONFIRMED';
      if (newStatus === 'En Proceso') backendStatus = 'IN_PROGRESS';
      if (newStatus === 'Completada') backendStatus = 'COMPLETED';
      if (newStatus === 'Cancelada') backendStatus = 'CANCELLED';

      try {
        await fetch(`/api/v1/appointments/${id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, status: backendStatus }),
        });
      } catch (err) {
        console.error("Failed to update status on server:", err);
      }
    }
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'Confirmada':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'En Proceso':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse';
      case 'Completada':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'Pendiente':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
      case 'Cancelada':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      default:
        return 'bg-foreground/5 border-border text-foreground/60';
    }
  };

  // Daily statistics
  const dayStats = useMemo(() => {
    const total = dailyAppointments.length;
    const completed = dailyAppointments.filter(a => a.status === 'Completada').length;
    const inProgress = dailyAppointments.filter(a => a.status === 'En Proceso').length;
    const pending = dailyAppointments.filter(a => a.status === 'Pendiente' || a.status === 'Confirmada').length;
    const revenue = dailyAppointments
      .filter(a => a.status !== 'Cancelada')
      .reduce((acc, a) => acc + (a.price || 40000), 0);
    return { total, completed, inProgress, pending, revenue };
  }, [dailyAppointments]);

  return (
    <div className="flex flex-col w-full min-h-screen animate-in fade-in duration-700 relative pb-20">
      {/* Glows de ambiente */}
      <div className="fixed top-0 left-1/4 w-[50vw] h-[50vw] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

      {/* Notificación flotante */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 right-8 z-50 px-6 py-3 rounded-2xl bg-amber-950/90 border border-amber-500/40 text-amber-300 shadow-2xl flex items-center gap-3 backdrop-blur-xl"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-headline tracking-widest uppercase">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-amber-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm">
              Agenda & Reservas Inteligentes
            </p>
          </div>
          <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Calendario de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">Citas</span>
          </h1>
          <p className="text-foreground/40 font-light tracking-wide mt-2 text-sm md:text-base">
            Visualiza y administra las citas asignadas a cada barbero según su disponibilidad.
          </p>
        </div>

        <PremiumButton
          onClick={() => {
            setEditingAppointment(null);
            setIsFormOpen(true);
          }}
          className="relative z-10 flex items-center justify-center gap-2 h-14 px-8"
        >
          <Plus className="w-5 h-5" />
          <span className="tracking-widest text-xs uppercase">Nueva Cita (Walk-in)</span>
        </PremiumButton>
      </div>

      {/* Calendario de Días Interactivos (Tira de Semana) */}
      <div className="rounded-3xl bg-card border border-border p-6 backdrop-blur-2xl shadow-xl mb-8 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-headline tracking-widest uppercase text-foreground">
              {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="rounded-xl border-border text-xs font-headline uppercase tracking-wider"
            >
              Hoy
            </Button>
            <div className="flex items-center gap-1 border border-border rounded-xl p-1 bg-foreground/5">
              <button
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="w-8 h-8 rounded-lg hover:bg-foreground/10 flex items-center justify-center text-foreground/60 transition-colors"
                title="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="w-8 h-8 rounded-lg hover:bg-foreground/10 flex items-center justify-center text-foreground/60 transition-colors"
                title="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Botones de días contiguos */}
        <div className="grid grid-cols-7 gap-2 md:gap-3">
          {weekDays.map((day, idx) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const count = getAppointmentCountForDate(day);

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`py-3.5 px-2 rounded-2xl border transition-all text-center flex flex-col items-center justify-between relative ${
                  isSelected
                    ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-105'
                    : 'bg-foreground/5 border-border hover:border-amber-500/40 text-foreground'
                }`}
              >
                <span className={`text-[10px] uppercase font-headline tracking-wider ${isSelected ? 'text-black/80 font-bold' : 'text-foreground/40'}`}>
                  {format(day, 'EEE', { locale: es })}
                </span>
                <span className={`text-xl md:text-2xl font-headline my-1 ${isSelected ? 'text-black font-extrabold' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </span>
                
                {/* Indicador de citas */}
                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-black/20 text-black font-bold'
                      : count > 0
                      ? 'bg-amber-500/20 text-amber-400 font-medium'
                      : 'text-foreground/20'
                  }`}
                >
                  {count > 0 ? `${count} ${count === 1 ? 'cita' : 'citas'}` : 'Libre'}
                </span>

                {isToday && !isSelected && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de Filtros (Barbero y Estado) + KPIs Rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 relative z-10">
        {/* Filtros */}
        <div className="lg:col-span-2 rounded-3xl bg-card border border-border p-6 backdrop-blur-xl flex flex-col sm:flex-row gap-4 items-center">
          <div className="w-full space-y-1.5">
            <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40">Filtrar por Barbero:</span>
            <Select value={selectedBarberFilter} onValueChange={setSelectedBarberFilter}>
              <SelectTrigger className="bg-foreground/5 border-border rounded-2xl h-12 text-xs font-headline tracking-wider uppercase">
                <SelectValue placeholder="Todos los barberos" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground rounded-2xl">
                <SelectItem value="all">Todos los Barberos ({dummyBarbers.length})</SelectItem>
                {dummyBarbers.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.specialty || 'Master Barber'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full space-y-1.5">
            <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40">Filtrar por Estado:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-foreground/5 border-border rounded-2xl h-12 text-xs font-headline tracking-wider uppercase">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground rounded-2xl">
                <SelectItem value="all">Todas las Reservas</SelectItem>
                <SelectItem value="Pendiente">Pendientes</SelectItem>
                <SelectItem value="Confirmada">Confirmadas</SelectItem>
                <SelectItem value="En Proceso">En Proceso</SelectItem>
                <SelectItem value="Completada">Completadas</SelectItem>
                <SelectItem value="Cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resumen del Día */}
        <div className="lg:col-span-2 rounded-3xl bg-card border border-border p-6 backdrop-blur-xl flex items-center justify-around gap-4">
          <div className="text-center">
            <p className="text-[10px] font-headline tracking-widest uppercase text-foreground/40">Citas Hoy</p>
            <h4 className="text-2xl font-headline text-foreground mt-1">{dayStats.total}</h4>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <p className="text-[10px] font-headline tracking-widest uppercase text-amber-500">Pendientes</p>
            <h4 className="text-2xl font-headline text-amber-400 mt-1">{dayStats.pending}</h4>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <p className="text-[10px] font-headline tracking-widest uppercase text-emerald-400">Facturación Estimada</p>
            <h4 className="text-2xl font-headline text-emerald-400 mt-1 font-mono">
              ${(dayStats.revenue / 1000).toFixed(0)}k
            </h4>
          </div>
        </div>
      </div>

      {/* Lista / Timeline de Citas Asignadas del Día */}
      <div className="space-y-4 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-headline tracking-widest uppercase text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Agenda Detallada ({dailyAppointments.length} asignadas)
          </h3>
          <span className="text-xs text-foreground/40 font-light">
            Horario continuo 08:00 AM - 08:00 PM
          </span>
        </div>

        {dailyAppointments.length === 0 ? (
          <div className="p-12 rounded-[32px] bg-card border border-border text-center flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CalendarDays className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-headline tracking-widest uppercase text-foreground">
                No hay citas programadas para este filtro
              </h4>
              <p className="text-foreground/40 text-xs mt-1 max-w-sm mx-auto">
                No se encontraron reservas con los criterios seleccionados para el día {format(selectedDate, 'dd/MM/yyyy')}.
              </p>
            </div>
            <PremiumButton
              onClick={() => {
                setEditingAppointment(null);
                setIsFormOpen(true);
              }}
              className="mt-2 text-xs uppercase tracking-widest px-6"
            >
              Agendar Cita en este Día
            </PremiumButton>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyAppointments.map((apt, index) => {
              const aptTime = format(new Date(apt.date), 'hh:mm a');
              const assignedBarber = dummyBarbers.find(b => b.id === apt.barberId);

              return (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={apt.id}
                  className="rounded-3xl bg-card border border-border hover:border-amber-500/30 transition-all p-5 md:p-6 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl group"
                >
                  {/* Hora y Cliente */}
                  <div className="flex items-start sm:items-center gap-5">
                    <div className="w-20 text-center py-2 px-3 rounded-2xl bg-foreground/5 border border-border shrink-0">
                      <span className="font-mono text-sm font-bold text-amber-400 block">{aptTime}</span>
                      <span className="text-[10px] text-foreground/40 uppercase tracking-widest">{apt.duration || 45} min</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border border-border shrink-0">
                        <AvatarFallback className="font-headline bg-foreground/10 text-amber-400">
                          {apt.customerName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-headline tracking-widest uppercase text-foreground text-base group-hover:text-amber-200 transition-colors">
                            {apt.customerName}
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-headline tracking-widest uppercase border ${getStatusBadge(apt.status)}`}>
                            {apt.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-foreground/40 mt-1">
                          <span className="text-amber-400 font-medium">{apt.service}</span>
                          {apt.customerPhone && (
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-foreground/30" /> {apt.customerPhone}
                            </span>
                          )}
                          <span className="font-mono text-emerald-400">
                            ${(apt.price || 40000).toLocaleString('es-CO')} COP
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Barbero Asignado y Acciones de Estado */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-border">
                    {/* Tarjeta del Barbero */}
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-foreground/5 border border-border/60">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarImage src={assignedBarber?.avatarUrl} alt={apt.barberName} />
                        <AvatarFallback className="text-[10px]">{apt.barberName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <span className="text-[9px] uppercase tracking-wider text-foreground/40 block">Barbero Asignado</span>
                        <span className="text-xs font-headline tracking-wider text-foreground truncate max-w-[120px] block">
                          {apt.barberName || assignedBarber?.name || 'Carlos Mendoza'}
                        </span>
                      </div>
                    </div>

                    {/* Botones de acción rápida sobre la cita */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {apt.status === 'Pendiente' && (
                        <button
                          onClick={() => handleUpdateStatus(apt.id, 'Confirmada')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-headline uppercase tracking-wider transition-colors"
                        >
                          Confirmar
                        </button>
                      )}

                      {apt.status === 'Confirmada' && (
                        <button
                          onClick={() => handleUpdateStatus(apt.id, 'En Proceso')}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-headline uppercase tracking-wider transition-colors flex items-center gap-1"
                        >
                          <PlayCircle className="w-3.5 h-3.5" /> Iniciar Corte
                        </button>
                      )}

                      {apt.status === 'En Proceso' && (
                        <button
                          onClick={() => handleUpdateStatus(apt.id, 'Completada')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-headline uppercase tracking-wider transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completar & Cobrar
                        </button>
                      )}

                      {apt.status !== 'Cancelada' && apt.status !== 'Completada' && (
                        <button
                          onClick={() => handleUpdateStatus(apt.id, 'Cancelada')}
                          className="px-2.5 py-1.5 rounded-xl bg-foreground/5 hover:bg-rose-500/10 border border-border hover:border-rose-500/30 text-foreground/40 hover:text-rose-400 text-[10px] font-headline uppercase tracking-wider transition-colors"
                          title="Cancelar cita"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingAppointment(apt);
                          setIsFormOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-border text-foreground/60 text-[10px] font-headline uppercase tracking-wider transition-colors"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para Agregar o Editar Cita con disponibilidad por slots */}
      <AddAppointmentForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSaveAppointment={handleSaveAppointment}
        existingAppointment={editingAppointment}
        initialDate={format(selectedDate, 'yyyy-MM-dd')}
        initialBarberId={selectedBarberFilter !== 'all' ? selectedBarberFilter : undefined}
      />
    </div>
  );
}
