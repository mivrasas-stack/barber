"use client";

import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { dummyCustomers } from "../data";
import { User, Phone, Mail, CalendarDays, DollarSign } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Directorio VIP" />
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {dummyCustomers.map((customer) => (
          <motion.div
            key={customer.id}
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl bg-black/50 backdrop-blur-3xl border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all hover:shadow-[0_8px_32px_rgba(255,255,255,0.05)] hover:border-white/20"
          >
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 shadow-inner">
                  <User className="h-5 w-5 text-white/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-white tracking-wide truncate">{customer.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-white/50 mt-0.5">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Contacto</span>
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Phone className="h-3.5 w-3.5 text-white/50" />
                    {customer.phone}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Visitas</span>
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <CalendarDays className="h-3.5 w-3.5 text-white/50" />
                    {customer.totalAppointments} citas
                  </div>
                </div>
              </div>

              <div className="mt-2 rounded-xl bg-white/5 p-4 border border-white/5 flex items-center justify-between group-hover:bg-white/10 transition-colors">
                <span className="text-sm font-medium text-white/60">Inversión Total</span>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-400/80" />
                  <span className="font-semibold text-white text-lg tracking-tight">
                    {customer.totalSpent.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
