"use client";
import React, { useEffect } from 'react';
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
  onSaveAppointment: (appointment: Omit<Appointment, 'id' | 'status'> | Appointment) => void;
  existingAppointment: Appointment | null;
}

export function AddAppointmentForm({ isOpen, onOpenChange, onSaveAppointment, existingAppointment }: AddAppointmentFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      service: '',
      date: '',
    },
  });

  useEffect(() => {
    if (existingAppointment) {
      const date = new Date(existingAppointment.date);
      // Format to "YYYY-MM-DDTHH:mm" which is required by datetime-local input
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      
      form.reset({
        customerName: existingAppointment.customerName,
        customerEmail: existingAppointment.customerEmail,
        service: existingAppointment.service,
        date: formattedDate,
      });
    } else {
      form.reset({
        customerName: '',
        customerEmail: '',
        service: '',
        date: '',
      });
    }
  }, [existingAppointment, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const dataToSave = {
        ...values,
        date: new Date(values.date).toISOString(),
    };

    if (existingAppointment) {
        onSaveAppointment({ ...existingAppointment, ...dataToSave });
    } else {
        onSaveAppointment(dataToSave);
    }
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingAppointment ? 'Editar Cita' : 'Añadir Nueva Cita'}</DialogTitle>
          <DialogDescription>
            {existingAppointment ? 'Modifica la información de la cita.' : 'Completa la información para agendar una nueva cita.'}
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
              <Button type="submit">{existingAppointment ? 'Guardar Cambios' : 'Añadir Cita'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
