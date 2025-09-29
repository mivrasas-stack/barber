
"use client"
import React from 'react'
import Image from 'next/image'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuFooter,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { Badge } from '../ui/badge'

export function UserCart() {
  const { cartItems, removeFromCart, cartTotal, cartCount } = useCart();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center rounded-full p-0">{cartCount}</Badge>
          )}
          <span className="sr-only">Carrito de compras</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Mi Carrito</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {cartItems.length > 0 ? (
          <>
            <div className="max-h-64 overflow-y-auto p-1">
                {cartItems.map(item => (
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); removeFromCart(item.id)}}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </DropdownMenuItem>
                ))}
            </div>
            <DropdownMenuSeparator />
            <div className="p-2">
                <div className="flex justify-between font-bold text-lg mb-4">
                    <span>Total:</span>
                    <span>COP {cartTotal.toLocaleString('es-CO')}</span>
                </div>
                <Button className="w-full">Proceder al Pago</Button>
            </div>
          </>
        ) : (
          <p className="p-4 text-center text-sm text-muted-foreground">Tu carrito está vacío.</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
