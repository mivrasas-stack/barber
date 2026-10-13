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
import type { Service } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  price: z.coerce.number().min(0, 'El precio debe ser un número positivo'),
  duration: z.coerce.number().min(0, 'La duración debe ser un número positivo'),
  imageUrl: z.string().url('Debe ser una URL de imagen válida').optional().or(z.literal('')),
});

interface AddServiceFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveService: (service: Omit<Service, 'id'> | Service) => void;
  existingService: Service | null;
}

export function AddServiceForm({ isOpen, onOpenChange, onSaveService, existingService }: AddServiceFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      duration: 0,
      imageUrl: '',
    },
  });

  useEffect(() => {
    if (existingService) {
        form.reset(existingService);
    } else {
        form.reset({
            name: '',
            description: '',
            price: 0,
            duration: 0,
            imageUrl: '',
        });
    }
  }, [existingService, form, isOpen]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (existingService) {
        onSaveService({ ...existingService, ...values });
    } else {
        onSaveService(values);
    }
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingService ? 'Editar Servicio' : 'Añadir Nuevo Servicio'}</DialogTitle>
          <DialogDescription>
             {existingService ? 'Modifica la información del servicio.' : 'Completa la información para agregar un nuevo servicio.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Servicio</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Corte de Pelo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Corte de pelo y peinado clásico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ej: 40000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración (minutos)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ej: 30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de la Imagen</FormLabel>
                  <FormControl>
                    <Input placeholder="https://ejemplo.com/imagen.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">{existingService ? 'Guardar Cambios' : 'Añadir Servicio'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
