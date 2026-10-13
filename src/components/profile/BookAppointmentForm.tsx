"use client";
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { PremiumButton } from '@/components/ui/premium-button';
import { Button } from '@/components/ui/button';
import type { Appointment } from '@/lib/types';
import { dummyServices, dummyBarbers } from '@/app/clientes/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  service: z.string().min(1, 'El servicio es requerido'),
  barberId: z.string().min(1, 'El barbero es requerido'),
  date: z.string().min(1, 'La fecha es requerida').refine(val => !isNaN(Date.parse(val)), { message: "Fecha inválida" }),
});

interface BookAppointmentFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveAppointment: (appointment: Omit<Appointment, 'id' | 'status' | 'customerName' | 'customerEmail'>) => void;
}

export function BookAppointmentForm({ isOpen, onOpenChange, onSaveAppointment }: BookAppointmentFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const timeSlots = [
    { time: "09:00", available: false },
    { time: "09:30", available: false },
    { time: "10:00", available: true },
    { time: "10:30", available: true },
    { time: "11:00", available: true },
    { time: "11:30", available: true },
    { time: "12:00", available: false },
    { time: "12:30", available: true },
    { time: "13:00", available: true },
    { time: "13:30", available: true },
    { time: "14:00", available: true },
    { time: "14:30", available: false },
    { time: "15:00", available: false },
    { time: "15:30", available: true },
    { time: "16:00", available: true },
    { time: "16:30", available: true },
    { time: "17:00", available: true },
    { time: "17:30", available: true },
  ];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service: '',
      barberId: '',
      date: '',
    },
  });
  
  useEffect(() => {
    if(!isOpen) {
        form.reset();
        setSelectedDate(undefined);
        setSelectedTime(null);
    }
  }, [isOpen, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const dataToSave = {
        ...values,
        date: new Date(values.date).toISOString(),
    };
    onSaveAppointment(dataToSave);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agendar Nueva Cita</DialogTitle>
          <DialogDescription>
            Completa la información para agendar tu próxima visita.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
              control={form.control}
              name="service"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servicio</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un servicio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dummyServices.map(service => (
                        <SelectItem key={service.id} value={service.name}>{service.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="barberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barbero</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tu barbero preferido" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dummyBarbers.map(barber => (
                        <SelectItem key={barber.id} value={barber.id}>{barber.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha y Hora</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP p", { locale: es })
                          ) : (
                            <span>dd/mm/aaaa --:-- -----</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 max-w-[95vw] max-h-[80vh] overflow-y-auto" align="start">
                      <div className="flex flex-col sm:flex-row">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(newDate) => {
                            if (newDate) {
                              setSelectedDate(newDate);
                              setSelectedTime(null);
                            }
                          }}
                          className="p-2 sm:pe-5 bg-background mx-auto"
                          disabled={[
                            { before: new Date() },
                          ]}
                        />
                        <div className="relative w-full h-56 sm:h-auto sm:w-40">
                          <div className="absolute inset-0 border-border py-4 border-t sm:border-t-0 sm:border-l">
                            <ScrollArea className="h-full border-border">
                              <div className="space-y-3">
                                <div className="flex h-5 shrink-0 items-center px-5">
                                  <p className="text-sm font-medium">
                                    {selectedDate ? format(selectedDate, "EEEE, d", { locale: es }) : "Selecciona una fecha"}
                                  </p>
                                </div>
                                <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                                  {timeSlots.map(({ time: timeSlot, available }) => (
                                    <Button
                                      key={timeSlot}
                                      type="button"
                                      variant={selectedTime === timeSlot ? "default" : "outline"}
                                      size="sm"
                                      className="w-full"
                                      onClick={() => {
                                        setSelectedTime(timeSlot);
                                        if (selectedDate) {
                                          const [hours, minutes] = timeSlot.split(':');
                                          const newDateTime = new Date(selectedDate);
                                          newDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                                          field.onChange(newDateTime.toISOString());
                                        }
                                      }}
                                      disabled={!available || !selectedDate}
                                    >
                                      {timeSlot}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </ScrollArea>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <PremiumButton type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</PremiumButton>
              <PremiumButton type="submit">Agendar Cita</PremiumButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
