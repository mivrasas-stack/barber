"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { PremiumButton } from "@/components/ui/premium-button";
import Link from "next/link";

export default function AboutIntro() {
  return (
    <section id="about" className="py-24 lg:py-40 bg-background relative overflow-hidden">
      {/* Decorative subtle lines */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-32 bg-gradient-to-b from-primary/50 to-transparent" />
      
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-10"
          >
            <div>
              <p className="text-primary font-medium tracking-[0.2em] uppercase text-sm mb-4">
                El Manifiesto
              </p>
              <h2 className="text-5xl lg:text-7xl font-bold font-headline text-foreground leading-[1.1]">
                Servicio Más Allá <br />
                <span className="text-muted-foreground">De Las Expectativas</span>
              </h2>
            </div>
            
            <p className="text-muted-foreground text-lg leading-relaxed font-light max-w-xl">
              En BarberParadise, creemos que un corte de pelo es más que una simple tarea rutinaria: es un oficio, una forma de arte y una declaración de estilo personal. 
              <br /><br />
              Fundada en 2007, nos hemos dedicado a brindar una experiencia de aseo premium para el hombre moderno. Nuestros barberos son maestros, combinando técnicas tradicionales con un estilo contemporáneo.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
              <div>
                <h4 className="text-4xl font-headline text-foreground mb-1">+10</h4>
                <p className="text-sm text-muted-foreground tracking-wider uppercase">Años</p>
              </div>
              <div>
                <h4 className="text-4xl font-headline text-foreground mb-1">+5k</h4>
                <p className="text-sm text-muted-foreground tracking-wider uppercase">Clientes</p>
              </div>
              <div>
                <h4 className="text-4xl font-headline text-primary mb-1">4.9★</h4>
                <p className="text-sm text-muted-foreground tracking-wider uppercase">Rating</p>
              </div>
            </div>

            <div className="pt-4">
              <PremiumButton asChild variant="outline">
                <Link href="#portfolio">Ver Galería</Link>
              </PremiumButton>
            </div>
          </motion.div>

          {/* Image Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative aspect-[3/4] w-full max-w-md mx-auto lg:max-w-none lg:ml-auto">
              <Image
                src="https://images.pexels.com/photos/1570807/pexels-photo-1570807.jpeg"
                alt="Premium Barber Experience"
                fill
                className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
              />
              {/* Decorative Frame */}
              <div className="absolute -inset-4 border border-border z-[-1] hidden md:block" />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary/20 blur-3xl z-[-1]" />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}