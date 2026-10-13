"use client";
import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Wallet, DollarSign, TrendingUp, TrendingDown, Calendar, 
  Filter, Download, Scissors, User, CreditCard, Banknote, 
  ArrowUpRight, ArrowDownRight, PlusCircle, CheckCircle2, 
  FileSpreadsheet, Sparkles, AlertCircle, PieChart, ShieldCheck,
  Activity, Star, Users, CalendarDays, BarChart3
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PremiumButton } from '@/components/ui/premium-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { dummyBarbers } from '@/app/clientes/data';
import type { Transaction } from '@/lib/types';
import { format, subDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

// Transacciones y servicios registrados
interface AccountingItem {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  client: string;
  service: string;
  barberId: string;
  barberName: string;
  totalAmount: number;
  commissionRate: number; // e.g. 60%
  barberCommission: number;
  shopRevenue: number;
  tip: number;
  paymentMethod: 'Efectivo' | 'Nequi' | 'Daviplata' | 'Tarjeta';
  type: 'Ingreso' | 'Gasto';
  category: 'Servicio' | 'Producto' | 'Gasto Operativo';
}

const INITIAL_TRANSACTIONS: AccountingItem[] = [
  {
    id: 'TX-101',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:30 AM',
    client: 'Carlos Mendoza Jr.',
    service: 'Corte y Barba',
    barberId: 'BBR001',
    barberName: 'Carlos Mendoza',
    totalAmount: 65000,
    commissionRate: 60,
    barberCommission: 39000,
    shopRevenue: 26000,
    tip: 10000,
    paymentMethod: 'Efectivo',
    type: 'Ingreso',
    category: 'Servicio',
  },
  {
    id: 'TX-102',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '11:00 AM',
    client: 'Andrés Gil',
    service: 'Corte Clásico',
    barberId: 'BBR001',
    barberName: 'Carlos Mendoza',
    totalAmount: 40000,
    commissionRate: 60,
    barberCommission: 24000,
    shopRevenue: 16000,
    tip: 5000,
    paymentMethod: 'Nequi',
    type: 'Ingreso',
    category: 'Servicio',
  },
  {
    id: 'TX-103',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '12:15 PM',
    client: 'Felipe Jaramillo',
    service: 'Fade + Freestyle',
    barberId: 'BBR003',
    barberName: 'Miguel Ángel Torres',
    totalAmount: 50000,
    commissionRate: 55,
    barberCommission: 27500,
    shopRevenue: 22500,
    tip: 8000,
    paymentMethod: 'Daviplata',
    type: 'Ingreso',
    category: 'Servicio',
  },
  {
    id: 'TX-104',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '02:00 PM',
    client: 'Insumos Barbería',
    service: 'Hojillas, alcohol y toallas desechables',
    barberId: 'BBR001',
    barberName: 'Carlos Mendoza',
    totalAmount: 35000,
    commissionRate: 0,
    barberCommission: 0,
    shopRevenue: -35000,
    tip: 0,
    paymentMethod: 'Efectivo',
    type: 'Gasto',
    category: 'Gasto Operativo',
  },
  {
    id: 'TX-105',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '03:45 PM',
    client: 'Camilo Restrepo',
    service: 'Afeitado tradicional con toalla caliente',
    barberId: 'BBR002',
    barberName: 'Roberto Gómez',
    totalAmount: 35000,
    commissionRate: 50,
    barberCommission: 17500,
    shopRevenue: 17500,
    tip: 5000,
    paymentMethod: 'Tarjeta',
    type: 'Ingreso',
    category: 'Servicio',
  },
  {
    id: 'TX-106',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '05:00 PM',
    client: 'Esteban Loaiza',
    service: 'Corte + Barba + Exfoliación',
    barberId: 'BBR001',
    barberName: 'Carlos Mendoza',
    totalAmount: 80000,
    commissionRate: 60,
    barberCommission: 48000,
    shopRevenue: 32000,
    tip: 15000,
    paymentMethod: 'Nequi',
    type: 'Ingreso',
    category: 'Servicio',
  },
  {
    id: 'TX-099',
    date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    time: '04:30 PM',
    client: 'Sebastián Osorio',
    service: 'Corte Clásico',
    barberId: 'BBR001',
    barberName: 'Carlos Mendoza',
    totalAmount: 40000,
    commissionRate: 60,
    barberCommission: 24000,
    shopRevenue: 16000,
    tip: 5000,
    paymentMethod: 'Efectivo',
    type: 'Ingreso',
    category: 'Servicio',
  },
];

export default function AccountingPage() {
  const searchParams = useSearchParams();
  const preselectedBarberId = searchParams.get('barberId');

  // Filtros
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedBarber, setSelectedBarber] = useState<string>(preselectedBarberId || 'all');
  const [viewMode, setViewMode] = useState<'barber' | 'general'>('general');
  const [activeMainTab, setActiveMainTab] = useState<'accounting' | 'metrics'>('accounting');
  const [transactions, setTransactions] = useState<AccountingItem[]>(INITIAL_TRANSACTIONS);

  // Modal para agregar gasto o ingreso manual
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newExpenseData, setNewExpenseData] = useState({
    description: '',
    amount: '',
    type: 'Gasto' as 'Ingreso' | 'Gasto',
    paymentMethod: 'Efectivo' as 'Efectivo' | 'Nequi' | 'Daviplata' | 'Tarjeta',
  });

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Filtrado por fecha y por barbero
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesDate = tx.date === selectedDate;
      const matchesBarber = selectedBarber === 'all' || tx.barberId === selectedBarber;
      return matchesDate && matchesBarber;
    });
  }, [transactions, selectedDate, selectedBarber]);

  // Totales y cálculos para el día seleccionado
  const stats = useMemo(() => {
    let totalGrossIncome = 0;
    let totalExpenses = 0;
    let totalBarberCommissions = 0;
    let totalTips = 0;
    let paymentBreakdown = {
      Efectivo: 0,
      Nequi: 0,
      Daviplata: 0,
      Tarjeta: 0,
    };

    filteredTransactions.forEach(tx => {
      if (tx.type === 'Ingreso') {
        totalGrossIncome += tx.totalAmount;
        totalBarberCommissions += tx.barberCommission;
        totalTips += tx.tip;
        paymentBreakdown[tx.paymentMethod] += tx.totalAmount + tx.tip;
      } else {
        totalExpenses += tx.totalAmount;
      }
    });

    const netShopProfit = totalGrossIncome - totalBarberCommissions - totalExpenses;
    const totalToBarber = totalBarberCommissions + totalTips;

    return {
      totalGrossIncome,
      totalExpenses,
      totalBarberCommissions,
      totalTips,
      netShopProfit,
      totalToBarber,
      paymentBreakdown,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const handleAddManualExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseData.description || !newExpenseData.amount) return;

    const amt = parseFloat(newExpenseData.amount);
    const newTx: AccountingItem = {
      id: `TX-${Date.now().toString().slice(-4)}`,
      date: selectedDate,
      time: format(new Date(), 'hh:mm a'),
      client: newExpenseData.description,
      service: newExpenseData.description,
      barberId: selectedBarber !== 'all' ? selectedBarber : 'BBR001',
      barberName: dummyBarbers.find(b => b.id === (selectedBarber !== 'all' ? selectedBarber : 'BBR001'))?.name || 'Carlos Mendoza',
      totalAmount: amt,
      commissionRate: 0,
      barberCommission: 0,
      shopRevenue: newExpenseData.type === 'Ingreso' ? amt : -amt,
      tip: 0,
      paymentMethod: newExpenseData.paymentMethod,
      type: newExpenseData.type,
      category: 'Gasto Operativo',
    };

    setTransactions(prev => [newTx, ...prev]);
    setIsExpenseModalOpen(false);
    setNewExpenseData({ description: '', amount: '', type: 'Gasto', paymentMethod: 'Efectivo' });
    showNotification(`Movimiento de ${newExpenseData.type} registrado en caja.`);
  };

  const handleExportDailyReport = () => {
    // Generar formato CSV para descarga directa de arqueo de caja
    const headers = "ID,Fecha,Hora,Cliente,Servicio,Barbero,Total,ComisionBarbero,Propina,MetodoPago,Tipo\n";
    const rows = filteredTransactions.map(tx => 
      `"${tx.id}","${tx.date}","${tx.time}","${tx.client}","${tx.service}","${tx.barberName}",${tx.totalAmount},${tx.barberCommission},${tx.tip},"${tx.paymentMethod}","${tx.type}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Arqueo-Caja-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Reporte contable del día exportado con éxito.');
  };

  const activeBarberObj = dummyBarbers.find(b => b.id === selectedBarber);

  return (
    <div className="flex flex-col w-full min-h-screen animate-in fade-in duration-700 relative pb-20">
      {/* Glows de ambiente */}
      <div className="fixed top-0 right-1/4 w-[50vw] h-[50vw] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

      {/* Alerta flotante */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 right-8 z-50 px-6 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 shadow-2xl flex items-center gap-3 backdrop-blur-xl"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-headline tracking-widest uppercase">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-emerald-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm">
              Gestión Financiera & Cierre de Caja
            </p>
          </div>
          <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Módulo de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-600 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">Contabilidad</span>
          </h1>
          <p className="text-foreground/40 font-light tracking-wide mt-2 text-sm md:text-base">
            Auditoría diaria, comisiones de barberos, métodos de pago y arqueo de caja en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportDailyReport}
            className="rounded-2xl h-14 px-6 border-border flex items-center gap-2 text-xs font-headline uppercase tracking-wider hover:bg-foreground/5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Exportar Día
          </Button>

          <PremiumButton
            onClick={() => setIsExpenseModalOpen(true)}
            className="h-14 px-6 flex items-center gap-2 text-xs font-headline uppercase tracking-widest"
          >
            <PlusCircle className="w-4 h-4" />
            Registrar Gasto / Ingreso
          </PremiumButton>
        </div>
      </div>

      {/* Pestañas Principales: Contabilidad vs Métricas */}
      <div className="flex items-center gap-3 mb-8 relative z-10 p-1.5 rounded-2xl bg-card border border-border w-fit shadow-lg">
        <button
          onClick={() => setActiveMainTab('accounting')}
          className={`px-6 py-3 rounded-xl text-xs font-headline tracking-widest uppercase transition-all flex items-center gap-2.5 ${
            activeMainTab === 'accounting'
              ? 'bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20'
              : 'text-foreground/50 hover:text-foreground'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Contabilidad & Arqueo
        </button>

        <button
          onClick={() => setActiveMainTab('metrics')}
          className={`px-6 py-3 rounded-xl text-xs font-headline tracking-widest uppercase transition-all flex items-center gap-2.5 ${
            activeMainTab === 'metrics'
              ? 'bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/20'
              : 'text-foreground/50 hover:text-foreground'
          }`}
        >
          <Activity className="w-4 h-4" />
          Métricas & Analítica
        </button>
      </div>

      {activeMainTab === 'accounting' ? (
        <>
          {/* Barra de Filtro Principal: Filtro por Día y Vista Barbero / Dueño */}
          <div className="rounded-[32px] bg-card border border-border p-6 md:p-8 backdrop-blur-2xl shadow-xl mb-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
              
              {/* Selector de Fecha Diaria con Acciones Rápidas */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    Filtrar por Día Exacto:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedDate(todayStr)}
                      className={`text-[10px] font-headline uppercase px-3 py-1 rounded-lg border transition-colors ${
                        selectedDate === todayStr ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'border-border text-foreground/40 hover:text-foreground'
                      }`}
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() => setSelectedDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'))}
                      className={`text-[10px] font-headline uppercase px-3 py-1 rounded-lg border transition-colors ${
                        selectedDate === format(subDays(new Date(), 1), 'yyyy-MM-dd') ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'border-border text-foreground/40 hover:text-foreground'
                      }`}
                    >
                      Ayer
                    </button>
                  </div>
                </div>

                <Input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-foreground/5 border-border rounded-2xl h-12 text-sm font-headline tracking-wider focus-visible:ring-emerald-500/50 shadow-inner"
                />
              </div>

              {/* Filtro por Barbero */}
              <div className="space-y-2 flex-1">
                <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-amber-500" />
                  Filtrar por Barbero:
                </span>
                <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                  <SelectTrigger className="bg-foreground/5 border-border rounded-2xl h-12 text-xs font-headline tracking-wider uppercase">
                    <SelectValue placeholder="Todos los barberos" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground rounded-2xl">
                    <SelectItem value="all">Toda la Barbería (Consolidado)</SelectItem>
                    {dummyBarbers.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.commissionRate || 50}% comisión)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle de Perspectiva: Barbero vs Dueño */}
              <div className="space-y-2">
                <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 block">
                  Perspectiva Contable:
                </span>
                <div className="flex items-center gap-2 p-1 rounded-2xl bg-foreground/5 border border-border">
                  <button
                    type="button"
                    onClick={() => setViewMode('general')}
                    className={`px-4 py-2 rounded-xl text-xs font-headline tracking-wider uppercase transition-all ${
                      viewMode === 'general'
                        ? 'bg-emerald-500 text-black font-bold shadow-md'
                        : 'text-foreground/50 hover:text-foreground'
                    }`}
                  >
                    Caja General
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('barber')}
                    className={`px-4 py-2 rounded-xl text-xs font-headline tracking-wider uppercase transition-all ${
                      viewMode === 'barber'
                        ? 'bg-amber-500 text-black font-bold shadow-md'
                        : 'text-foreground/50 hover:text-foreground'
                    }`}
                  >
                    Mi Contabilidad
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Tarjetas de Balance Según la Perspectiva Seleccionada */}
          {viewMode === 'barber' ? (
            /* VISTA BARBERO: MI CONTABILIDAD PERSONAL */
            <div className="space-y-6 mb-8 relative z-10">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-amber-500/30">
                    <AvatarImage src={dummyBarbers[0].avatarUrl} alt="Carlos" />
                    <AvatarFallback>CM</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-headline tracking-wider uppercase text-amber-300">
                      Contabilidad Personal de: {activeBarberObj ? activeBarberObj.name : 'Carlos Mendoza'}
                    </p>
                    <p className="text-[10px] text-foreground/40 font-light">
                      Liquidación por servicios prestados y propinas del día {selectedDate}.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-headline uppercase tracking-widest border border-amber-500/40">
                  {activeBarberObj?.commissionRate || 60}% Comisión
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="p-6 rounded-[28px] bg-card border border-border backdrop-blur-xl shadow-xl">
                  <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 block">Total Facturado en Servicios</span>
                  <h3 className="text-3xl font-headline text-foreground mt-2 font-mono">
                    ${stats.totalGrossIncome.toLocaleString('es-CO')} COP
                  </h3>
                  <p className="text-xs text-foreground/40 mt-1 font-light">
                    {filteredTransactions.filter(t => t.type === 'Ingreso').length} servicios completados
                  </p>
                </div>

                <div className="p-6 rounded-[28px] bg-card border border-amber-500/30 backdrop-blur-xl shadow-xl bg-amber-500/5">
                  <span className="text-[10px] font-headline tracking-widest uppercase text-amber-400 block">Mi Comisión Ganada Hoy</span>
                  <h3 className="text-3xl font-headline text-amber-300 mt-2 font-mono">
                    ${stats.totalBarberCommissions.toLocaleString('es-CO')} COP
                  </h3>
                  <p className="text-xs text-amber-400/60 mt-1 font-light">
                    Porcentaje correspondiente de cortes
                  </p>
                </div>

                <div className="p-6 rounded-[28px] bg-card border border-border backdrop-blur-xl shadow-xl">
                  <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 block">Propinas Recibidas (100%)</span>
                  <h3 className="text-3xl font-headline text-emerald-400 mt-2 font-mono">
                    ${stats.totalTips.toLocaleString('es-CO')} COP
                  </h3>
                  <p className="text-xs text-foreground/40 mt-1 font-light">
                    Directo al barbero sin deducciones
                  </p>
                </div>

                <div className="p-6 rounded-[28px] bg-card border-2 border-emerald-500/50 backdrop-blur-xl shadow-2xl bg-emerald-500/10">
                  <span className="text-[10px] font-headline tracking-widest uppercase text-emerald-300 block">Total Neto a Cobrar Hoy</span>
                  <h3 className="text-3xl font-headline text-emerald-300 mt-2 font-mono font-bold">
                    ${stats.totalToBarber.toLocaleString('es-CO')} COP
                  </h3>
                  <p className="text-xs text-emerald-400/80 mt-1 font-headline uppercase tracking-wider">
                    Comisión + Propinas
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* VISTA DUEÑO: CAJA GENERAL DE LA BARBERÍA */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 relative z-10">
              <div className="p-6 rounded-[28px] bg-card border border-border backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40">Ingresos Brutos del Día</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-headline text-foreground mt-2 font-mono">
                  ${stats.totalGrossIncome.toLocaleString('es-CO')} COP
                </h3>
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Ventas de servicios y productos
                </p>
              </div>

              <div className="p-6 rounded-[28px] bg-card border border-border backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-headline tracking-widest uppercase text-amber-500">Pago a Barberos</span>
                  <Scissors className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="text-3xl font-headline text-amber-400 mt-2 font-mono">
                  ${stats.totalBarberCommissions.toLocaleString('es-CO')} COP
                </h3>
                <p className="text-xs text-foreground/40 mt-1 font-light">
                  Nómina por comisiones del día
                </p>
              </div>

              <div className="p-6 rounded-[28px] bg-card border border-border backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-headline tracking-widest uppercase text-rose-400">Gastos / Egresos</span>
                  <ArrowDownRight className="w-4 h-4 text-rose-400" />
                </div>
                <h3 className="text-3xl font-headline text-rose-400 mt-2 font-mono">
                  ${stats.totalExpenses.toLocaleString('es-CO')} COP
                </h3>
                <p className="text-xs text-foreground/40 mt-1 font-light">
                  Insumos, mantenimiento y caja chica
                </p>
              </div>

              <div className="p-6 rounded-[28px] bg-card border-2 border-emerald-500/40 backdrop-blur-xl shadow-2xl bg-emerald-500/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-headline tracking-widest uppercase text-emerald-400">Utilidad Neta del Local</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-headline text-emerald-300 mt-2 font-mono font-bold">
                  ${stats.netShopProfit.toLocaleString('es-CO')} COP
                </h3>
                <p className="text-xs text-emerald-400/80 mt-1 font-light">
                  Ganancia neta libre para la barbería
                </p>
              </div>
            </div>
          )}

          {/* Desglose de Métodos de Pago del Día */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 relative z-10">
            <div className="p-4 rounded-2xl bg-card border border-border flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-foreground/40 font-headline block">Efectivo en Caja</span>
                <span className="text-sm font-mono font-bold text-foreground">
                  ${stats.paymentBreakdown.Efectivo.toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-foreground/40 font-headline block">Nequi</span>
                <span className="text-sm font-mono font-bold text-foreground">
                  ${stats.paymentBreakdown.Nequi.toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-foreground/40 font-headline block">Daviplata</span>
                <span className="text-sm font-mono font-bold text-foreground">
                  ${stats.paymentBreakdown.Daviplata.toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-foreground/40 font-headline block">Tarjeta / Datáfono</span>
                <span className="text-sm font-mono font-bold text-foreground">
                  ${stats.paymentBreakdown.Tarjeta.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>

          {/* Tabla Detallada de Transacciones y Movimientos del Día */}
          <div className="rounded-[32px] bg-card border border-border p-6 md:p-8 backdrop-blur-2xl shadow-xl relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-headline tracking-widest uppercase text-foreground">
                  Movimientos del Día: {selectedDate}
                </h3>
                <p className="text-xs text-foreground/40 font-light mt-0.5">
                  Auditoría detallada por cliente, barbero que atendió y liquidación.
                </p>
              </div>
              <span className="text-xs font-mono text-foreground/50 border border-border px-3 py-1 rounded-full">
                {filteredTransactions.length} registros
              </span>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="py-16 text-center text-foreground/40">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-headline tracking-widest uppercase text-sm">No hay transacciones registradas para este día</p>
                <p className="text-xs font-light mt-1">Selecciona otra fecha en el calendario o registra un nuevo movimiento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/80 text-[10px] font-headline tracking-widest uppercase text-foreground/40">
                      <th className="pb-3 px-3">Hora</th>
                      <th className="pb-3 px-3">Concepto / Servicio</th>
                      <th className="pb-3 px-3">Barbero</th>
                      <th className="pb-3 px-3">Método</th>
                      <th className="pb-3 px-3 text-right">Total Cobrado</th>
                      <th className="pb-3 px-3 text-right">Comisión Barbero</th>
                      <th className="pb-3 px-3 text-right">Propina</th>
                      <th className="pb-3 px-3 text-right">Ganancia Local</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-light">
                    {filteredTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-foreground/5 transition-colors group">
                        <td className="py-4 px-3 font-mono text-foreground/40 whitespace-nowrap">{tx.time}</td>
                        <td className="py-4 px-3">
                          <p className="font-medium text-foreground text-sm group-hover:text-emerald-300 transition-colors">
                            {tx.service}
                          </p>
                          <p className="text-[11px] text-foreground/40">Ref: {tx.client}</p>
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 border border-border">
                              <AvatarFallback className="text-[9px]">{tx.barberName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground/80">{tx.barberName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-3 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-headline uppercase tracking-wider bg-foreground/5 border border-border">
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right font-mono text-sm font-bold text-foreground">
                          {tx.type === 'Gasto' ? '-' : '+'}${tx.totalAmount.toLocaleString('es-CO')}
                        </td>
                        <td className="py-4 px-3 text-right font-mono text-amber-400">
                          ${tx.barberCommission.toLocaleString('es-CO')}
                        </td>
                        <td className="py-4 px-3 text-right font-mono text-emerald-400">
                          {tx.tip > 0 ? `+$${tx.tip.toLocaleString('es-CO')}` : '-'}
                        </td>
                        <td className="py-4 px-3 text-right font-mono font-medium">
                          <span className={tx.shopRevenue >= 0 ? 'text-emerald-300' : 'text-rose-400'}>
                            {tx.shopRevenue >= 0 ? '+' : ''}${tx.shopRevenue.toLocaleString('es-CO')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* VISTA DE MÉTRICAS & ANALÍTICA */
        <div className="space-y-8 relative z-10">
          {/* KPI Cards de Métricas Operativas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-7 rounded-[32px] bg-card border border-border hover:border-purple-500/30 transition-all backdrop-blur-xl shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center p-3">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-[10px] font-headline uppercase px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  +5% este mes
                </span>
              </div>
              <p className="text-[10px] text-foreground/40 tracking-[0.2em] uppercase font-headline mb-1">Retención de Clientes</p>
              <h3 className="text-3xl font-headline text-foreground font-mono">85%</h3>
              <p className="text-[11px] text-foreground/40 mt-1 font-light">Clientes recurrentes en la barbería</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-7 rounded-[32px] bg-card border border-border hover:border-purple-500/30 transition-all backdrop-blur-xl shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center p-3">
                  <Scissors className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-[10px] font-headline uppercase px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  40% del total
                </span>
              </div>
              <p className="text-[10px] text-foreground/40 tracking-[0.2em] uppercase font-headline mb-1">Servicio Top</p>
              <h3 className="text-2xl font-headline text-foreground">Corte y Barba</h3>
              <p className="text-[11px] text-foreground/40 mt-1 font-light">Mayor demanda en la agenda</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-7 rounded-[32px] bg-card border border-border hover:border-purple-500/30 transition-all backdrop-blur-xl shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center p-3">
                  <Star className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-[10px] font-headline uppercase px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  +0.1 puntaje
                </span>
              </div>
              <p className="text-[10px] text-foreground/40 tracking-[0.2em] uppercase font-headline mb-1">Calificación Promedio</p>
              <h3 className="text-3xl font-headline text-foreground font-mono">4.9 ★</h3>
              <p className="text-[11px] text-foreground/40 mt-1 font-light">Basado en 210 opiniones recibidas</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-7 rounded-[32px] bg-card border border-border hover:border-purple-500/30 transition-all backdrop-blur-xl shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center p-3">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="text-[10px] font-headline uppercase px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  +12% tendencia
                </span>
              </div>
              <p className="text-[10px] text-foreground/40 tracking-[0.2em] uppercase font-headline mb-1">Ticket Promedio</p>
              <h3 className="text-3xl font-headline text-foreground font-mono">$ 57.000</h3>
              <p className="text-[11px] text-foreground/40 mt-1 font-light">Gasto promedio por cliente</p>
            </motion.div>
          </div>

          {/* Gráfico de Evolución */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full h-[380px] rounded-[40px] bg-card border border-border backdrop-blur-xl p-8 md:p-10 flex flex-col relative overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h3 className="text-lg font-headline tracking-widest text-foreground uppercase">Evolución Semanal de Citas & Demanda</h3>
                <p className="text-xs text-foreground/40 font-light mt-0.5">Volumen acumulado de atención a clientes</p>
              </div>
              <span className="text-[10px] font-headline tracking-[0.2em] uppercase text-purple-400 border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 rounded-full">
                Rendimiento del Local
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
      )}

      {/* Modal para Registrar Gasto o Ingreso Manual */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline tracking-widest uppercase text-foreground">
              Registrar Movimiento de Caja
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/50 tracking-wide font-light">
              Registra un egreso operativo (compra de insumos) o un ingreso manual extraordinario.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddManualExpense} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Tipo de Movimiento</label>
              <Select
                value={newExpenseData.type}
                onValueChange={(val: 'Ingreso' | 'Gasto') => setNewExpenseData({ ...newExpenseData, type: val })}
              >
                <SelectTrigger className="bg-foreground/5 border-border rounded-xl h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground rounded-xl">
                  <SelectItem value="Gasto">Gasto / Egreso (Insumos, Mantenimiento)</SelectItem>
                  <SelectItem value="Ingreso">Ingreso Extraordinario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Descripción / Concepto *</label>
              <Input
                required
                value={newExpenseData.description}
                onChange={e => setNewExpenseData({ ...newExpenseData, description: e.target.value })}
                placeholder="Ej. Compra de hojillas y alcohol para desinfección"
                className="bg-foreground/5 border-border rounded-xl h-11 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Monto ($ COP) *</label>
              <Input
                required
                type="number"
                min="1000"
                value={newExpenseData.amount}
                onChange={e => setNewExpenseData({ ...newExpenseData, amount: e.target.value })}
                placeholder="Ej. 30000"
                className="bg-foreground/5 border-border rounded-xl h-11 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Método de Pago</label>
              <Select
                value={newExpenseData.paymentMethod}
                onValueChange={(val: 'Efectivo' | 'Nequi' | 'Daviplata' | 'Tarjeta') =>
                  setNewExpenseData({ ...newExpenseData, paymentMethod: val })
                }
              >
                <SelectTrigger className="bg-foreground/5 border-border rounded-xl h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground rounded-xl">
                  <SelectItem value="Efectivo">Efectivo (Caja)</SelectItem>
                  <SelectItem value="Nequi">Nequi</SelectItem>
                  <SelectItem value="Daviplata">Daviplata</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta / Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 flex flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-foreground/60 text-xs font-headline tracking-wider uppercase"
              >
                Cancelar
              </button>
              <PremiumButton type="submit" className="px-6 py-2">
                <span className="text-xs uppercase tracking-widest font-headline">Guardar Registro</span>
              </PremiumButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
