"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  Building2,
  Scissors,
  CheckCircle2,
  Copy,
  ExternalLink,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/ui/premium-button";

export default function ProfessionalDashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/v1/professionals/me");
        if (res.ok) {
          const d = await res.json();
          setProfile(d.profile);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadMe();
  }, []);

  const handleCopyLink = () => {
    if (typeof window !== "undefined" && profile?.professionalSlug) {
      const url = `${window.location.origin}/${profile.professionalSlug}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome & Booking URL Banner */}
      <div className="p-6 md:p-8 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-background to-background flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500 text-black text-[10px] font-mono uppercase tracking-wider py-0.5">
              Solo Workspace Activo
            </Badge>
            <span className="text-xs text-muted-foreground">Plan Solo Pro (Trial 14 Días)</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground">
            ¡Hola, {profile?.displayName || "Carlos"}!
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-xl">
            Tu estudio y agenda comercial están operando con concurrencia total en todas tus sedes afiliadas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="w-full sm:w-auto text-xs flex items-center gap-2 border-border/80"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>¡Enlace Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Copiar Enlace de Reserva</span>
              </>
            )}
          </Button>

          <PremiumButton asChild size="sm" className="w-full sm:w-auto">
            <Link href="/professional/appointments">
              Ver Mi Agenda
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </PremiumButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border/60 bg-background/60 space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Citas Hoy</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-headline text-foreground">3</div>
          <div className="text-[11px] text-emerald-500 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>2 confirmadas, 1 pendiente</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border/60 bg-background/60 space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Ingresos Proyectados</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-headline text-foreground">$165.000</div>
          <div className="text-[11px] text-muted-foreground">
            Tarifa promedio: $55.000 COP
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border/60 bg-background/60 space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Mis Clientes Propios</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-headline text-foreground">48</div>
          <div className="text-[11px] text-muted-foreground">
            En tu cartera independiente
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border/60 bg-background/60 space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Sedes Anfitrionas</span>
            <Building2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-headline text-foreground">1 Sede</div>
          <div className="text-[11px] text-emerald-500 font-medium">
            The Royal Barber (Zona G)
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Schedule & Quick Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Appointments List */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-border/60 bg-background/40 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-lg text-foreground">
              Agenda de Hoy
            </h3>
            <Link
              href="/professional/appointments"
              className="text-xs text-amber-500 hover:underline font-medium"
            >
              Ver calendario completo &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {[
              {
                time: "10:00 AM - 10:45 AM",
                customer: "Andrés Silva",
                service: "Corte de Autor Carlos Barber",
                location: "The Royal Barber - Zona G",
                status: "CONFIRMED",
                price: "$45.000",
              },
              {
                time: "11:30 AM - 12:30 PM",
                customer: "Santiago Gómez",
                service: "Combo Master: Corte + Barba",
                location: "The Royal Barber - Zona G",
                status: "CONFIRMED",
                price: "$75.000",
              },
              {
                time: "03:00 PM - 03:35 PM",
                customer: "Felipe Restrepo",
                service: "Ritual Barba & Toalla Caliente",
                location: "The Royal Barber - Zona G",
                status: "PENDING",
                price: "$35.000",
              },
            ].map((appt, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-500">
                      {appt.time}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0 ${
                        appt.status === "CONFIRMED"
                          ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                          : "text-amber-500 border-amber-500/30 bg-amber-500/10"
                      }`}
                    >
                      {appt.status}
                    </Badge>
                  </div>
                  <div className="font-semibold text-sm text-foreground">
                    {appt.customer}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span>{appt.service}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {appt.location}
                    </span>
                  </div>
                </div>

                <div className="text-right sm:self-center">
                  <div className="font-mono font-bold text-sm text-foreground">
                    {appt.price}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Tools & Affiliation Status */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-border/60 bg-background/40 space-y-4">
            <h3 className="font-headline font-bold text-base text-foreground">
              Sede Anfitriona Activa
            </h3>
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">
                  The Royal Barber Shop
                </span>
                <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                  ACTIVA
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Sede autorizada: Zona G (Calle 69 # 4-50)
              </div>
              <div className="text-[11px] text-muted-foreground font-mono pt-1">
                Modelo: Alquiler de Silla (COP $1.500.000 / mes)
              </div>
            </div>

            <Button asChild variant="outline" size="sm" className="w-full text-xs">
              <Link href="/professional/affiliations">
                Gestionar Afiliaciones & Sedes
              </Link>
            </Button>
          </div>

          <div className="p-6 rounded-xl border border-border/60 bg-background/40 space-y-3">
            <h3 className="font-headline font-bold text-base text-foreground">
              Seguridad Anti Doble-Booking
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tus reservas están respaldadas por restricciones matemáticas de PostgreSQL con rangos GiST. Incluso si atiendes en 3 barberías diferentes, nadie podrá reservarte a la misma hora en dos lugares.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
