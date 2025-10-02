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
import { dummyServices, dummyBarbers } from '@/app/dashboard/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
                      </T