"use client";
import React from 'react';
import { motion } from "framer-motion";
import { Heart, CalendarDays, Star, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { dummyBarbers } from "../data";
import Link from 'next/link';

export default function FavoritosPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans pb-10">
      {/* Background glow */}
      <div className="fixed top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      <div className="flex flex-col mt-2 mb-8 gap-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.2)]">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-headline uppercase tracking-widest text-white/90">
              Mis <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-600">Favoritos</span>
            </h1>
            <p className="text-white/40 text-sm md:text-base font-light tracking-wide mt-1">
              Tus barberos de confianza guardados para acceso rápido.
            </p>
          </div>
        </motion.div>
      </div>

      {dummyBarbers.length > 0 ? (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10"
        >
          {dummyBarbers.map((barber) => (
            <motion.div 
              key={barber.id}
              variants={itemVariants}
              className="group relative flex flex-col items-center p-8 rounded-[2rem] bg-[#0A0A0A] border border-white/5 hover:border-rose-500/30 transition-all duration-500 hover:bg-white/[0.02]"
            >
              {/* Like Button */}
              <button className="absolute top-4 right-4 p-2 text-rose-500 hover:text-white transition-colors">
                <Heart className="w-5 h-5 fill-rose-500" />
              </button>

              <Avatar className="w-24 h-24 border-2 border-rose-500/20 group-hover:border-rose-500/50 shadow-xl transition-colors mb-4">
                <AvatarImage src={barber.avatarUrl} alt={barber.name} />
                <AvatarFallback className="bg-black text-xl font-headline">{barber.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <h3 className="text-xl font-headline tracking-widest uppercase text-white mb-1 group-hover:text-rose-100 transition-colors">
                {barber.name}
              </h3>
              
              <div className="flex items-center gap-1 text-amber-400 mb-6">
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
              </div>

              <div className="w-full space-y-3">
                <Link href={`/clientes/appointments?barber=${barber.id}`} className="block w-full">
                  <Button className="w-full bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-full font-semibold tracking-wide transition-all shadow-[0_4px_20px_rgba(244,63,94,0.1)]">
                    <CalendarDays className="w-4 h-4 mr-2" /> Agendar Cita
                  </Button>
                </Link>
              </div>

            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center relative z-10"
        >
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <Heart className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-2xl font-headline tracking-widest text-white uppercase mb-2">Aún no tienes favoritos</h3>
          <p className="text-white/40 font-light max-w-sm">Explora nuestras barberías y añade a tus barberos preferidos para tenerlos siempre a mano.</p>
        </motion.div>
      )}

    </div>
  );
}
