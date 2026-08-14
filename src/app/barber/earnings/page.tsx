"use client";
import React from 'react';
import { DollarSign, TrendingUp, Wallet, Scissors, ArrowUpRight } from 'lucide-react';
import { PremiumButton } from '@/components/ui/premium-button';
import { motion } from 'framer-motion';

export default function EarningsPage() {
  const stats = [
    { label: "Ganancias de Hoy", value: "$ 1.250.000 COP", icon: DollarSign, trend: "+15%", positive: true },
    { label: "Cortes Realizados", value: "8", icon: Scissors, trend: "+2", positive: true },
    { label: "Propinas", value: "$ 200.000 COP", icon: Wallet, trend: "-5%", positive: false },
  ];

  const recentTransactions = [
    { id: 1, type: "Corte Clásico", amount: "$ 150.000 COP", tip: "$ 20.000 COP", time: "11:30 AM", client: "David Torres" },
    { id: 2, type: "Corte y Barba", amount: "$ 250.000 COP", tip: "$ 50.000 COP", time: "10:00 AM", client: "Carlos Mendoza" },
    { id: 3, type: "Fade + Cejas", amount: "$ 180.000 COP", tip: "$ 30.000 COP", time: "01:00 PM", client: "Miguel Ángel" },
  ];

  return (
    <div className="flex flex-col w-full min-h-screen animate-in fade-in duration-700 relative pb-20">
      
      {/* Elementos Ambientales (Glows) */}
      <div className="fixed top-0 right-0 w-[50vw] h-[50vw] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none -translate-y-1/2 mix-blend-screen" />

      {/* Header */}
      <div className="mb-10 md:mb-16 flex flex-col relative z-10 text-center">
        <p className="text-emerald-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm mb-4">Balance Diario</p>
        <div className="relative inline-block mx-auto">
          <div className="absolute -inset-4 bg-emerald-500/20 blur-[50px] rounded-full" />
          <h2 className="text-6xl md:text-8xl font-headline text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50 tracking-tight relative z-10 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            $1.250k
          </h2>
        </div>
        <p className="text-white/40 font-light tracking-wide mt-6 text-sm md:text-base flex items-center justify-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 font-medium">+15%</span> vs. ayer
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-16 relative z-10 max-w-4xl mx-auto w-full">
        {stats.slice(1).map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            key={i} 
            className="group relative overflow-hidden rounded-[32px] bg-[#0F0F0F] border border-white/5 hover:border-emerald-500/30 transition-all duration-500 p-8 flex flex-col items-center text-center backdrop-blur-xl hover:bg-[#151515] shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <stat.icon className="w-8 h-8 text-emerald-400" />
            </div>
            
            <div className="relative z-10 space-y-2">
              <p className="text-xs text-white/40 tracking-[0.2em] uppercase font-light">{stat.label}</p>
              <h3 className="text-3xl font-headline text-white group-hover:text-emerald-100 transition-colors">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity - Receipt Style */}
      <div className="relative z-10 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-headline tracking-widest text-white uppercase flex items-center gap-3">
            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
            Transacciones Recientes
          </h3>
          <button className="text-[10px] text-white/40 hover:text-white uppercase tracking-[0.2em] transition-colors border-b border-white/10 hover:border-white pb-1">Ver Historial</button>
        </div>

        <div className="space-y-4">
          {recentTransactions.map((tx, index) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
              key={tx.id} 
              className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-6 px-2 border-b border-white/5 hover:border-emerald-500/30 transition-all duration-300 relative"
            >
              <div className="absolute left-0 w-1 h-full bg-emerald-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center rounded-r-md" />

              <div className="flex items-center gap-6 pl-4 sm:pl-6">
                <span className="text-white/20 font-mono text-sm tracking-widest w-16">{tx.time}</span>
                <div>
                  <h4 className="text-white font-headline tracking-widest text-base group-hover:text-emerald-100 transition-colors">{tx.type}</h4>
                  <p className="text-xs text-white/40 font-light mt-1 tracking-wide">Ref: <span className="text-white/60">{tx.client}</span></p>
                </div>
              </div>
              
              <div className="text-left sm:text-right w-full sm:w-auto pl-[88px] sm:pl-0 pr-4">
                <p className="text-xl font-mono text-white tracking-widest group-hover:text-emerald-400 transition-colors">{tx.amount}</p>
                <div className="flex items-center sm:justify-end gap-1.5 mt-1 text-emerald-500/70 text-[10px] font-headline uppercase tracking-widest">
                  <Wallet className="w-3 h-3" /> Propina incl. {tx.tip}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
