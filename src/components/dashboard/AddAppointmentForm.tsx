"use client";
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PremiumButton } from '@/components/ui/premium-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar as CalendarIcon, Clock, CheckCircle2, Scissors, UserCheck, AlertCircle, DollarSign } from 'lucide-react';
import type { Appointment } from '@/lib/types';
import { dummyServices, dummyBarbers, dummyAppointments } from '@/app/clientes/data';

const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM"
];

const formSchema = z.object({
  customerName: z.string().min(2, 'El nombre del cliente es requerido'),
  customerEmail: z.string().email('Debe ser un correo electrónico válido'),
  customerPhone: z.string().min(7, 'Número de contacto requerido'),
  service: z.string().min(1, 'El servicio es requerido'),
  barberId: z.string().min(1, 'Debes seleccionar un barbero'),
  date: z.string().min(1, 'La fecha es requerida'),
  timeSlot: z.string().min(1, 'Debes seleccionar un horario disponible'),
});

interface AddAppointmentFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveAppointment: (appointment: Omit<Appointment, 'id' | 'status'> | Appointment) => void;
  existingAppointment: Appointment | null;
  initialBarberId?: string;
  initialDate?: string;
}

export function AddAppointmentForm({
  isOpen,
  onOpenChange,
  onSaveAppointment,
  existingAppointment,
  initialBarberId,
  initialDate
}: AddAppointmentFormProps) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [selectedBarberId, setSelectedBarberId] = useState<string>(initialBarberId || dummyBarbers[0]?.id || 'BBR001');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      service: dummyServices[0]?.name || '',
      barberId: initialBarberId || dummyBarbers[0]?.id || 'BBR001',
      date: initialDate || todayStr,
      timeSlot: '',
    },
  });

  // Keep internal states in sync with props
  useEffect(() => {
    if (existingAppointment) {
      const aptDate = new Date(existingAppointment.date);
      const datePart = format(aptDate, 'yyyy-MM-dd');
      const timePart = format(aptDate, 'hh:mm a');

      setSelectedDate(datePart);
      setSelectedBarberId(existingAppointment.barberId);

      form.reset({
        customerName: existingAppointment.customerName,
        customerEmail: existingAppointment.customerEmail,
        customerPhone: existingAppointment.customerPhone || '300 000 0000',
        service: existingAppointment.service,
        barberId: existingAppointment.barberId,
        date: datePart,
        timeSlot: timePart,
      });
    } else {
      const defDate = initialDate || todayStr;
      const defBarber = initialBarberId || dummyBarbers[0]?.id || 'BBR001';
      setSelectedDate(defDate);
      setSelectedBarberId(defBarber);
      form.reset({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        service: dummyServices[0]?.name || '',
        barberId: defBarber,
        date: defDate,
        timeSlot: '',
      });
    }
  }, [existingAppointment, isOpen, initialBarberId, initialDate]);

  // Calculate occupied slots for the selected date and barber
  const occupiedSlots = React.useMemo(() => {
    // Simulate occupied slots or read from dummyAppointments
    const occupied = new Set<string>();
    dummyAppointments.forEach(apt => {
      if (apt.barberId === selectedBarberId && apt.date.startsWith(selectedDate)) {
        // e.g. "2023-10-28 10:00"
        const time = apt.date.split(' ')[1];
        if (time) {
          const hour = parseInt(time.split(':')[0], 10);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 === 0 ? 12 : hour % 12;
          occupied.add(`${String(displayHour).padStart(2, '0')}:00 ${ampm}`);
        }
      }
    });

    // If today is chosen, mark past slots as occupied
    const now = new Date();
    if (selectedDate === todayStr) {
      TIME_SLOTS.forEach(slot => {
        const [timePart, meridiem] = slot.split(' ');
        let [h] = timePart.split(':').map(Number);
        if (meridiem === 'PM' && h !== 12) h += 12;
        if (meridiem === 'AM' && h === 12) h = 0;
        if (h <= now.getHours()) {
          occupied.add(slot);
        }
      });
    }

    return occupied;
  }, [selectedBarberId, selectedDate, todayStr]);

  const selectedServiceObj = dummyServices.find(s => s.name === form.watch('service'));
  const selectedBarberObj = dummyBarbers.find(b => b.id === selectedBarberId);

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Convert date + slot to ISO Date string
    const [timeStr, ampm] = values.timeSlot.split(' ');
    let [hours, minutes] = timeStr.split(':').map(Number);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const fullDate = new Date(`${values.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

    const chosenService = dummyServices.find(s => s.name === values.service);
    const chosenBarber = dummyBarbers.find(b => b.id === values.barberId);

    const appointmentPayload = {
      customerName: values.customerName,
      customerEmail: values.customerEmail,
      customerPhone: values.customerPhone,
      service: values.service,
      date: fullDate.toISOString(),
      barberId: values.barberId,
      barberName: chosenBarber?.name || 'Carlos Mendoza',
      price: chosenService?.price || 45000,
      duration: chosenService?.duration || 45,
    };

    if (existingAppointment) {
      onSaveAppointment({
        ...existingAppointment,
        ...appointmentPayload,
      });
    } else {
      onSaveAppointment(appointmentPayload);
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <p className="text-[10px] font-headline tracking-[0.2em] uppercase text-amber-500">
              Sistema de Disponibilidad en Tiempo Real
            </p>
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-headline tracking-widest uppercase text-foreground">
            {existingAppointment ? 'Modificar Reserva' : 'Agendar Nueva Cita'}
          </DialogTitle>
          <DialogDescription className="text-xs text-foreground/50 tracking-wide font-light">
            Selecciona tu servicio, barbero y elige un horario disponible en el calendario.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Paso 1: Selección de Servicio */}
            <div className="space-y-2">
              <FormLabel className="text-[10px] font-headline tracking-widest uppercase text-foreground/60 flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5 text-amber-500" />
                1. Selecciona el Servicio
              </FormLabel>
              <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-foreground/5 border-border rounded-2xl h-14 text-sm focus:ring-amber-500/50">
                          <SelectValue placeholder="Elige un servicio..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border text-foreground rounded-2xl">
                        {dummyServices.map(service => (
                          <SelectItem key={service.id} value={service.name} className="py-2.5">
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="font-medium">{service.name}</span>
                              <span className="text-amber-500 font-mono text-xs">
                                ${service.price.toLocaleString('es-CO')} COP • {service.duration} min
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Paso 2: Selección de Barbero */}
            <div className="space-y-2">
              <FormLabel className="text-[10px] font-headline tracking-widest uppercase text-foreground/60 flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                2. Selecciona tu Barbero
              </FormLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {dummyBarbers.map(barber => {
                  const isSelected = selectedBarberId === barber.id;
                  return (
                    <div
                      key={barber.id}
                      onClick={() => {
                        setSelectedBarberId(barber.id);
                        form.setValue('barberId', barber.id);
                        form.setValue('timeSlot', ''); // Reset slot when barber changes
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-foreground/5 border-border hover:border-foreground/20'
                      }`}
                    >
                      <Avatar className="h-10 w-10 border border-border shrink-0">
                        <AvatarImage src={barber.avatarUrl} alt={barber.name} className="object-cover" />
                        <AvatarFallback className="text-xs font-headline">{barber.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className={`text-xs font-headline tracking-wider uppercase truncate ${isSelected ? 'text-amber-300' : 'text-foreground'}`}>
                          {barber.name}
                        </p>
                        <p className="text-[10px] text-foreground/40 truncate">
                          {barber.specialty || 'Master Barber'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Paso 3: Selector de Fecha y Disponibilidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel className="text-[10px] font-headline tracking-widest uppercase text-foreground/60 flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                  3. Selecciona la Fecha
                </FormLabel>
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="date"
                          min={todayStr}
                          value={selectedDate}
                          onChange={e => {
                            setSelectedDate(e.target.value);
                            field.onChange(e.target.value);
                            form.setValue('timeSlot', ''); // Reset slot
                          }}
                          className="bg-foreground/5 border-border rounded-2xl h-12 text-sm focus-visible:ring-amber-500/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2 flex flex-col justify-end">
                <div className="p-3 rounded-2xl bg-foreground/5 border border-border flex items-center justify-between text-xs">
                  <span className="text-foreground/50">Disponibilidad de:</span>
                  <span className="text-amber-400 font-headline uppercase tracking-wider">
                    {selectedBarberObj?.name.split(' ')[0]}
                  </span>
                </div>
              </div>
            </div>

            {/* Paso 4: Franjas Horarias Disponibles (Time Slots) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel className="text-[10px] font-headline tracking-widest uppercase text-foreground/60 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  4. Horarios Disponibles para esta Fecha
                </FormLabel>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Libre
                  </span>
                  <span className="flex items-center gap-1 text-foreground/30">
                    <span className="w-2 h-2 rounded-full bg-foreground/20" /> Ocupado
                  </span>
                </div>
              </div>

              <FormField
                control={form.control}
                name="timeSlot"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {TIME_SLOTS.map(slot => {
                        const isOccupied = occupiedSlots.has(slot);
                        const isSelected = field.value === slot;

                        return (
                          <button
                            type="button"
                            key={slot}
                            disabled={isOccupied}
                            onClick={() => field.onChange(slot)}
                            className={`py-2.5 px-2 rounded-xl text-xs font-mono tracking-wider transition-all border text-center ${
                              isOccupied
                                ? 'bg-foreground/5 border-border/40 text-foreground/20 cursor-not-allowed line-through'
                                : isSelected
                                ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                                : 'bg-foreground/5 border-border text-foreground/80 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-300'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Paso 5: Información del Cliente */}
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">
                5. Datos del Cliente
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Nombre Completo *" {...field} className="bg-foreground/5 border-border rounded-xl h-11 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Teléfono / Celular *" {...field} className="bg-foreground/5 border-border rounded-xl h-11 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Correo Electrónico *" type="email" {...field} className="bg-foreground/5 border-border rounded-xl h-11 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Resumen Final */}
            {selectedServiceObj && (
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-headline tracking-widest text-amber-500">Resumen de Cita:</span>
                  <p className="text-foreground/90 font-medium">
                    {selectedServiceObj.name} con <span className="text-amber-400">{selectedBarberObj?.name}</span>
                  </p>
                  <p className="text-foreground/40 text-[11px]">
                    {selectedDate} {form.watch('timeSlot') ? `a las ${form.watch('timeSlot')}` : '(Horario pendiente)'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-foreground/40 uppercase font-headline">Valor:</span>
                  <p className="text-lg font-mono text-emerald-400 font-bold">
                    ${selectedServiceObj.price.toLocaleString('es-CO')} COP
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2 flex flex-row items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-5 border-border">
                Cancelar
              </Button>
              <PremiumButton type="submit" className="rounded-xl h-11 px-6">
                <span className="text-xs uppercase tracking-widest font-headline">
                  {existingAppointment ? 'Guardar Cambios' : 'Confirmar Reserva'}
                </span>
              </PremiumButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
