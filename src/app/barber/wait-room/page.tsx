"use client";
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dummyWaitingRoomOrders, dummyWaitingRoomProducts } from "@/app/clientes/data";
import { Coffee, CheckCircle2, XCircle, Search } from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";

export default function BarberWaitRoom() {
  const pendingOrders = dummyWaitingRoomOrders.filter(o => o.status === 'Pendiente');
  
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
            Lounge VIP
            </h1>
            <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Gestión de pedidos de bebidas y snacks en la sala de espera.
            </p>
        </div>
        <div className="flex gap-4">
            <PremiumButton>Nuevo Pedido Manual</PremiumButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Orders Queue */}
          <div className="lg:col-span-8 space-y-6">
              <Card className="bg-white/[0.02] border-white/10">
                  <CardHeader className="border-b border-white/5 pb-4 bg-white/[0.01]">
                      <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                          <Coffee className="w-4 h-4 text-primary" />
                          Fila de Preparación ({pendingOrders.length})
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                      <div className="space-y-4">
                          {pendingOrders.map(order => (
                              <div key={order.id} className="border border-white/10 bg-white/5 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4 group">
                                  <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                          <h4 className="font-headline text-xl text-white">{order.customerName}</h4>
                                          <span className="text-[10px] font-headline tracking-widest text-primary uppercase border border-primary/20 bg-primary/10 px-2 py-0.5 rounded-full">
                                              Cód: {order.code}
                                          </span>
                                      </div>
                                      <p className="text-sm font-light text-white/60">
                                          {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                                      </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors rounded-lg text-xs font-headline tracking-widest uppercase">
                                          <XCircle className="w-4 h-4" /> Cancelar
                                      </button>
                                      <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-black hover:bg-primary/80 transition-colors rounded-lg text-xs font-headline tracking-widest uppercase">
                                          <CheckCircle2 className="w-4 h-4" /> Entregado
                                      </button>
                                  </div>
                              </div>
                          ))}
                          {pendingOrders.length === 0 && (
                              <div className="text-center py-8 text-white/40 font-light">
                                  No hay pedidos pendientes en este momento.
                              </div>
                          )}
                      </div>
                  </CardContent>
              </Card>
          </div>

          {/* Quick Inventory / Menu */}
          <div className="lg:col-span-4 space-y-6">
              <Card className="bg-white/[0.02] border-white/10">
                  <CardHeader className="border-b border-white/5 pb-4 bg-white/[0.01]">
                      <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center justify-between">
                          <span>Menú Disponible</span>
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                      <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                          {dummyWaitingRoomProducts.map(prod => (
                              <div key={prod.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                  <div>
                                      <p className="font-headline tracking-wide text-white">{prod.name}</p>
                                      <p className="text-[10px] tracking-widest text-white/40 uppercase">Stock: {prod.stock}</p>
                                  </div>
                                  <p className="font-light text-primary text-sm">COP {prod.price}</p>
                              </div>
                          ))}
                      </div>
                  </CardContent>
              </Card>
          </div>
      </div>

    </div>
  );
}
