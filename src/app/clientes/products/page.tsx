"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { ShoppingBag, Star, Package } from "lucide-react";
import { dummyProducts } from "../data";
import { motion } from "framer-motion";
import Image from 'next/image';

export default function CustomerProductsPage() {
  const products = dummyProducts;

  return (
    <div className="w-full flex flex-col gap-6 font-sans pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between mt-2 mb-4 gap-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-2 text-foreground/90">
            Nuestra <span className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-600">Boutique</span>
          </h1>
          <p className="text-foreground/40 text-sm md:text-base max-w-xl font-light">
            Productos premium seleccionados para el cuidado personal.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 mt-2">
        {products.map((product, idx) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
            className="group relative flex flex-col rounded-[2rem] bg-gradient-to-b from-foreground/[0.04] to-transparent border border-border hover:border-purple-500/30 transition-all duration-500 overflow-hidden hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]"
          >
            {/* Image Container */}
            <div className="relative w-full aspect-square overflow-hidden bg-foreground/5">
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent z-10" />
              {product.imageUrl ? (
                <Image 
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-foreground/10 group-hover:text-purple-500/20 transition-colors">
                  <Package className="w-16 h-16 mb-2" />
                  <span className="text-xs uppercase tracking-widest font-headline">Sin Imagen</span>
                </div>
              )}
              <div className="absolute top-4 right-4 z-20">
                 <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-border text-xs font-semibold text-foreground">
                   ${product.price.toLocaleString('es-CO')} COP
                 </span>
              </div>
            </div>
            
            <div className="p-6 flex flex-col flex-1 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-widest font-headline text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  {product.category}
                </span>
                {product.stock < 10 && (
                  <span className="text-[10px] uppercase tracking-widest font-headline text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Quedan pocos
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-medium text-foreground/90 mb-2 group-hover:text-foreground transition-colors uppercase tracking-wider">{product.name}</h3>
              <p className="text-sm text-foreground/50 leading-relaxed font-light mb-6 line-clamp-2">
                {product.description}
              </p>
              
              <div className="mt-auto pt-4 border-t border-border">
                <Button 
                  className="w-full rounded-xl bg-foreground/5 text-foreground hover:bg-purple-500 hover:text-foreground border border-border hover:border-purple-500 transition-all font-medium tracking-wide gap-2 group/btn"
                >
                  <ShoppingBag className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                  Añadir al Carrito
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
