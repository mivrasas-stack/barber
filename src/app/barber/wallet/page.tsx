"use client";
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wallet, TrendingUp, Scissors, Download, Calendar } from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";

export default function BarberWallet() {
  const commissionsThisMonth = 1250000;
  const tipsThisMonth = 340000;
  const totalServices = 85;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
            Mis Comisiones
            </h1>
            <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Resumen de ingresos generados en el mes actual.
            </p>
        </div>
        <div className="flex gap-4">
            <PremiumButton variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Resumen PDF
            </PremiumButton>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-white/[0.02] border-white/10 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -mr-10 -mt-10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-xs font-light tracking-widest text-muted-foreground uppercase">Total Generado</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-headline text-white tracking-wide mt-2">
              COP {(commissionsThisMonth + tipsThisMonth).toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-primary font-light tracking-wide mt-2">
              Disponible para retiro el 30 del mes.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10 overflow-hidden relative group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-xs font-light tracking-widest text-muted-foreground uppercase">Propinas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-headline text-green-500 tracking-wide mt-2">
              COP {tipsThisMonth.toLocaleString('es-CO')}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10 overflow-hidden relative group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-xs font-light tracking-widest text-muted-foreground uppercase">Servicios Atendidos</CardTitle>
            <Scissors className="h-4 w-4 text-white/40" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-headline text-white tracking-wide mt-2">
              {totalServices}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card className="bg-white/[0.02] border-white/10 overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-4 bg-white/[0.01]">
            <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Historial de Cortes (Esta Semana)
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase">Fecha</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase">Cliente</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase">Servicio</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase text-right">Comisión + Propina</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        <tr className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-light text-white/80">Hoy, 10:00 AM</td>
                            <td className="p-4 font-headline tracking-wide text-white">John Doe</td>
                            <td className="p-4 font-light text-white/80">Corte + Afeitado</td>
                            <td className="p-4 font-headline tracking-widest text-primary text-right text-lg">COP 35.000</td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-light text-white/80">Hoy, 11:30 AM</td>
                            <td className="p-4 font-headline tracking-wide text-white">Peter Jones</td>
                            <td className="p-4 font-light text-white/80">Corte de barba</td>
                            <td className="p-4 font-headline tracking-widest text-primary text-right text-lg">COP 7.500</td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-light text-white/80">Ayer, 04:00 PM</td>
                            <td className="p-4 font-headline tracking-wide text-white">Sam Wilson</td>
                            <td className="p-4 font-light text-white/80">Corte de pelo</td>
                            <td className="p-4 font-headline tracking-widest text-primary text-right text-lg">COP 20.000</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
