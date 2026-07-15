"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, DollarSign, TrendingUp, Wallet, Scissors } from 'lucide-react';
import { PremiumButton } from '@/components/ui/premium-button';

export default function EarningsPage() {
  const stats = [
    { label: "Ganancias de Hoy", value: "$1,250", icon: DollarSign, trend: "+15%", positive: true },
    { label: "Cortes Realizados", value: "8", icon: Scissors, trend: "+2", positive: true },
    { label: "Propinas", value: "$200", icon: Wallet, trend: "-5%", positive: false },
  ];

  const recentTransactions = [
    { id: 1, type: "Corte Clásico", amount: "$150", tip: "$20", time: "11:30 AM", client: "David Torres" },
    { id: 2, type: "Corte y Barba", amount: "$250", tip: "$50", time: "10:00 AM", client: "Carlos Mendoza" },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-white/5 py-6">
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
            <Link href="/barber" className="text-white/60 hover:text-white transition-colors flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-light tracking-widest uppercase hidden sm:block">Volver</span>
            </Link>
            <h1 className="text-xl font-headline tracking-widest text-primary uppercase">Ganancias</h1>
            <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-6 md:px-12 py-12 flex-1 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-headline text-white tracking-widest uppercase">Resumen Financiero</h2>
            <p className="text-muted-foreground font-light tracking-wide mt-2">Monitorea tus ingresos y rendimiento diario.</p>
          </div>
          <PremiumButton variant="outline" className="hidden md:flex">
            Retirar Fondos
          </PremiumButton>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {stats.map((stat, i) => (
            <div key={i} className="relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/5 p-8 flex flex-col gap-4">
              <div className="absolute top-0 right-0 p-6 opacity-20">
                <stat.icon className="w-16 h-16 text-primary" />
              </div>
              <div className="relative z-10 space-y-1">
                <p className="text-xs text-white/50 tracking-[0.2em] uppercase">{stat.label}</p>
                <h3 className="text-4xl font-headline text-white">{stat.value}</h3>
              </div>
              <div className="relative z-10 flex items-center gap-2 mt-2">
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${stat.positive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  <TrendingUp className={`w-3 h-3 ${stat.positive ? '' : 'rotate-180'}`} />
                  {stat.trend} respecto a ayer
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <h3 className="text-xl font-headline tracking-widest text-white uppercase border-b border-white/10 pb-4">Actividad Reciente</h3>
          <div className="space-y-4">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium tracking-wide">{tx.type}</h4>
                    <p className="text-xs text-muted-foreground">Cliente: {tx.client} • {tx.time}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto pl-16 sm:pl-0">
                  <p className="text-xl font-headline text-white">{tx.amount}</p>
                  <p className="text-xs text-primary">Propina: {tx.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
