"use client";

import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Link from "next/link";
import { motion } from "framer-motion";
import { PremiumButton } from "@/components/ui/premium-button";
import { ChevronDown } from "lucide-react";

export default function Hero() {
  const heroImage = PlaceHolderImages.find((p) => p.id === "hero-barber");

  return (
    <section id="home" className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Image with Parallax & Zoom effect */}
      {heroImage && (
        <motion.div 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: "easeOut" }}
          className="absolute inset-0 z-0"
        >
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        </motion.div>
      )}

      {/* Dark Luxury Overlay - strong enough for both light and dark themes */}
      <div className="absolute inset-0 z-10 bg-black/50" />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />

      {/* Content */}
      <div className="relative z-20 flex h-full w-full flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 max-w-5xl"
        >
          <p className="text-primary font-medium tracking-[0.3em] uppercase text-sm md:text-base">
            Estilo & Perfección
          </p>
          
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-headline font-bold text-white leading-[0.9] tracking-tight">
            NO HACEMOS CORTES <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40">
              CREAMOS IDENTIDAD
            </span>
          </h1>

          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed mt-8">
            Experimenta el arte del grooming tradicional combinado con la sofisticación moderna en un ambiente de absoluta exclusividad.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 flex flex-col sm:flex-row items-center gap-6"
        >
          <PremiumButton asChild size="lg">
            <Link href="/login">Reservar Cita</Link>
          </PremiumButton>
          <PremiumButton asChild variant="glass" size="lg">
            <Link href="#services">Ver Servicios</Link>
          </PremiumButton>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
      >
        <span className="text-white/60 text-xs tracking-widest uppercase">Descubrir</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="text-primary w-5 h-5" />
        </motion.div>
      </motion.div>
    </section>
  );
}
