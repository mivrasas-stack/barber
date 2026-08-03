"use client"
import React, { useState } from 'react'
import Image from 'next/image'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ShoppingCart, Trash2 } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { Badge } from '../ui/badge'
import { PremiumButton } from '@/components/ui/premium-button'

export function UserCart() {
  const { cartItems, removeFromCart, cartTotal, cartCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="relative group p-2 transition-colors hover:text-white text-muted-foreground focus:outline-none">
          <ShoppingCart className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
          {cartCount > 0 && (
            <Badge variant="destructive" className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center rounded-full p-0 text-[10px] bg-primary text-primary-foreground border-none animate-in zoom-in">
                {cartCount}
            </Badge>
          )}
          <span className="sr-only">Bolsa de Compras</span>
        </button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md bg-black/95 backdrop-blur-3xl border-l border-white/10 p-0 flex flex-col shadow-2xl [&>button]:text-white/60 [&>button:hover]:text-white">
        {/* Decorative ambient light */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        
        <SheetHeader className="p-6 border-b border-white/5 text-left relative z-10">
          <SheetTitle className="text-2xl font-headline tracking-widest uppercase text-white flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-primary" />
            La Bolsa
          </SheetTitle>
          <p className="text-muted-foreground font-light text-xs tracking-wider uppercase mt-1">
            Tus selecciones exclusivas
          </p>
        </SheetHeader>
            
        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 relative z-10">
            {cartItems.length > 0 ? (
                <div className="flex flex-col gap-4">
                    {cartItems.map(item => (
                    <div key={item.id} className="flex gap-4 group p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300">
                        <div className="relative h-20 w-20 rounded-lg bg-black/40 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/5">
                            <Image src={item.imageUrl} alt={item.name} fill className="object-contain group-hover:scale-110 transition-transform duration-500 p-2" />
                        </div>
                        <div className="flex flex-col flex-1 justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-headline tracking-wide text-white text-lg leading-tight line-clamp-1">{item.name}</h3>
                                    <p className="text-muted-foreground font-light text-sm mt-1">
                                        COP {item.price.toLocaleString('es-CO')}
                                    </p>
                                </div>
                                <button 
                                    className="p-2 text-white/40 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                                    onClick={() => removeFromCart(item.id)}
                                    title="Eliminar producto"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs font-light tracking-widest text-white/60 uppercase">Cant:</span>
                                <span className="text-sm font-medium text-white">{item.quantity}</span>
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                        <div className="relative w-24 h-24 rounded-full border border-white/10 flex items-center justify-center bg-black/50 backdrop-blur-md">
                            <ShoppingCart className="h-10 w-10 text-white/40" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <p className="font-headline tracking-widest uppercase text-white text-lg">Bolsa Vacía</p>
                        <p className="font-light text-sm">Aún no has elegido ningún producto.</p>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
            <div className="p-6 border-t border-white/5 bg-black/60 backdrop-blur-md relative z-10">
                <div className="flex justify-between items-end mb-6">
                    <span className="text-sm font-light tracking-widest uppercase text-muted-foreground">Total Estimado</span>
                    <span className="text-2xl font-headline text-white tracking-wide">COP {cartTotal.toLocaleString('es-CO')}</span>
                </div>
                <PremiumButton className="w-full justify-center py-6 text-sm tracking-widest uppercase shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)]">
                    Proceder al Pago
                </PremiumButton>
            </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
