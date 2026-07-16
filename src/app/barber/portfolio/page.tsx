"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { dummyPortfolioItems } from "@/app/dashboard/data";
import { Play, Image as ImageIcon, Trash2, UploadCloud, Edit3 } from "lucide-react";
import Image from "next/image";
import { UploadWorkDialog } from "@/components/profile/UploadWorkDialog";
import { motion } from "framer-motion";

// Extending dummy items locally to show video examples if needed, 
// or assuming dummyPortfolioItems already has them.
// Let's create a local enhanced array for demonstration purposes of the new design.
const enhancedPortfolioItems = [
  { id: '1', type: 'video', imageUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=800&auto=format&fit=crop', category: 'Fade', description: 'Corte Texturizado en movimiento. #MidFade #TexturedCrop' },
  { id: '2', type: 'photo', imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=800&auto=format&fit=crop', category: 'Clásico', description: 'Classic Pompadour con barba perfilada.' },
  { id: '3', type: 'photo', imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=800&auto=format&fit=crop', category: 'Buzz Cut', description: 'Buzz cut de precisión.' },
  { id: '4', type: 'video', imageUrl: 'https://images.unsplash.com/photo-1593702288056-ccbfb45fbdcc?q=80&w=800&auto=format&fit=crop', category: 'Diseño', description: 'Diseño y freestyle en los laterales.' },
];

export default function BarberPortfolio() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        {/* Background glow for header */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase flex items-center gap-4">
               Mi Portafolio
            </h1>
            <p className="text-white/60 font-light mt-2 tracking-wide text-lg max-w-xl">
               Sube fotos y videos de tus mejores cortes. Los clientes verán esta galería en tu perfil público.
            </p>
        </div>
      </div>

      {/* Portfolio Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          
          {/* Upload Action Card */}
          <UploadWorkDialog>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="h-[380px] rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.01] hover:bg-white/[0.03] hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-4 text-white/40 hover:text-primary group"
            >
                <div className="w-20 h-20 rounded-full bg-white/5 group-hover:bg-primary/20 flex items-center justify-center transition-colors shadow-lg">
                    <UploadCloud className="w-10 h-10 group-hover:text-primary" />
                </div>
                <span className="font-headline tracking-widest uppercase text-base text-white/60 group-hover:text-primary transition-colors">Subir Nuevo Trabajo</span>
                <span className="text-xs text-white/40 font-light px-8 text-center">Agrega fotos o videos cortos para impresionar a tus clientes.</span>
            </motion.button>
          </UploadWorkDialog>

          {/* Items */}
          {enhancedPortfolioItems.map((item, idx) => (
              <motion.div 
                key={item.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card className="bg-white/[0.02] border-white/10 hover:border-primary/30 transition-all duration-500 group overflow-hidden rounded-2xl h-[380px] flex flex-col">
                    <CardContent className="p-0 relative flex-1 flex flex-col">
                        
                        {/* Media Section */}
                        <div className="relative flex-1 bg-black/50 overflow-hidden">
                            <Image 
                              src={item.imageUrl} 
                              alt={item.description} 
                              fill 
                              className="object-cover group-hover:scale-110 transition-transform duration-700" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                            
                            {/* Video Indicator */}
                            {item.type === 'video' && (
                              <div className="absolute top-4 left-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                                <Play className="w-4 h-4 text-white ml-1" />
                              </div>
                            )}
                            
                            {/* Actions (Edit / Delete) */}
                            <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-4 group-hover:translate-x-0">
                               <button className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-primary/50 transition-all border border-white/10">
                                  <Edit3 className="w-4 h-4" />
                               </button>
                               <button className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-red-500/80 transition-all border border-white/10">
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                            
                            {/* Category Badge */}
                            <div className="absolute bottom-4 left-4 bg-primary/80 backdrop-blur-md border border-primary/30 text-white px-3 py-1 rounded-full text-[10px] font-headline tracking-widest uppercase shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                                {item.category}
                            </div>
                        </div>

                        {/* Details Section */}
                        <div className="p-5 bg-black/40 border-t border-white/5 h-[100px]">
                            <p className="text-sm font-light text-white/80 line-clamp-3">
                                {item.description}
                            </p>
                        </div>
                    </CardContent>
                </Card>
              </motion.div>
          ))}
      </div>

    </div>
  );
}
