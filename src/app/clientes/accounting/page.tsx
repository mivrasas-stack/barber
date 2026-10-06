"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { File, PlusCircle, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { dummyTransactions, serviceTransactions, productTransactions, waitingRoomTransactions } from "../data";
import type { Transaction } from "@/lib/types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 100 }
  }
};

const GlowNumber = ({ value, type }: { value: number, type: 'balance' | 'income' | 'expense' }) => {
  const isPositive = value >= 0;
  const colorClass = type === 'expense' ? 'text-amber-500' : 'text-emerald-400';
  const glowClass = type === 'expense' 
    ? 'drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
    : 'drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]';

  return (
    <div className={`font-light tracking-tighter ${colorClass} ${glowClass}`}>
      <span className="text-2xl sm:text-4xl align-top mr-1 font-extralight opacity-80">$</span>
      {Math.abs(value).toLocaleString('es-CO')}
    </div>
  );
};

const TransactionList = ({ transactions }: { transactions: Transaction[] }) => (
  <div className="space-y-4">
    {transactions.map((transaction, index) => (
      <motion.div
        variants={itemVariants}
        key={transaction.id}
        className="group flex items-center justify-between p-4 rounded-2xl bg-black/40 backdrop-blur-3xl border border-border hover:bg-foreground/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-black/50 border border-border ${transaction.type === 'Ingreso' ? 'text-emerald-400' : 'text-amber-500'}`}>
            {transaction.type === 'Ingreso' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
          <div>
            <p className="font-medium text-foreground/90 text-lg">{transaction.description}</p>
            <p className="text-sm text-foreground/40">{transaction.date}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-xl font-light tracking-tight ${
            transaction.type === 'Ingreso' 
              ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' 
              : 'text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]'
          }`}>
            {transaction.type === 'Ingreso' ? '+' : '-'}${transaction.amount.toLocaleString('es-CO')}
          </p>
          <Badge 
            variant="outline" 
            className={`mt-1 bg-transparent border-border ${transaction.type === 'Ingreso' ? 'text-emerald-400/80' : 'text-amber-500/80'}`}
          >
            {transaction.type}
          </Badge>
        </div>
      </motion.div>
    ))}
  </div>
);

export default function AccountingPage() {
  const calculateTotals = (transactions: Transaction[]) => {
    const income = transactions.filter(t => t.type === 'Ingreso').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'Gasto').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  };

  const { income: generalIncome, expense: generalExpense, balance: generalBalance } = calculateTotals(dummyTransactions);

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants}
      className="min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-12 text-foreground selection:bg-emerald-500/30 font-sans"
    >
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-2">
              Patrimonio <span className="text-foreground/40">Líquido</span>
            </h1>
            <p className="text-foreground/50 text-lg font-light">Gestión financiera premium y flujo de caja.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" variant="outline" className="gap-2 bg-black/40 backdrop-blur-md border-border hover:bg-foreground/5 hover:text-foreground rounded-full px-6 transition-all">
              <File className="h-4 w-4" />
              <span>Exportar Reporte</span>
            </Button>
            <Button size="lg" className="gap-2 bg-white text-black hover:bg-white/90 rounded-full px-6 transition-all font-medium">
              <PlusCircle className="h-4 w-4" />
              <span>Nueva Transacción</span>
            </Button>
          </div>
        </motion.div>

        {/* Hero Balance Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 lg:col-span-2 p-8 md:p-10 rounded-[2rem] bg-black/40 backdrop-blur-3xl border border-border relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-30 transition-opacity">
              <DollarSign className="w-32 h-32 text-emerald-400" />
            </div>
            <div className="relative z-10">
              <p className="text-foreground/50 text-lg uppercase tracking-widest font-medium mb-4">Balance General</p>
              <div className="text-6xl md:text-8xl">
                <GlowNumber value={generalBalance} type="balance" />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-6">
            <div className="flex-1 p-6 rounded-[2rem] bg-black/40 backdrop-blur-3xl border border-border flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-foreground/50 font-medium">Ingresos Totales</p>
              </div>
              <div className="text-3xl md:text-4xl mt-2">
                <GlowNumber value={generalIncome} type="income" />
              </div>
            </div>
            <div className="flex-1 p-6 rounded-[2rem] bg-black/40 backdrop-blur-3xl border border-border flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-foreground/50 font-medium">Gastos Totales</p>
              </div>
              <div className="text-3xl md:text-4xl mt-2">
                <GlowNumber value={generalExpense} type="expense" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Transactions Tabs */}
        <motion.div variants={itemVariants} className="pt-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="bg-black/40 backdrop-blur-xl border border-border p-1 rounded-full w-full justify-start h-auto overflow-x-auto no-scrollbar">
              <TabsTrigger value="general" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black transition-all">Consolidado</TabsTrigger>
              <TabsTrigger value="services" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black transition-all">Servicios</TabsTrigger>
              <TabsTrigger value="products" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black transition-all">Productos</TabsTrigger>
              <TabsTrigger value="waiting-room" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black transition-all">Sala de Espera</TabsTrigger>
            </TabsList>
            
            <div className="mt-8">
              <TabsContent value="general" className="m-0 focus-visible:ring-0">
                <TransactionList transactions={dummyTransactions} />
              </TabsContent>
              <TabsContent value="services" className="m-0 focus-visible:ring-0">
                <TransactionList transactions={serviceTransactions} />
              </TabsContent>
              <TabsContent value="products" className="m-0 focus-visible:ring-0">
                <TransactionList transactions={productTransactions} />
              </TabsContent>
              <TabsContent value="waiting-room" className="m-0 focus-visible:ring-0">
                <TransactionList transactions={waitingRoomTransactions} />
              </TabsContent>
            </div>
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
  );
}
