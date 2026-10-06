"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Activity, TrendingUp, Users, Scissors, Star, Calendar, 
  CalendarDays, Wallet, DollarSign, ArrowUpRight, CheckCircle2, 
  ArrowRight, ShieldCheck, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumButton } from '@/components/ui/premium-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MetricsPage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('dia');
  const [customDate, setCustomDate] = useState<string>(todayStr);
  const [viewTab, setViewTab] = useState<'performance' | 'accounting'>('accounting');

  // Datos simulados según día seleccionado
  const isToday = customDate === todayStr;

  const accountingMetrics = [
    { 
      title: "Ganancia Barbero (Hoy)", 
      value: isToday ? "$ 240.000 COP" : "$ 195.000 COP", 
      icon: DollarSign, 
      trend: isToday ? "+18%" : "+5%", 
      positive: true,
      desc: "Comisión neta por cortes y servicios"
    },
    { 
      title: "Cortes Realizados", 
      value: isToday ? "7 cortes" : "5 cortes", 
      icon: Scissors, 
      trend: isToday ? "3 pendientes" : "Finalizados", 
      positive: true,
      desc: "Servicios atendidos en el día"
    },
    { 
      title: "Propinas del Día", 
      value: isToday ? "$ 45.000 COP" : "$ 30.000 COP", 
      icon: Wallet, 
      trend: "100% Barbero", 
      positive: true,
      desc: "Entregadas directamente al profesional"
    },
    { 
      title: "Ticket Promedio", 
      value: "$ 57.000 COP", 
      icon: Activity, 
      trend: "+12%", 
      positive: true,
      desc: "Promedio por cliente atendido"
    },
  ];

  const performanceMetrics = [
    { title: "Retención de Clientes", value: "85%", icon: Users, trend: "+5%", positive: true, desc: "Clientes que vuelven al mes" },
    { title: "Servicio más popular", value: "Corte y Barba", icon: Scissors, trend: "40% del total", positive: true, desc: "Mayor demanda en agenda" },
    { title: "Calificación Promedio", value: "4.9 ★", icon: Star, trend: "+0.1", positive: true, desc: "Basado en 210 opiniones" },
    { title: "Días más ocupados", value: "Viernes, Sábado", icon: Calendar, trend: "Estable", positive: true, desc: "Pico de citas en la semana" },
  ];

  const activeList = viewTab === 'accounting' ? accountingMetrics : performanceMetrics;

  return (
    <div className="flex flex-col w-full min-h-screen animate-in fade-in duration-700 relative pb-20">
      {/* Elementos Ambientales */}
      <div className="fixed top-1/4 right-0 w-[40vw] h-[40vw] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
      <div className="fixed bottom-0 left-0 w-[50vw] h-[50vw] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <p className="text-purple-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm">Rendimiento & Balances</p>
          </div>
          <h2 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Centro de <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-purple-500 to-purple-700 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">Métricas</span>
          </h2>
          <p className="text-foreground/40 font-light tracking-wide mt-2 text-sm md:text-base">
            Monitorea el rendimiento del local y tu contabilidad personal filtrada por día.
          </p>
        </div>

        {/* Filtros de Tiempo con Filtro por Día */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="bg-card border-border text-foreground rounded-2xl px-5 h-12 text-xs font-headline tracking-wider uppercase backdrop-blur-md w-full sm:w-[180px] shadow-inner">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-purple-400" />
                <SelectValue placeholder="Periodo" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground rounded-2xl text-xs font-headline uppercase">
              <SelectItem value="dia">Filtrar por Día</SelectItem>
              <SelectItem value="este_mes">Este Mes</SelectItem>
              <SelectItem value="mes_pasado">Mes Pasado</SelectItem>
              <SelectItem value="este_año">Este Año</SelectItem>
            </SelectContent>
          </Select>

          {selectedPeriod === 'dia' && (
            <Input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="bg-card border-border rounded-2xl h-12 text-xs font-headline tracking-wider w-full sm:w-auto px-4 shadow-inner"
            />
          )}

          <Link href="/barber/accounting">
            <PremiumButton className="whitespace-nowrap px-6 h-12 text-xs uppercase tracking-widest font-headline">
              Ver Contabilidad Completa
            </PremiumButton>
          </Link>
        </div>
      </div>

      {/* Tabs de Selección: Contabilidad del Barbero vs Rendimiento Operativo */}
      <div className="flex items-center justify-between gap-4 mb-8 relative z-10 flex-wrap">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-card border border-border shadow-lg">
          <button
            onClick={() => setViewTab('accounting')}
            className={`px-5 py-2.5 rounded-xl text-xs font-headline tracking-widest uppercase transition-all flex items-center gap-2 ${
              viewTab === 'accounting'
                ? 'bg-amber-500 text-black font-bold shadow-md'
                : 'text-foreground/50 hover:text-foreground'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Contabilidad del Barbero
          </button>

          <button
            onClick={() => setViewTab('performance')}
            className={`px-5 py-2.5 rounded-xl text-xs font-headline tracking-widest uppercase transition-all flex items-center gap-2 ${
              viewTab === 'performance'
                ? 'bg-purple-600 text-white font-bold shadow-md'
                : 'text-foreground/50 hover:text-foreground'
            }`}
          >
            <Activity className="w-4 h-4" />
            Rendimiento del Negocio
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-foreground/40 font-mono">
          <span>Día auditado:</span>
          <span className="text-amber-400 font-bold">{customDate}</span>
        </div>
      </div>

      {/* KPI Cards Dinámicas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10 mb-12">
        {activeList.map((metric, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, type: "spring", stiffness: 100 }}
            key={index} 
            className="group relative overflow-hidden rounded-[32px] bg-card border border-border hover:border-purple-500/30 transition-all duration-500 p-7 flex flex-col justify-between backdrop-blur-xl shadow-2xl hover:bg-foreground/5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="flex items-start justify-between relative z-10 mb-4">
                <div className="w-13 h-13 rounded-2xl bg-foreground/5 border border-border flex items-center justify-center group-hover:bg-purple-500/10 group-hover:border-purple-500/30 transition-all duration-500 shadow-inner group-hover:scale-110 p-3">
                    <metric.icon className="w-6 h-6 text-foreground/60 group-hover:text-purple-400 transition-colors" />
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-headline tracking-widest uppercase px-3 py-1.5 rounded-full border ${metric.positive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    <TrendingUp className={`w-3 h-3 ${metric.positive ? '' : 'rotate-180'}`} />
                    {metric.trend}
                </div>
            </div>
            
            <div className="relative z-10 pt-4 border-t border-border/60">
              <p className="text-[10px] text-foreground/40 tracking-[0.2em] uppercase font-headline mb-1">{metric.title}</p>
              <h3 className="text-2xl sm:text-3xl font-headline text-foreground group-hover:text-purple-100 transition-colors font-mono">{metric.value}</h3>
              <p className="text-[11px] text-foreground/40 mt-1 font-light">{metric.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Banner / Acceso Rápido a la Contabilidad Detallada */}
      <div className="relative z-10 p-8 rounded-[32px] bg-gradient-to-r from-emerald-500/10 via-card to-amber-500/10 border border-emerald-500/30 shadow-2xl mb-12 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-headline tracking-[0.25em] uppercase text-emerald-400">
              Cierre de Caja & Liquidación
            </span>
          </div>
          <h3 className="text-2xl font-headline tracking-widest uppercase text-foreground">
            Módulo Completo de Contabilidad & Facturación
          </h3>
          <p className="text-xs text-foreground/60 font-light max-w-xl">
            Gestiona arqueos diarios de caja, pagos en Efectivo, Nequi y Daviplata, comisiones automáticas por barbero y desglose de egresos.
          </p>
        </div>

        <Link href="/barber/accounting" className="shrink-0">
          <PremiumButton className="h-12 px-8 flex items-center gap-2 text-xs uppercase font-headline tracking-widest">
            <span>Ir a Contabilidad</span>
            <ArrowRight className="w-4 h-4" />
          </PremiumButton>
        </Link>
      </div>

      {/* Gráfico de Evolución */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
        className="w-full h-[380px] rounded-[40px] bg-card border border-border backdrop-blur-xl p-8 md:p-10 flex flex-col relative overflow-hidden shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h3 className="text-lg font-headline tracking-widest text-foreground uppercase">Evolución de Servicios & Ingresos</h3>
            <p className="text-xs text-foreground/40 font-light mt-0.5">Comparativa semanal de citas completadas</p>
          </div>
          <span className="text-[10px] font-headline tracking-[0.2em] uppercase text-purple-400 border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 rounded-full">
            Auditoría Semanal
          </span>
        </div>
        
        <div className="flex-1 w-full flex items-end justify-between gap-3 md:gap-6 relative z-10">
            {[45, 60, 50, 85, 70, 95, 80, 110, 90, 120, 105, 130].map((height, i) => (
                <div key={i} className="w-full bg-foreground/5 hover:bg-gradient-to-t hover:from-purple-600 hover:to-amber-500 transition-all duration-500 rounded-t-xl relative group cursor-pointer shadow-inner" style={{ height: `${height}%` }}>
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-card text-foreground text-[10px] py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-border font-headline tracking-widest shadow-2xl">
                        {height * 12} Citas
                    </div>
                </div>
            ))}
        </div>
        <div className="flex justify-between w-full mt-4 text-[10px] text-foreground/30 font-headline uppercase tracking-widest pt-3 border-t border-border">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mié</span>
          <span>Jue</span>
          <span>Vie</span>
          <span>Sáb</span>
          <span>Dom</span>
        </div>
      </motion.div>
    </div>
  );
}
