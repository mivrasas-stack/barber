"use client";

import { motion } from "framer-motion";
import { PremiumButton } from "@/components/ui/premium-button";
import Link from "next/link";

export default function Contact() {
  return (
    <section className="relative py-32 lg:py-48 bg-background overflow-hidden flex items-center justify-center min-h-[80vh]">
      {/* Cinematic Lighting Effect */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full max-h-[400px] bg-primary/15 blur-[120px] rounded-full pointer-events-none" />
      </div>

      <div className="container relative z-10 mx-auto px-6 md:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto space-y-12"
        >
          <h2 className="text-6xl md:text-8xl lg:text-9xl font-bold font-headline text-foreground leading-none tracking-wide">
            ¿LISTO PARA TU <br className="hidden md:block" />
            <span className="text-primary">NUEVO ESTILO?</span>
          </h2>
          
          <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto">
            Únete al selecto grupo de clientes que han descubierto su mejor versión.
          </p>

          <div className="pt-8">
            <PremiumButton asChild size="lg" className="w-full sm:w-auto min-w-[240px]">
              <Link href="/login">Reservar Cita Ahora</Link>
            </PremiumButton>
          </div>
        </motion.div>
      </div>

      {/* Decorative borders */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
}
