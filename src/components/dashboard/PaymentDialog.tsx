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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
}

const paymentMethods = ["Nequi", "Daviplata", "Tarjeta", "Efectivo"];

export function PaymentDialog({ isOpen, onOpenChange, onConfirm }: PaymentDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Seleccionar Método de Pago</DialogTitle>
          <DialogDescription>
            Elige el método de pago del cliente para confirmar la transacción.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <RadioGroup defaultValue={paymentMethods[0]}>
                <div className="grid grid-cols-2 gap-4">
                    {paymentMethods.map(method => (
                        <div key={method} className="flex items-center space-x-2">
                            <RadioGroupItem value={method} id={`r-${method}`} />
                            <Label htmlFor={`r-${method}`}>{method}</Label>
                        </div>
                    ))}
                </div>
            </RadioGroup>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={onConfirm}>Confirmar Pago</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
