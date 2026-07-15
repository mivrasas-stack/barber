"use client";
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dummyCustomers } from "@/app/dashboard/data";
import { Users, Search, Download, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PremiumButton } from "@/components/ui/premium-button";

export default function AdminCustomers() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
            Clientes VIP
            </h1>
            <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Gestión de cartera de clientes en todas las sedes.
            </p>
        </div>
        <div className="flex gap-4">
            <PremiumButton variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Exportar
            </PremiumButton>
            <PremiumButton>Nuevo Cliente</PremiumButton>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input 
                placeholder="Buscar por nombre, correo o teléfono..." 
                className="w-full bg-white/5 border-white/10 text-white pl-10 focus-visible:ring-primary h-12"
              />
          </div>
      </div>

      {/* Customers Table Card */}
      <Card className="bg-white/[0.02] border-white/10 overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-4 bg-white/[0.01]">
            <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Directorio Global
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase">Cliente</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase">Contacto</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase">Visitas</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-white/40 uppercase text-right">Inversión Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {dummyCustomers.map(customer => {
                            const isVIP = customer.totalSpent > 500000;
                            return (
                                <tr key={customer.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-headline text-lg">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-headline text-white tracking-wide text-lg">{customer.name}</p>
                                                    {isVIP && <Star className="w-3 h-3 text-primary fill-primary drop-shadow-[0_0_5px_rgba(200,155,60,0.8)]" />}
                                                </div>
                                                <p className="text-[10px] tracking-widest text-white/40 uppercase">ID: {customer.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-light text-white/80">{customer.email}</p>
                                            <p className="text-xs font-light text-white/40">{customer.phone}</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="inline-flex items-center justify-center px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm font-light text-white">
                                            {customer.totalAppointments}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <p className="font-headline text-primary tracking-widest text-lg">
                                            COP {customer.totalSpent.toLocaleString('es-CO')}
                                        </p>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {dummyCustomers.length === 0 && (
                <div className="p-12 text-center text-white/40 font-light">
                    No se encontraron clientes.
                </div>
            )}
        </CardContent>
      </Card>

    </div>
  );
}
