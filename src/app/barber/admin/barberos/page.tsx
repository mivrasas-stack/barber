"use client";
import React from 'react';
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { dummyBarbers } from "@/app/dashboard/data";
import { UserCheck, Plus, Star, MoreVertical } from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AdminStaff() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
            Staff Profesional
            </h1>
            <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Directorio y rendimiento de barberos.
            </p>
        </div>
        <div className="flex gap-4">
            <PremiumButton className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Nuevo Empleado
            </PremiumButton>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dummyBarbers.map(barber => (
              <Card key={barber.id} className="bg-white/[0.02] border-white/10 hover:bg-white/[0.04] transition-all duration-300 group overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors" />
                  
                  <CardContent className="p-6 relative z-10 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-6">
                          <Avatar className="h-16 w-16 border border-primary/30 p-0.5 bg-black/50 ring-1 ring-primary/10 ring-offset-2 ring-offset-background group-hover:ring-primary/30 transition-all">
                              <AvatarImage src={barber.avatarUrl} alt={barber.name} className="rounded-full object-cover" />
                              <AvatarFallback className="bg-transparent text-white font-headline text-xl">{barber.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <button className="text-white/40 hover:text-white transition-colors">
                              <MoreVertical className="w-5 h-5" />
                          </button>
                      </div>

                      <div className="mb-4">
                          <h3 className="text-2xl font-headline text-white tracking-widest uppercase">{barber.name}</h3>
                          <p className="text-[10px] font-headline tracking-widest text-primary uppercase mt-1">Master Barber</p>
                      </div>

                      <div className="flex items-center gap-1 text-primary mb-6">
                          {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-primary" />)}
                          <span className="text-xs text-white/40 font-light ml-2">(4.9)</span>
                      </div>

                      <div className="mt-auto grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                          <div>
                              <p className="text-[10px] font-headline tracking-widest text-white/40 uppercase">Citas Mes</p>
                              <p className="text-lg font-headline text-white">45</p>
                          </div>
                          <div>
                              <p className="text-[10px] font-headline tracking-widest text-white/40 uppercase">Comisiones</p>
                              <p className="text-lg font-headline text-white">COP 1.2M</p>
                          </div>
                      </div>
                  </CardContent>
              </Card>
          ))}
      </div>

    </div>
  );
}
