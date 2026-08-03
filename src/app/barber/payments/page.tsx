"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Star, Users, Scissors } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PremiumButton } from '@/components/ui/premium-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function PaymentsPage() {
  const [ratingBarber, setRatingBarber] = useState(0);
  const [ratingPlace, setRatingPlace] = useState(0);

  const renderStars = (rating: number, setRating: (val: number) => void) => {
    return (
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star className={`w-8 h-8 ${star <= rating ? 'fill-primary text-primary' : 'text-white/20'}`} />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-white/5 py-6">
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
            <Link href="/barber" className="text-white/60 hover:text-white transition-colors flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-light tracking-widest uppercase hidden sm:block">Volver</span>
            </Link>
            <h1 className="text-xl font-headline tracking-widest text-primary uppercase">Módulo de Cobro</h1>
            <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-6 md:px-12 py-12 flex-1 max-w-4xl">
        <div className="mb-12">
          <h2 className="text-3xl font-headline text-white tracking-widest uppercase">Punto de Pago y Feedback</h2>
          <p className="text-muted-foreground font-light tracking-wide mt-2">Registra el pago del cliente y recopila su calificación para el ranking de la barbería.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Detalles del Servicio y Cobro */}
          <div className="space-y-8 bg-white/[0.02] border border-white/5 p-8 rounded-2xl">
            <h3 className="text-xl font-headline tracking-widest text-white uppercase flex items-center gap-2">
              <CreditCard className="text-primary w-5 h-5"/> Datos de Cobro
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/60">Cliente</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input placeholder="Buscar o ingresar nombre..." className="pl-10 bg-white/5 border-white/10 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/60">Barbero que atendió</Label>
                <Select>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                    <SelectValue placeholder="Seleccionar barbero..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10 text-white">
                    <SelectItem value="carlos">Carlos Mendoza</SelectItem>
                    <SelectItem value="david">David Torres</SelectItem>
                    <SelectItem value="miguel">Miguel Ángel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/60">Servicio Realizado</Label>
                <Select>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                    <SelectValue placeholder="Seleccionar servicio..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10 text-white">
                    <SelectItem value="corte">Corte Clásico ($ 150.000 COP)</SelectItem>
                    <SelectItem value="corte_barba">Corte y Barba ($ 250.000 COP)</SelectItem>
                    <SelectItem value="tinte">Tinte ($ 400.000 COP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-6 border-t border-white/10 mt-6 flex justify-between items-center">
                <span className="text-white/60 text-sm uppercase tracking-widest">Total a Pagar</span>
                <span className="text-3xl font-headline text-white">$ 250.000 COP</span>
              </div>
            </div>
          </div>

          {/* Formulario de Calificación */}
          <div className="space-y-8 bg-white/[0.02] border border-white/5 p-8 rounded-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
              <h3 className="text-xl font-headline tracking-widest text-white uppercase flex items-center gap-2">
                <Star className="text-primary w-5 h-5"/> Calificación del Cliente
              </h3>
              <p className="text-sm text-white/50 font-light">Pide al cliente que califique su experiencia para mejorar el ranking de la barbería.</p>
              
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-white/80 text-base">¿Cómo calificas al barbero?</Label>
                  {renderStars(ratingBarber, setRatingBarber)}
                </div>

                <div className="space-y-3 pt-4">
                  <Label className="text-white/80 text-base">¿Cómo calificas el lugar y el ambiente?</Label>
                  {renderStars(ratingPlace, setRatingPlace)}
                </div>

                <div className="space-y-2 pt-4">
                  <Label className="text-white/60">Comentarios Adicionales (Opcional)</Label>
                  <Textarea placeholder="Excelente servicio..." className="bg-white/5 border-white/10 text-white min-h-[100px] resize-none" />
                </div>
              </div>

              <PremiumButton className="w-full mt-4">
                Procesar Pago y Guardar Feedback
              </PremiumButton>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
