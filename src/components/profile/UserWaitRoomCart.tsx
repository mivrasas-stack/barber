"use client"
import React, { useState } from 'react'
import Image from 'next/image'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Coffee, Trash2 } from 'lucide-react'
import { useWaitRoom } from '@/hooks/use-wait-room'
import { Badge } from '../ui/badge'
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'
import { useToast } from "@/hooks/use-toast"
import { UserWaitRoomPaymentDialog } from './UserWaitRoomPaymentDialog'

export function UserWaitRoomCart() {
  const { waitRoomItems, removeFromWaitRoom, waitRoomTotal, waitRoomCount, clearWaitRoom } = useWaitRoom();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const { toast } = useToast();


  const handleConfirmPayment = () => {
    const paymentCode = Math.floor(100000 + Math.random() * 900000).toString();
    clearWaitRoom();
    setIsPaymentDialogOpen(false);
    toast({
        title: "Pago Registrado - Presenta este código en caja",
        description: `Tu código de pago es: ${paymentCode}`,
    })
  };

  return (
    <>
        <UserWaitRoomPaymentDialog
            isOpen={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            onConfirm={handleConfirmPayment}
        />
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
            <Coffee className="h-5 w-5" />
            {waitRoomCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center rounded-full p-0">{waitRoomCount}</Badge>
            )}
            <span className="sr-only">Pedidos de Sala de Espera</span>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="end">
            <DropdownMenuLabel>Mis Pedidos</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {waitRoomItems.length > 0 ? (
            <>
                <div className="max-h-64 overflow-y-auto p-1">
                    {waitRoomItems.map(item => (
                    <DropdownMenuItem key={item.id} className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                            <Image src={item.imageUrl} alt={item.name} width={40} height={40} className="rounded-md" />
                            <div>
                                <p className="font-medium truncate max-w-28">{item.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {item.quantity} x COP {item.price.toLocaleString('es-CO')}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); removeFromWaitRoom(item.id)}}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </DropdownMenuItem>
                    ))}
                </div>
                <DropdownMenuSeparator />
                <div className="p-2">
                    <div className="flex justify-between font-bold text-lg mb-4">
                        <span>Total a pagar en caja:</span>
                        <span>COP {waitRoomTotal.toLocaleString('es-CO')}</span>
                    </div>
                     <Button className="w-full" onClick={() => setIsPaymentDialogOpen(true)}>Pagar en caja</Button>
                </div>
            </>
            ) : (
            <p className="p-4 text-center text-sm text-muted-foreground">No has pedido nada.</p>
            )}
        </DropdownMenuContent>
        </DropdownMenu>
    </>
  )
}
