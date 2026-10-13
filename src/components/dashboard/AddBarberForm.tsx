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
import type { Barber } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  avatarUrl: z.string().url('Debe ser una URL de imagen válida'),
});

interface AddBarberFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveBarber: (barber: Omit<Barber, 'id'> | Barber) => void;
  existingBarber: Barber | null;
}

export function AddBarberForm({ isOpen, onOpenChange, onSaveBarber, existingBarber }: AddBarberFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      avatarUrl: '',
    },
  });

  useEffect(() => {
    if (existingBarber) {
      form.reset(existingBarber);
    } else {
      form.reset({
        name: '',
        avatarUrl: '',
      });
    }
  }, [existingBarber, form, isOpen]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (existingBarber) {
        onSaveBarber({ ...existingBarber, ...values });
    } else {
        onSaveBarber(values);
    }
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingBarber ? 'Editar Barbero' : 'Añadir Nuevo Barbero'}</DialogTitle>
          <DialogDescription>
            {existingBarber ? 'Modifica la información del barbero.' : 'Completa la información para agregar un nuevo barbero.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Barbero</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Carlos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Avatar</FormLabel>
                  <FormControl>
                    <Input placeholder="https://ejemplo.com/avatar.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">{existingBarber ? 'Guardar Cambios' : 'Añadir Barbero'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
