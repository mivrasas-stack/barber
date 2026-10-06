"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Clock, Sparkles } from "lucide-react";
import { dummyServices, dummyLocations } from "../data";
import { motion } from "framer-motion";

export default function CustomerServicesPage() {
  const services = dummyServices;

  return (
    <div className="w-full flex flex-col gap-6 font-sans pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between mt-2 mb-4 gap-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-2 text-foreground/90">
            Catálogo de <span className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-600">Servicios</span>
          </h1>
          <p className="text-foreground/40 text-sm md:text-base max-w-xl font-light">
            Explora nuestros tratamientos exclusivos y elige el ideal para ti.
          </p>
        </motion.div>
      </div>

      <div className="flex flex-col gap-12 mt-6">
        {dummyLocations.map((location) => (
          <div key={location.id} className="relative">
            <h2 className="text-2xl font-headline tracking-widest text-foreground uppercase mb-6 flex items-center gap-4">
              <span className="w-12 h-px bg-emerald-500/50"></span>
              {location.name}
              <span className="flex-1 h-px bg-foreground/5"></span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {services.map((service, idx) => (
                <motion.div
                  key={`${location.id}-${service.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                  className="group relative flex flex-col p-6 rounded-[2rem] bg-gradient-to-b from-foreground/[0.04] to-transparent border border-border hover:border-emerald-500/30 transition-all duration-500 overflow-hidden hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]"
                >
                  {/* Background Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-emerald-500/20 transition-colors duration-700" />
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="p-3 bg-foreground/5 rounded-2xl border border-border group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all duration-300 group-hover:rotate-6">
                      <Sparkles className="w-6 h-6 text-emerald-400/80 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <span className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-emerald-500">
                      ${service.price.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  
                  <div className="flex-1 relative z-10">
                    <h3 className="text-xl font-medium text-foreground/90 mb-3 group-hover:text-foreground transition-colors uppercase tracking-wider">{service.name}</h3>
                    <p className="text-sm text-foreground/50 leading-relaxed font-light mb-6">
                      {service.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-5 border-t border-border relative z-10">
                    <div className="flex items-center gap-2 text-foreground/40 group-hover:text-foreground/60 transition-colors">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium tracking-wide">{service.duration} min</span>
                    </div>
                    
                    <Button 
                      variant="outline"
                      className="rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border-emerald-500/20 hover:border-emerald-500 font-medium tracking-wide"
                    >
                      Reservar
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
