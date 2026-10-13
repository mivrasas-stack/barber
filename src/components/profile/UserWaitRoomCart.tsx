"use client"
import React, { useState } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog"
import { Coffee, Trash2, X } from 'lucide-react'
import { useWaitRoom } from '@/hooks/use-wait-room'
import { Badge } from '../ui/badge'
import { PremiumButton } from '@/components/ui/premium-button'
import { useToast } from "@/hooks/use-toast"
import { UserWaitRoomPaymentDialog } from './UserWaitRoomPaymentDialog'

export function UserWaitRoomCart() {
  const { waitRoomItems, removeFromWaitRoom, waitRoomTotal, waitRoomCount, clearWaitRoom } = useWaitRoom();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleConfirmPayment = () => {
    clearWaitRoom();
    setIsPaymentDialogOpen(false);
    setIsOpen(false);
    toast({
        title: "¡Listo!",
        description: "Tu pago ha sido gestionado con éxito. Disfruta tu estancia.",
    })
  };

  return (
    <>
        <UserWaitRoomPaymentDialog
            isOpen={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            onConfirm={handleConfirmPayment}
        />
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="relative group p-2 transition-colors hover:text-foreground text-muted-foreground focus:outline-none">
              <Coffee className="h-5 w-5 group-hover:scale-110 transition-transform" />
              {waitRoomCount > 0 && (
                <Badge variant="destructive" className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center rounded-full p-0 text-[10px] bg-primary text-primary-foreground border-none">
                    {waitRoomCount}
                </Badge>
              )}
              <span className="sr-only">Servicios de Lounge</span>
            </button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-2xl bg-black/80 backdrop-blur-2xl border-border p-0 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] [&>button]:hidden">
            <DialogTitle className="sr-only">Lounge VIP</DialogTitle>
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-transparent via-primary/50 to-transparent" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col max-h-[80vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-border">
                    <div>
                        <h2 className="text-2xl font-headline tracking-widest uppercase text-foreground">
                            Lounge VIP
                        </h2>
                        <p className="text-muted-foreground font-light text-xs tracking-wider mt-1 uppercase">Tus selecciones de cortesía</p>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-full transition-all"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                {/* Body */}
                <div className="flex-1 overflow-y-auto scrollbar-hide p-8">
                    {waitRoomItems.length > 0 ? (
                        <div className="space-y-6">
                            {waitRoomItems.map(item => (
                            <div key={item.id} className="flex justify-between items-center gap-6 group p-4 border border-transparent hover:border-border hover:bg-foreground/5 transition-all duration-300">
                                <div className="flex items-center gap-6">
                                    <div className="relative h-24 w-24 bg-transparent flex items-center justify-center overflow-hidden rounded-md border border-border">
                                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-headline tracking-wide text-foreground text-xl">{item.name}</p>
                                        <p className="text-sm font-light text-primary tracking-widest uppercase">
                                            Cantidad: {item.quantity}
                                        </p>
                                        <p className="text-muted-foreground font-light text-sm">
                                            COP {item.price.toLocaleString('es-CO')} c/u
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    className="p-3 text-foreground/20 hover:text-destructive hover:bg-destructive/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                    onClick={() => removeFromWaitRoom(item.id)}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-muted-foreground space-y-6">
                            <div className="w-20 h-20 rounded-full border border-border flex items-center justify-center bg-foreground/5">
                                <Coffee className="h-8 w-8 text-foreground/20" />
                            </div>
                            <p className="font-light tracking-widest uppercase text-sm text-center max-w-[250px]">No has solicitado ningún servicio a la sala de espera.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {waitRoomItems.length > 0 && (
                    <div className="p-8 border-t border-border bg-foreground/5">
                        <div className="flex justify-between items-end mb-8">
                            <span className="text-sm font-light tracking-widest uppercase text-muted-foreground">Total en Caja</span>
                            <span className="text-3xl font-headline text-foreground tracking-wide">COP {waitRoomTotal.toLocaleString('es-CO')}</span>
                        </div>
                        <PremiumButton className="w-full justify-center py-6" onClick={() => setIsPaymentDialogOpen(true)}>
                            Generar Código de Pago
                        </PremiumButton>
                    </div>
                )}
            </div>
          </DialogContent>
        </Dialog>
    </>
  )
}
