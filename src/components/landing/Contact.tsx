"use client";

import { motion } from "framer-motion";
import { PremiumButton } from "@/components/ui/premium-button";
import Link from "next/link";

export default function Contact() {
  return (
    <section className="relative py-32 lg:py-48 bg-background overflow-hidden flex items-center justify-center min-h-[80vh]">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full max-h-[500px] bg-primary/20 blur-[140px] rounded-full pointer-events-none" 
        />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
      </div>

      <div className="container relative z-10 mx-auto px-6 md:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl mx-auto space-y-10 flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs md:text-sm uppercase tracking-widest font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Agenda Abierta
          </div>

          <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold font-headline text-foreground leading-[1.1] tracking-tight">
            ¿LISTO PARA TU <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-yellow-400 to-primary">NUEVO ESTILO?</span>
          </h2>
          
          <p className="text-lg md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
            La excelencia no es un acto, es un hábito. Únete al selecto grupo de clientes que han descubierto su mejor versión.
          </p>

          <div className="pt-8 flex flex-col items-center justify-center gap-6 w-full">
            <div className="relative group w-full sm:w-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-yellow-500 to-primary rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <PremiumButton asChild size="lg" className="relative w-full sm:w-auto min-w-[280px] h-14 text-lg group">
                <Link href="/login" className="flex items-center justify-center gap-3">
                  Reservar Cita Ahora
                  <motion.span 
                    className="inline-block"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    →
                  </motion.span>
                </Link>
              </PremiumButton>
            </div>
            
            <p className="text-sm text-muted-foreground/60 font-medium">
              Cupos limitados disponibles para esta semana
            </p>
          </div>
        </motion.div>
      </div>

      {/* Decorative borders */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </section>
  );
}
