"use client";
import React from 'react';
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { dummyPortfolioItems } from "@/app/dashboard/data";
import { Briefcase, Plus, Image as ImageIcon, Trash2 } from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";
import Image from "next/image";

export default function BarberPortfolio() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
            Mi Portafolio
            </h1>
            <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Galería de tus mejores cortes y trabajos.
            </p>
        </div>
        <div className="flex gap-4">
            <PremiumButton className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Subir Trabajo
            </PremiumButton>
        </div>
      </div>

      {/* Portfolio Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Upload Placeholder */}
          <button className="h-80 rounded-xl border border-dashed border-white/20 bg-white/[0.01] hover:bg-white/[0.03] transition-colors flex flex-col items-center justify-center gap-4 text-white/40 hover:text-primary group">
              <div className="w-16 h-16 rounded-full bg-white/5 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <ImageIcon className="w-8 h-8" />
              </div>
              <span className="font-headline tracking-widest uppercase text-sm">Subir Nueva Foto</span>
          </button>

          {/* Items */}
          {dummyPortfolioItems.map(item => (
              <Card key={item.id} className="bg-white/[0.02] border-white/10 hover:border-primary/30 transition-all duration-300 group overflow-hidden">
                  <CardContent className="p-0 relative h-80 flex flex-col">
                      <div className="relative flex-1 bg-black/50 overflow-hidden">
                          <Image src={item.imageUrl} alt={item.description} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                          
                          {/* Delete Action */}
                          <button className="absolute top-4 right-4 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white/60 hover:text-red-500 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4" />
                          </button>
                          
                          {/* Category Badge */}
                          <div className="absolute bottom-4 left-4 bg-primary/20 backdrop-blur-md border border-primary/30 text-primary px-3 py-1 rounded-full text-[10px] font-headline tracking-widest uppercase">
                              {item.category}
                          </div>
                      </div>
                      <div className="p-4 bg-white/[0.02] border-t border-white/5">
                          <p className="text-sm font-light text-white/80 line-clamp-2">
                              {item.description}
                          </p>
                      </div>
                  </CardContent>
              </Card>
          ))}
      </div>

    </div>
  );
}
