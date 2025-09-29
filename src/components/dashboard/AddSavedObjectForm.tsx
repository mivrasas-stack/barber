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
import type { SavedObject } from '@/lib/types';

const formSchema = z.object({
  customerName: z.string().min(1, 'El nombre del cliente es requerido'),
  objectName: z.string().min(1, 'El nombre del objeto es requerido'),
});

interface AddSavedObjectFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddObject: (object: Omit<SavedObject, 'id' | 'dateStored' | 'dateReturned' | 'status'>) => void;
}

export function AddSavedObjectForm({ isOpen, onOpenChange, onAddObject }: AddSavedObjectFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      objectName: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddObject(values);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Objeto</DialogTitle>
          <DialogDescription>
            Completa la información para registrar un nuevo objeto guardado.
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
              name="objectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Objeto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Maletín negro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">Añadir Objeto</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
