"use client";
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { PremiumButton } from '@/components/ui/premium-button';
import { CheckCircle2 } from 'lucide-react';

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
}

const paymentMethods = ["Tarjeta (Datáfono)", "Nequi / Daviplata", "Efectivo"];

export function UserWaitRoomPaymentDialog({ isOpen, onOpenChange, onConfirm }: PaymentDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [paymentCode, setPaymentCode] = useState("");

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPaymentCode("");
    }
  }, [isOpen]);

  const handleGenerateCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setPaymentCode(code);
    setStep(2);
  };

  const handleComplete = () => {
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Don't allow closing by clicking outside if they are on step 2 (they must show the code)
      if (step === 2 && !open) return;
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[450px] bg-background border-black/10 dark:border-border p-0 overflow-hidden">
        {step === 1 ? (
          <div className="p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
            <div className="relative z-10">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-headline tracking-widest text-gray-900 dark:text-foreground">MÉTODO DE PAGO</DialogTitle>
                <DialogDescription className="text-muted-foreground font-light text-sm">
                  ¿Cómo prefieres pagar tu orden en el Lounge?
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-6">
                  <RadioGroup defaultValue={paymentMethods[0]} className="space-y-4">
                      {paymentMethods.map(method => (
                          <div key={method} className="flex items-center space-x-4 border border-black/10 dark:border-border p-4 hover:bg-black/5 dark:hover:bg-foreground/5 transition-colors cursor-pointer group">
                              <RadioGroupItem value={method} id={`r-wait-${method}`} className="border-black/20 dark:border-border text-primary" />
                              <Label htmlFor={`r-wait-${method}`} className="text-gray-900 dark:text-foreground font-light tracking-wide w-full cursor-pointer group-hover:text-primary transition-colors">
                                {method}
                              </Label>
                          </div>
                      ))}
                  </RadioGroup>
              </div>
              
              <DialogFooter className="mt-4 sm:justify-between gap-4">
                <PremiumButton type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                  Cancelar
                </PremiumButton>
                <PremiumButton type="button" onClick={handleGenerateCode} className="w-full sm:w-auto">
                  Generar Código
                </PremiumButton>
              </DialogFooter>
            </div>
          </div>
        ) : (
          <div className="p-8 relative text-center flex flex-col items-center justify-center min-h-[400px]">
             <DialogTitle className="sr-only">Orden Registrada</DialogTitle>
             {/* Glow effect */}
             <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
             
             <div className="relative z-10 w-full flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                
                <h3 className="text-2xl font-headline tracking-widest uppercase text-gray-900 dark:text-foreground mb-2">Orden Registrada</h3>
                <p className="text-muted-foreground font-light text-sm mb-10 max-w-[280px]">
                  Por favor, presenta el siguiente código al barista o en caja para recibir tu orden.
                </p>

                <div className="bg-black/5 dark:bg-foreground/5 border border-black/10 dark:border-border w-full py-8 mb-10">
                  <span className="text-6xl font-headline tracking-[0.2em] text-primary drop-shadow-[0_0_15px_rgba(200,155,60,0.4)]">
                    {paymentCode}
                  </span>
                </div>

                <PremiumButton onClick={handleComplete} className="w-full justify-center">
                  Presentado en Caja
                </PremiumButton>
             </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
