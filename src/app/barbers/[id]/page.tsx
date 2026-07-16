"use client";

import React, { useState } from 'react';
import Image from "next/image";
import { Star, MapPin, Play, Calendar, Scissors, Award, X } from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

// Mock Data
const barber = {
  id: "1",
  name: "Carlos Mendoza",
  role: "Master Barber",
  rating: 4.9,
  reviews: 128,
  experience: "8 años",
  location: "Sucursal Centro",
  avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=500&auto=format&fit=crop",
  bio: "Especialista en desvanecidos clásicos y texturas modernas. Mi objetivo es que cada cliente salga sintiéndose la mejor versión de sí mismo.",
  portfolio: [
    { id: 1, type: "video", url: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=800&auto=format&fit=crop", description: "Corte Texturizado en movimiento. #MidFade #TexturedCrop" },
    { id: 2, type: "photo", url: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=800&auto=format&fit=crop", description: "Classic Pompadour con barba perfilada." },
    { id: 3, type: "photo", url: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=800&auto=format&fit=crop", description: "Buzz cut de precisión." },
    { id: 4, type: "video", url: "https://images.unsplash.com/photo-1593702288056-ccbfb45fbdcc?q=80&w=800&auto=format&fit=crop", description: "Diseño y freestyle." },
    { id: 5, type: "photo", url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop", description: "Low fade perfecto." },
    { id: 6, type: "photo", url: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=800&auto=format&fit=crop", description: "Mullet moderno." },
  ]
};

export default function BarberProfilePage() {
  const [selectedMedia, setSelectedMedia] = useState<typeof barber.portfolio[0] | null>(null);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-20">
      
      {/* Background Decor */}
      <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-primary/10 via-background to-background pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <main className="container mx-auto px-4 pt-24 relative z-10 max-w-6xl">
        
        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col md:flex-row gap-8 items-center md:items-start"
        >
          {/* Avatar Container */}
          <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl shrink-0 group">
            <Image 
              src={barber.avatar} 
              alt={barber.name} 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
            <div className="absolute bottom-4 left-0 w-full flex justify-center gap-1">
               <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
               <span className="text-white font-bold">{barber.rating}</span>
               <span className="text-white/60 text-sm">({barber.reviews})</span>
            </div>
          </div>

          {/* Info Container */}
          <div className="flex-1 text-center md:text-left space-y-6">
            <div>
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                <h1 className="text-4xl md:text-6xl font-headline text-white tracking-widest uppercase">
                  {barber.name}
                </h1>
                <Badge className="bg-primary/20 text-primary border-primary/30 uppercase tracking-widest font-headline">
                  {barber.role}
                </Badge>
              </div>
              <p className="text-white/70 text-lg md:text-xl font-light max-w-2xl mx-auto md:mx-0">
                {barber.bio}
              </p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-white/60">
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <MapPin className="w-4 h-4 text-primary" /> {barber.location}
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <Award className="w-4 h-4 text-primary" /> {barber.experience}
              </div>
            </div>

            <div className="pt-4 flex justify-center md:justify-start">
              <PremiumButton className="flex items-center gap-2 px-8 py-6 text-lg">
                <Calendar className="w-5 h-5" />
                Agendar Cita
              </PremiumButton>
            </div>
          </div>
        </motion.div>

        <div className="w-full h-[1px] bg-white/10 my-16" />

        {/* Portfolio Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-headline text-white tracking-widest uppercase flex items-center gap-3">
                <Scissors className="w-8 h-8 text-primary" />
                Portafolio
              </h2>
              <p className="text-white/60 font-light mt-2">Descubre los últimos trabajos y estilos.</p>
            </div>
          </div>

          {/* Masonry-like Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {barber.portfolio.map((item, idx) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/50 transition-colors"
                onClick={() => setSelectedMedia(item)}
              >
                <Image 
                  src={item.url} 
                  alt={item.description}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                
                {/* Video Indicator */}
                {item.type === 'video' && (
                  <div className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                    <Play className="w-4 h-4 text-white ml-1" />
                  </div>
                )}

                <div className="absolute bottom-0 inset-x-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white font-light text-sm line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </main>

      {/* Fullscreen Media Modal */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl"
            onClick={() => setSelectedMedia(null)}
          >
            <button 
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-50"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMedia(null);
              }}
            >
              <X className="w-6 h-6" />
            </button>
            
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-4xl max-h-[80vh] aspect-[4/5] md:aspect-video rounded-3xl overflow-hidden bg-black border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
               <Image 
                  src={selectedMedia.url} 
                  alt={selectedMedia.description}
                  fill
                  className="object-contain"
                />
                
                {/* Simulated Video Player UI if video */}
                {selectedMedia.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="w-20 h-20 bg-primary/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary),0.5)]">
                        <Play className="w-8 h-8 text-white ml-2" />
                     </div>
                  </div>
                )}

                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-8">
                  <p className="text-white text-lg font-light max-w-2xl">
                    {selectedMedia.description}
                  </p>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
