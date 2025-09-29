"use client";
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { WaitingRoomOrder } from '@/lib/types';
import { Badge } from '../ui/badge';

interface OrderDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  order: WaitingRoomOrder | null;
}

export function OrderDetailsDialog({ isOpen, onOpenChange, order }: OrderDetailsDialogProps) {
  if (!order) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalles del Pedido: {order.id}</DialogTitle>
          <DialogDescription>
            Información detallada del pedido de <span className="font-semibold">{order.customerName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="font-semibold">Código:</span> {order.code}</p>
                <p><span className="font-semibold">Total:</span> COP {order.total.toLocaleString('es-CO')}</p>
                <p><span className="font-semibold">Método:</span> {order.paymentMethod}</p>
                <p className="flex items-center gap-2"><span className="font-semibold">Estado:</span> 
                    <Badge 
                        variant={order.status === 'Confirmado' ? 'secondary' : 'outline'}
                        className={order.status === 'Confirmado' ? 'bg-green-600/20 text-green-400 border-green-600/40' : 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40'}
                    >
                        {order.status}
                    </Badge>
                </p>
            </div>
            
            <h4 className="font-semibold">Artículos del Pedido</h4>
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order.items?.map((item, index) => (
                    <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>

        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
