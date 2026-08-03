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
    <div className="flex flex-col w-full animate-in fade-in duration-700">
      <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-amber-500/10 blur-[70px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center hidden sm:flex">
            <DollarSign className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-headline text-white tracking-widest uppercase">Mis Ganancias</h2>
            <p className="text-white/40 font-light tracking-wide mt-2 text-sm">
              Monitorea tus ingresos y rendimiento diario.
            </p>
          </div>
        </div>
        
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10 relative z-10">
        {stats.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="group relative overflow-hidden rounded-[24px] bg-black/40 border border-white/5 hover:border-amber-500/30 transition-all duration-500 p-6 md:p-8 flex flex-col gap-4 backdrop-blur-xl hover:bg-black/60"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/0 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500 group-hover:scale-110 transform">
              <stat.icon className="w-16 h-16 text-amber-500" />
            </div>
            
            <div className="relative z-10 space-y-2">
              <p className="text-[10px] md:text-xs text-white/50 tracking-[0.2em] uppercase font-medium">{stat.label}</p>
              <h3 className="text-3xl md:text-4xl font-headline text-white group-hover:text-amber-100 transition-colors">{stat.value}</h3>
            </div>
            
            <div className="relative z-10 flex items-center mt-2">
              <div className={`flex items-center gap-1.5 text-[10px] md:text-xs font-headline tracking-widest uppercase px-3 py-1.5 rounded-full border ${stat.positive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                <TrendingUp className={`w-3.5 h-3.5 ${stat.positive ? '' : 'rotate-180'}`} />
                {stat.trend} <span className="hidden sm:inline opacity-70">respecto a ayer</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="space-y-6 relative z-10">
        <h3 className="text-lg md:text-xl font-headline tracking-widest text-white uppercase border-b border-white/10 pb-4">Actividad Reciente</h3>
        <div className="space-y-4">
          {recentTransactions.map((tx, index) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
              key={tx.id} 
              className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 md:p-6 rounded-[20px] bg-black/40 border border-white/5 hover:border-amber-500/20 hover:bg-white/[0.02] transition-all duration-300 backdrop-blur-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white/60 group-hover:text-amber-500 group-hover:border-amber-500/30 group-hover:bg-amber-500/10 transition-colors">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-headline tracking-widest text-sm md:text-base">{tx.type}</h4>
                  <p className="text-xs md:text-sm text-white/40 font-light mt-1">Cliente: <span className="text-white/80">{tx.client}</span> • {tx.time}</p>
                </div>
              </div>
              
              <div className="text-left sm:text-right w-full sm:w-auto pl-16 sm:pl-0">
                <p className="text-lg md:text-xl font-headline text-white tracking-wider">{tx.amount}</p>
                <div className="inline-flex items-center gap-1 mt-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                  <Wallet className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-amber-500 font-headline tracking-widest uppercase">Propina: {tx.tip}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
