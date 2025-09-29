"use client";
import React from 'react';
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
import { Button } from '@/components/ui/button';
import type { Appointment } from '@/lib/types';
import { dummyServices } from '@/app/dashboard/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const formSchema = z.object({
  customerName: z.string().min(1, 'El nombre del cliente es requerido'),
  customerEmail: z.string().email('Debe ser un correo electrónico válido'),
  service: z.string().min(1, 'El servicio es requerido'),
  date: z.string().min(1, 'La fecha es requerida').refine(val => !isNaN(Date.parse(val)), { message: "Fecha inválida" }),
});

interface AddAppointmentFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'status'>) => void;
}

export function AddAppointmentForm({ isOpen, onOpenChange, onAddAppointment }: AddAppointmentFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      service: '',
      date: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddAppointment({
        ...values,
        date: new Date(values.date).toISOString()
    });
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Añadir Nueva Cita</DialogTitle>
          <DialogDescription>
            Completa la información para agendar una nueva cita.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: John Doe" {...field} />
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
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Ej: john.d@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha y Hora</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">Añadir Cita</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
