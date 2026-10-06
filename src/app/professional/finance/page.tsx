"use client";

import { DollarSign, Clock, Lock, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ProfessionalFinancePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-headline font-bold text-foreground">
            Módulo de Finanzas & Liquidación
          </h1>
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs font-mono">
            PRÓXIMAMENTE (STAGE 3)
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Liquidación automatizada de alquiler de silla, cálculo de comisiones multisede y facturación electrónica.
        </p>
      </div>

      <div className="p-8 md:p-12 rounded-2xl border border-dashed border-border/80 bg-background/40 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto">
          <DollarSign className="w-8 h-8" />
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-xl font-headline font-bold text-foreground">
            En Desarrollo para Stage 3 — Payments & Ledger
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Este módulo incluirá conciliación contable de doble partida, liquidación instantánea por pasarela de pago, retención de canon de silla y reportes tributarios para independientes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto pt-4 text-left">
          <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-1">
            <span className="text-xs font-bold text-foreground">Alquiler de Silla</span>
            <p className="text-[11px] text-muted-foreground">Débito y liquidación automática mensual.</p>
          </div>
          <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-1">
            <span className="text-xs font-bold text-foreground">Reparto de Comisión</span>
            <p className="text-[11px] text-muted-foreground">División exacta entre anfitrión y profesional.</p>
          </div>
          <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-1">
            <span className="text-xs font-bold text-foreground">Billetera Digital</span>
            <p className="text-[11px] text-muted-foreground">Retiros a cuenta bancaria y Nequi / Daviplata.</p>
          </div>
        </div>

        <div className="pt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/professional">
              Volver al Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
