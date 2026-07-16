"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Info } from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";

type BillingCycle = "mensual" | "semestral" | "anual";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("anual");

  const plans = [
    {
      name: "Corte Clásico",
      target: "Barberos independientes",
      desc: "Digitaliza tu agenda y lleva el control de tus ingresos sin complicaciones.",
      price: {
        mensual: 49900,
        semestral: 269000,
        anual: 499000
      },
      features: [
        "Hasta 2 barberos",
        "Agenda inteligente",
        "Reservas online",
        "Recordatorios (Email/App)",
        "Soporte por Email"
      ],
      cta: "Comenzar Ahora",
      highlight: false
    },
    {
      name: "Barber Club",
      target: "Barberías en crecimiento",
      desc: "Automatiza tus procesos, controla a tu equipo y vende más productos.",
      price: {
        mensual: 99900,
        semestral: 539000,
        anual: 999000
      },
      features: [
        "Hasta 7 barberos",
        "Caja y POS",
        "Control de Comisiones",
        "Inventario básico",
        "Confirmaciones WhatsApp"
      ],
      cta: "Subir de Nivel",
      highlight: true,
      badge: "MÁS VENDIDO"
    },
    {
      name: "Black Label",
      target: "Franquicias y VIP",
      desc: "Inteligencia artificial y herramientas corporativas para escalar tu franquicia.",
      price: {
        mensual: 189900,
        semestral: 1025000,
        anual: 1899000
      },
      features: [
        "Usuarios ilimitados",
        "Gestión Multi-sede",
        "Fidelización y Membresías",
        "Inteligencia Artificial",
        "Manager Dedicado"
      ],
      cta: "Contactar Ventas",
      highlight: false,
      badge: "EXPERIENCIA VIP"
    }
  ];

  const compareFeatures = [
    { name: "Usuarios (Barberos)", plans: ["Hasta 2", "Hasta 7", "Ilimitados"] },
    { name: "Sedes", plans: ["1 Sede", "1 Sede", "Múltiples"] },
    { name: "Agenda & Reservas Online", plans: [true, true, true] },
    { name: "Recordatorios App/Email", plans: [true, true, true] },
    { name: "Confirmaciones WhatsApp", plans: [false, "Limitado", "Ilimitado"] },
    { name: "Caja, POS e Inventario", plans: [false, true, true] },
    { name: "Control de Comisiones", plans: [false, true, true] },
    { name: "Roles y Permisos", plans: [false, true, true] },
    { name: "Fidelización / Membresías", plans: [false, false, true] },
    { name: "Inteligencia Artificial", plans: [false, false, true] },
    { name: "Soporte Técnico", plans: ["Email", "Chat Prioritario", "Manager Dedicado 24/7"] },
  ];

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 blur-[150px] rounded-[100%] pointer-events-none" />

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p 
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-primary font-medium tracking-[0.2em] uppercase text-sm mb-4"
          >
            Planes y Precios
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold font-headline text-foreground mb-6 uppercase tracking-wider"
          >
            Invierte en el crecimiento de tu Barbería
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg font-light"
          >
            Diseñado para escalar contigo. Desde el barbero independiente hasta las franquicias más exclusivas de Colombia.
          </motion.p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-16">
          <div className="bg-muted border border-border rounded-full p-1.5 flex items-center gap-1">
            <button 
              onClick={() => setBillingCycle("mensual")}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${billingCycle === "mensual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Mensual
            </button>
            <button 
              onClick={() => setBillingCycle("semestral")}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${billingCycle === "semestral" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Semestral <span className="hidden sm:inline-block ml-1 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">-10%</span>
            </button>
            <button 
              onClick={() => setBillingCycle("anual")}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${billingCycle === "anual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Anual <span className="hidden sm:inline-block ml-1 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">-16%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-32">
          {plans.map((plan, i) => (
            <motion.div 
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`relative rounded-3xl p-8 flex flex-col ${plan.highlight ? 'bg-gradient-to-b from-primary/15 to-primary/5 border-primary border-2 shadow-[0_0_30px_rgba(200,155,60,0.2)] transform lg:-translate-y-4' : 'bg-card border border-border hover:border-foreground/20 shadow-sm'}`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase rounded-full">
                  {plan.badge}
                </div>
              )}
              
              <div className="text-center mb-8 pt-4">
                <h3 className="text-2xl font-headline text-foreground uppercase tracking-wider mb-2">{plan.name}</h3>
                <p className="text-primary/80 text-sm font-medium tracking-wide mb-6">{plan.target}</p>
                <div className="flex justify-center items-end gap-1 mb-4">
                  <span className="text-lg text-muted-foreground mb-1">COP</span>
                  <span className="text-5xl font-bold text-foreground tracking-tight">
                    {plan.price[billingCycle].toLocaleString("es-CO")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  por mes, facturado {billingCycle}mente
                </p>
              </div>

              <p className="text-muted-foreground text-sm font-light text-center mb-8 min-h-[60px]">
                {plan.desc}
              </p>

              <div className="space-y-4 flex-grow mb-8">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 flex-shrink-0 ${plan.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm text-foreground/80 font-light">{feature}</span>
                  </div>
                ))}
              </div>

              <PremiumButton variant={plan.highlight ? "default" : "outline"} className="w-full">
                {plan.cta}
              </PremiumButton>
            </motion.div>
          ))}
        </div>

        {/* Comparison Table */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-headline text-foreground uppercase tracking-widest">Comparar Funciones</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-6 px-4 text-muted-foreground font-medium tracking-wide w-1/3">Características</th>
                  <th className="py-6 px-4 text-center font-headline text-foreground tracking-widest uppercase w-2/9">Corte Clásico</th>
                  <th className="py-6 px-4 text-center font-headline text-primary tracking-widest uppercase w-2/9">Barber Club</th>
                  <th className="py-6 px-4 text-center font-headline text-foreground tracking-widest uppercase w-2/9">Black Label</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {compareFeatures.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/50 transition-colors">
                    <td className="py-5 px-4 text-sm text-foreground/80 font-light">{row.name}</td>
                    {row.plans.map((val, idx) => (
                      <td key={idx} className="py-5 px-4 text-center">
                        {typeof val === 'boolean' ? (
                          val ? <Check className="w-5 h-5 text-primary mx-auto" /> : <X className="w-5 h-5 text-muted-foreground mx-auto" />
                        ) : (
                          <span className="text-sm text-muted-foreground font-light">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
