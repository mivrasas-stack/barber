"use client";
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dummyTransactions, serviceTransactions, productTransactions, waitingRoomTransactions } from "@/app/clientes/data";
import { CreditCard, TrendingUp, TrendingDown, Download, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";

export default function AdminAccounting() {
  const allTransactions = [...dummyTransactions, ...serviceTransactions, ...productTransactions, ...waitingRoomTransactions];
  
  const totalIncome = allTransactions.filter(t => t.type === 'Ingreso').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = allTransactions.filter(t => t.type === 'Gasto').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
            Finanzas
            </h1>
            <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Control de ingresos, gastos y contabilidad general.
            </p>
        </div>
        <div className="flex gap-4">
            <PremiumButton variant="outline" className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> Reporte Mensual
            </PremiumButton>
            <PremiumButton className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Exportar a Excel
            </PremiumButton>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-white/[0.02] border-white/10 overflow-hidden relative group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-xs font-light tracking-widest text-muted-foreground uppercase">Balance General</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl font-headline tracking-wide mt-2 ${balance >= 0 ? 'text-white' : 'text-red-500'}`}>
              COP {balance.toLocaleString('es-CO')}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-[40px] -mr-10 -mt-10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-xs font-light tracking-widest text-muted-foreground uppercase">Ingresos (Mes)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-headline text-green-500 tracking-wide mt-2">
              COP {totalIncome.toLocaleString('es-CO')}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-[40px] -mr-10 -mt-10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-xs font-light tracking-widest text-muted-foreground uppercase">Gastos (Mes)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-headline text-red-500 tracking-wide mt-2">
              COP {totalExpense.toLocaleString('es-CO')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="bg-white/[0.02] border-white/10 overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-4 bg-white/[0.01]">
            <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Registro de Transacciones
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase">Fecha</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase">ID</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase">Descripción</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {allTransactions.sort((a,b) => b.date.localeCompare(a.date)).map(txn => (
                            <tr key={txn.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4">
                                    <span className="font-light text-white/80">{txn.date}</span>
                                </td>
                                <td className="p-4">
                                    <span className="text-[10px] tracking-widest text-white/40 uppercase">{txn.id}</span>
                                </td>
                                <td className="p-4">
                                    <span className="font-light text-white tracking-wide">{txn.description}</span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className={`inline-flex items-center gap-2 font-headline tracking-widest text-lg ${txn.type === 'Ingreso' ? 'text-green-500' : 'text-red-500'}`}>
                                        {txn.type === 'Ingreso' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                        COP {txn.amount.toLocaleString('es-CO')}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
