"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Star, Navigation } from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";

const topBarbershops = [
  {
    id: 1,
    name: "The Royal Barber",
    location: "Zona G, Bogotá",
    rating: 4.9,
    reviews: 1250,
    imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop",
    specialty: "Cortes Clásicos & Barba"
  },
  {
    id: 2,
    name: "Gentleman's Lounge",
    location: "El Poblado, Medellín",
    rating: 4.8,
    reviews: 980,
    imageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop",
    specialty: "Experiencia VIP"
  },
  {
    id: 3,
    name: "Classic Cuts Club",
    location: "Bocagrande, Cartagena",
    rating: 4.9,
    reviews: 845,
    imageUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1988&auto=format&fit=crop",
    specialty: "Estilo Urbano Premium"
  }
];

export default function TopBarbershops() {
  return (
    <section id="ranking" className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Background Map Placeholder Texture */}
      <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/5 blur-[120px] rounded-[100%] pointer-events-none" />

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <p className="text-primary font-medium tracking-[0.2em] uppercase text-sm mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Top Ranking Nacional
            </p>
            <h2 className="text-4xl lg:text-6xl font-bold font-headline text-foreground leading-tight uppercase tracking-widest">
              Las Preferidas por los Clientes
            </h2>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg font-light max-w-sm"
          >
            Descubre las barberías mejor valoradas que ya utilizan nuestro sistema para brindar un servicio de excelencia.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {topBarbershops.map((shop, index) => (
            <motion.div
              key={shop.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.6 }}
              className="group relative bg-card border border-border hover:border-primary/40 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(200,155,60,0.15)] flex flex-col shadow-sm"
            >
              <div className="relative w-full h-64 overflow-hidden">
                <Image
                  src={shop.imageUrl}
                  alt={shop.name}
                  fill
                  className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                
                {/* Ranking Badge */}
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full flex items-center gap-1">
                   <span className="text-primary font-headline text-sm tracking-widest">#{index + 1}</span>
                </div>
              </div>
              
              <div className="p-8 flex flex-col flex-grow relative z-10 -mt-16">
                <div className="flex items-center gap-1 mb-2 bg-black/70 backdrop-blur-md border border-white/20 w-max px-3 py-1 rounded-full">
                  <Star className="w-4 h-4 text-primary fill-primary" />
                  <span className="text-white font-medium text-sm">{shop.rating}</span>
                  <span className="text-white/60 text-xs ml-1">({shop.reviews})</span>
                </div>
                
                <h3 className="text-2xl font-headline text-foreground mb-1 tracking-wide uppercase mt-4">{shop.name}</h3>
                <p className="text-primary text-sm font-medium tracking-widest uppercase mb-4">{shop.specialty}</p>
                
                <div className="flex items-center gap-2 text-muted-foreground font-light text-sm mb-8 mt-auto">
                  <MapPin className="w-4 h-4" />
                  {shop.location}
                </div>

                <div className="pt-6 border-t border-border flex items-center justify-between">
                   <PremiumButton variant="outline" className="w-full flex items-center justify-center gap-2">
                       <Navigation className="w-4 h-4" /> Ver en Mapa
                   </PremiumButton>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center">
            <PremiumButton>Explorar Directorio Completo</PremiumButton>
        </div>
      </div>
    </section>
  );
}
