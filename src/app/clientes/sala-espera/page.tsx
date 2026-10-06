"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, GlassWater, Plus, Minus, ShoppingCart, Timer, ChevronLeft, CreditCard } from "lucide-react";
import { dummyWaitingRoomProducts } from "../data";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function SalaEsperaClientePage() {
  const { toast } = useToast();
  const [cart, setCart] = useState<{ id: string; quantity: number }[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const categories = Array.from(new Set(dummyWaitingRoomProducts.map(p => p.category)));

  const addToCart = (id: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing) {
        return prev.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.id === id ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.id !== id);
    });
  };

  const getQuantity = (id: string) => {
    return cart.find(item => item.id === id)?.quantity || 0;
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => {
    const product = dummyWaitingRoomProducts.find(p => p.id === item.id);
    return acc + (product ? product.price * item.quantity : 0);
  }, 0);

  const handleOrder = () => {
    setIsCheckoutOpen(false);
    setCart([]);
    toast({
      title: "Pedido Enviado",
      description: "Hemos recibido tu pedido. Te lo llevaremos a tu asiento en breve.",
      className: "bg-emerald-500/10 border-emerald-500/50 text-emerald-500",
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans pb-24 relative min-h-screen">
      {/* Background elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      {/* Header */}
      <div className="flex flex-col mt-2 mb-4 gap-4 relative z-10">
        <Link href="/clientes" className="inline-flex items-center text-foreground/40 hover:text-foreground transition-colors text-sm w-fit mb-2">
          <ChevronLeft className="w-4 h-4 mr-1" /> Volver al Inicio
        </Link>
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/5 border border-border text-xs text-foreground/70 mb-4">
              <Timer className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> 
              Tu turno es el <strong className="text-foreground">#12</strong> (Tiempo est. 15 min)
            </div>
            <h1 className="text-3xl md:text-5xl font-headline uppercase tracking-widest text-foreground/90">
              Lounge <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">VIP</span>
            </h1>
            <p className="text-foreground/40 text-sm md:text-base font-light tracking-wide mt-2 max-w-lg">
              Mientras esperas tu turno, disfruta de nuestro menú de cortesía y productos a la venta. Te lo llevamos a tu asiento.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Categories & Products */}
      <div className="space-y-12 relative z-10">
        {categories.map(category => (
          <div key={category}>
            <h2 className="text-xl font-headline tracking-widest text-foreground/80 uppercase mb-6 flex items-center gap-3">
              <span className="w-8 h-px bg-amber-500/50"></span>
              {category}
              <span className="flex-1 h-px bg-foreground/10"></span>
            </h2>
            
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-50px" }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            >
              {dummyWaitingRoomProducts.filter(p => p.category === category).map((product) => (
                <motion.div 
                  key={product.id}
                  variants={itemVariants}
                  className="group relative flex flex-col p-4 rounded-[1.5rem] bg-background border border-border hover:border-amber-500/30 transition-all duration-300"
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-4 bg-foreground/5">
                    <Image 
                      src={product.imageUrl} 
                      alt={product.name} 
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500 mix-blend-luminosity group-hover:mix-blend-normal"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-black/60 backdrop-blur-md border-border text-foreground font-mono">
                        ${product.price.toLocaleString('es-CO')}
                      </Badge>
                    </div>
                  </div>

                  <h3 className="text-sm md:text-base font-medium text-foreground/90 truncate mb-4">{product.name}</h3>

                  <div className="mt-auto flex items-center justify-between bg-foreground/5 border border-border rounded-full p-1 h-10">
                    {getQuantity(product.id) > 0 ? (
                      <>
                        <button 
                          onClick={() => removeFromCart(product.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-foreground/50 hover:text-foreground hover:bg-foreground/10 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-foreground font-medium text-sm w-4 text-center">{getQuantity(product.id)}</span>
                        <button 
                          onClick={() => addToCart(product.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-foreground/50 hover:text-foreground hover:bg-foreground/10 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => addToCart(product.id)}
                        className="w-full h-full rounded-full flex items-center justify-center text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 transition-colors font-medium text-sm tracking-wide"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Añadir
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        ))}
      </div>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md"
          >
            <button 
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full bg-[#DFA343] hover:bg-[#c99036] text-black p-4 rounded-full shadow-[0_8px_32px_rgba(223,163,67,0.3)] flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black/10 rounded-full flex items-center justify-center font-bold">
                  {totalItems}
                </div>
                <span className="font-semibold tracking-wide">Ver Pedido</span>
              </div>
              <span className="font-bold text-lg">${totalPrice.toLocaleString('es-CO')}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="relative w-full max-w-md bg-[#111] border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-foreground/5">
                <h2 className="text-xl font-headline tracking-widest uppercase text-foreground flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-amber-500" /> Tu Pedido
                </h2>
                <button onClick={() => setIsCheckoutOpen(false)} className="text-foreground/40 hover:text-foreground">✕</button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="space-y-4">
                  {cart.map(item => {
                    const product = dummyWaitingRoomProducts.find(p => p.id === item.id);
                    if (!product) return null;
                    return (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 relative rounded-lg overflow-hidden bg-foreground/5">
                            <Image src={product.imageUrl} alt={product.name} fill className="object-cover mix-blend-luminosity" />
                          </div>
                          <div>
                            <p className="text-foreground text-sm">{product.name}</p>
                            <p className="text-foreground/40 text-xs">x{item.quantity}</p>
                          </div>
                        </div>
                        <p className="text-foreground font-medium">${(product.price * item.quantity).toLocaleString('es-CO')}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="h-px bg-foreground/5 w-full" />

                <div className="space-y-2">
                  <div className="flex justify-between text-foreground/50 text-sm">
                    <span>Subtotal</span>
                    <span>${totalPrice.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between text-foreground text-lg font-bold">
                    <span>Total a Pagar</span>
                    <span className="text-amber-500">${totalPrice.toLocaleString('es-CO')}</span>
                  </div>
                  <p className="text-[10px] text-foreground/30 text-center mt-2">El cobro se realizará al momento de finalizar tu servicio en caja.</p>
                </div>
              </div>

              <div className="p-6 border-t border-border bg-background">
                <Button 
                  onClick={handleOrder}
                  className="w-full bg-[#DFA343] hover:bg-[#c99036] text-black font-semibold rounded-full h-12 shadow-[0_4px_20px_rgba(223,163,67,0.2)] transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" /> Confirmar Pedido
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
