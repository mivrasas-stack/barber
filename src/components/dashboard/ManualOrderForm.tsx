"use client";
import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WaitingRoomOrder, WaitingRoomProduct } from '@/lib/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '../ui/separator';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Producto requerido'),
  quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1'),
});

const formSchema = z.object({
  customerName: z.string().min(1, 'El nombre del cliente es requerido'),
  paymentMethod: z.enum(['Nequi', 'Daviplata', 'Efectivo', 'Tarjeta']),
  items: z.array(orderItemSchema).min(1, 'Debe haber al menos un producto'),
});

interface ManualOrderFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  products: WaitingRoomProduct[];
  onAddOrder: (order: Omit<WaitingRoomOrder, 'id' | 'code' | 'status'>) => void;
}

export function ManualOrderForm({ isOpen, onOpenChange, products, onAddOrder }: ManualOrderFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      items: [{ productId: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const watchItems = form.watch("items");
  const total = watchItems.reduce((acc, currentItem) => {
    const product = products.find(p => p.id === currentItem.productId);
    return acc + (product ? product.price * currentItem.quantity : 0);
  }, 0);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const orderItems = values.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
            name: product?.name || 'Producto no encontrado',
            quantity: item.quantity,
        };
    });

    onAddOrder({
      customerName: values.customerName,
      paymentMethod: values.paymentMethod,
      items: orderItems,
      total: total,
    });
    form.reset();
  }

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Pedido Manual</DialogTitle>
          <DialogDescription>
            Completa la información para registrar un nuevo pedido en el punto físico.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Visitante Casual" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />
            
            <h4 className="text-sm font-medium">Artículos del Pedido</h4>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name={`items.${index}.productId`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="sr-only">Producto</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un producto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem className="w-24">
                       <FormLabel className="sr-only">Cantidad</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ productId: '', quantity: 1 })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Producto
            </Button>

            <Separator />
            
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pago</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Nequi">Nequi</SelectItem>
                      <SelectItem value="Daviplata">Daviplata</SelectItem>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="font-bold text-lg text-right">
                Total: COP {total.toLocaleString('es-CO')}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">Crear y Confirmar Pedido</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
