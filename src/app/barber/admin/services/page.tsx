"use client";
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dummyServices } from "@/app/dashboard/data";
import { Scissors, Search, Plus, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PremiumButton } from "@/components/ui/premium-button";
import Image from "next/image";

export default function AdminServices() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
            Catálogo de Servicios
            </h1>
            <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Administración de la oferta de servicios de BarberParadise.
            </p>
        </div>
        <div className="flex gap-4">
            <PremiumButton className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Nuevo Servicio
            </PremiumButton>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input 
                placeholder="Buscar servicio por nombre..." 
                className="w-full bg-white/5 border-white/10 text-white pl-10 focus-visible:ring-primary h-12"
              />
          </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {dummyServices.map(service => (
              <Card key={service.id} className="bg-white/[0.02] border-white/10 hover:bg-white/[0.04] transition-all duration-300 group overflow-hidden relative">
                  <CardContent className="p-0 relative z-10 flex flex-col sm:flex-row h-full">
                      {/* Image side */}
                      <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-black/50 border-r border-white/5">
                          <Image src={service.imageUrl} alt={service.name} fill className="object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-background via-background/80 to-transparent" />
                      </div>
                      
                      {/* Content side */}
                      <div className="p-6 flex-1 flex flex-col justify-between relative">
                          <div className="absolute top-4 right-4 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                              <span className="text-[10px] font-headline tracking-widest text-primary uppercase">ID: {service.id}</span>
                          </div>
                          <div>
                              <div className="flex items-center gap-2 mb-2">
                                  <Scissors className="w-4 h-4 text-primary" />
                                  <h3 className="text-2xl font-headline text-white tracking-widest uppercase">{service.name}</h3>
                              </div>
                              <p className="text-sm font-light text-muted-foreground line-clamp-2">
                                  {service.description}
                              </p>
                          </div>

                          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-headline tracking-widest text-white/40 uppercase">Tarifa</span>
                                  <span className="text-lg font-headline text-white tracking-wide">
                                      COP {service.price.toLocaleString('es-CO')}
                                  </span>
                              </div>
                              <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-headline tracking-widest text-white/40 uppercase">Duración</span>
                                  <span className="flex items-center gap-1.5 text-sm font-light text-white">
                                      <Clock className="w-3 h-3 text-primary" />
                                      {service.duration} min
                                  </span>
                              </div>
                          </div>
                      </div>
                  </CardContent>
              </Card>
          ))}
      </div>

    </div>
  );
}
