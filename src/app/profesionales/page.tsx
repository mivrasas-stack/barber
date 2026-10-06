"use client";

import Link from "next/link";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { PremiumButton } from "@/components/ui/premium-button";
import { Badge } from "@/components/ui/badge";
import {
  Scissors,
  Calendar,
  Users,
  ShieldCheck,
  Building,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Smartphone,
} from "lucide-react";

export default function ProfesionalesLandingPage() {
  const features = [
    {
      icon: Users,
      title: "Tus Clientes te Pertenecen",
      description:
        "Tus clientes, fichas técnicas y preferencias son de tu propiedad. Si cambias de sede o abres tu propio estudio, mantienes el 100% de tu cartera de clientes.",
    },
    {
      icon: Building,
      title: "Afiliaciones Multisede Flexibles",
      description:
        "Atiende físicamente en una o varias barberías bajo modelos de alquiler de silla o comisión. Todo centralizado bajo tu único perfil profesional.",
    },
    {
      icon: ShieldCheck,
      title: "Concurrencia Atómica Anti Doble-Booking",
      description:
        "Nuestra infraestructura con PostgreSQL garantiza que nunca te agenden dos citas a la misma hora en sedes diferentes. Seguridad matemática.",
    },
    {
      icon: Smartphone,
      title: "Tu Enlace de Reserva Directo",
      description:
        "Comparte tu link profesional en Instagram y WhatsApp. Tus clientes reservan según tu disponibilidad real sin cruce de mensajes.",
    },
    {
      icon: Calendar,
      title: "Agenda y Horarios Autónomos",
      description:
        "Define tus propios turnos, descansos y catálogo de servicios con duraciones y precios personalizados para cada ubicación.",
    },
    {
      icon: Sparkles,
      title: "Modular y Escalable",
      description:
        "Activa sólo los módulos que necesitas: agenda, analítica, promociones, o liquidación financiera a medida que crece tu negocio.",
    },
  ];

  const plans = [
    {
      code: "SOLO_STARTER",
      name: "Solo Starter",
      price: "$49.000",
      period: "COP / mes",
      description: "Ideal para barberos independientes que están consolidando su cartera propia.",
      features: [
        "1 Workspace profesional propio",
        "Agenda y calendario interactivo",
        "Hasta 1 sede anfitriona afiliada",
        "Directorio de hasta 150 clientes",
        "Enlace público de reservas",
        "Recordatorios de citas",
      ],
      popular: false,
    },
    {
      code: "SOLO_PRO",
      name: "Solo Pro",
      price: "$89.000",
      period: "COP / mes",
      description: "Para profesionales con alto flujo que operan en múltiples barberías y buscan máxima autonomía.",
      features: [
        "Todo lo de Starter, más:",
        "Afiliaciones multisede ilimitadas",
        "Clientes ilimitados con ficha histórica",
        "Métricas avanzadas de rendimiento",
        "Catálogo completo de servicios personalizados",
        "Protección multisede anti doble-booking",
        "Soporte prioritario por WhatsApp",
      ],
      popular: true,
    },
    {
      code: "SOLO_ELITE",
      name: "Solo Elite",
      price: "$149.000",
      period: "COP / mes",
      description: "Para referentes del sector, formadores y barberos de alta gama con marca personal.",
      features: [
        "Todo lo de Pro, más:",
        "Página web de marca personal con dominio",
        "Módulo de promociones y campañas de fidelización",
        "Pre-acceso a Asistente AI de agendamiento",
        "Liquidación y reportes contables avanzados",
        "Asesor dedicado para onboarding",
      ],
      popular: false,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-grow pt-28">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden border-b border-border/40">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="container mx-auto px-6 max-w-6xl relative z-10 text-center">
            <Badge
              variant="outline"
              className="mb-6 px-4 py-1.5 border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs tracking-widest uppercase font-mono"
            >
              <Scissors className="w-3.5 h-3.5 mr-2 inline" />
              Espacio para Barberos Independientes
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-headline font-bold text-foreground tracking-tight leading-tight max-w-4xl mx-auto">
              TU TALENTO. TU MARCA. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
                TU PROPIO ESPACIO COMERCIAL.
              </span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Maneja tu propia agenda, clientes y tarifas. Trabaja en barberías anfitrionas con alquiler de silla o comisión, manteniendo el control absoluto de tu negocio.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <PremiumButton asChild size="lg">
                <Link href="/register/professional">
                  Crear mi Espacio Gratis (14 días)
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </PremiumButton>
              <Link
                href="#planes"
                className="text-sm font-medium text-foreground/80 hover:text-foreground px-6 py-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors"
              >
                Ver Planes y Módulos
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 14 días de prueba sin costo
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sin tarjeta de crédito
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cancela cuando quieras
              </span>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-20 md:py-28 bg-muted/10 border-b border-border/40">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-headline font-bold text-foreground">
                DISEÑADO PARA TU INDEPENDENCIA
              </h2>
              <p className="mt-3 text-muted-foreground text-sm md:text-base">
                No eres un simple empleado. Eres un profesional autónomo con tu propia empresa y clients.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="p-8 rounded-2xl border border-border/60 bg-background/50 hover:border-amber-500/40 hover:bg-background/80 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-headline font-semibold text-foreground mb-3">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works with Barbershops */}
        <section className="py-20 md:py-28 border-b border-border/40">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge variant="outline" className="mb-4 text-xs font-mono uppercase tracking-wider">
                Relación con Barberías Anfitrionas
              </Badge>
              <h2 className="text-3xl md:text-4xl font-headline font-bold text-foreground">
                ¿CÓMO FUNCIONA EL MODELO AFILIADO?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="p-6 rounded-xl border border-border/60 bg-muted/20">
                <div className="text-2xl font-bold font-mono text-amber-500 mb-2">01</div>
                <h4 className="font-semibold text-foreground mb-2">Creas tu Espacio Solo</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Registras tu perfil profesional, defines tus servicios y obtienes tu Workspace independiente como OWNER.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-border/60 bg-muted/20">
                <div className="text-2xl font-bold font-mono text-amber-500 mb-2">02</div>
                <h4 className="font-semibold text-foreground mb-2">Te Afilias a una Sede</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Envías solicitud a una o más barberías. La sede aprueba las ubicaciones físicas y el modelo de liquidación (alquiler de silla o comisión).
                </p>
              </div>

              <div className="p-6 rounded-xl border border-border/60 bg-muted/20">
                <div className="text-2xl font-bold font-mono text-amber-500 mb-2">03</div>
                <h4 className="font-semibold text-foreground mb-2">Atiendes con Concurrencia Total</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Recibes citas en cualquiera de tus sedes autorizadas o tu estudio propio sin riesgo de colisión ni solapamiento horario.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="planes" className="py-20 md:py-28 bg-muted/10">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-headline font-bold text-foreground">
                PLANES PARA PROFESIONALES INDEPENDIENTES
              </h2>
              <p className="mt-3 text-muted-foreground text-sm md:text-base">
                Elige el plan adaptado a tu etapa. Todos incluyen 14 días de prueba completa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {plans.map((p) => (
                <div
                  key={p.code}
                  className={`rounded-2xl border p-8 flex flex-col justify-between transition-all duration-300 relative ${
                    p.popular
                      ? "border-amber-500 bg-background shadow-2xl shadow-amber-500/10 scale-105 z-10"
                      : "border-border/60 bg-background/60"
                  }`}
                >
                  {p.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-amber-500 text-black font-semibold text-xs uppercase tracking-wider py-1 px-3">
                        Más Elegido
                      </Badge>
                    </div>
                  )}

                  <div>
                    <h3 className="text-2xl font-headline font-bold text-foreground">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-2 min-h-[36px]">{p.description}</p>

                    <div className="mt-6 mb-6">
                      <span className="text-4xl font-bold font-headline text-foreground">{p.price}</span>
                      <span className="text-xs text-muted-foreground ml-2">{p.period}</span>
                    </div>

                    <div className="border-t border-border/40 pt-6 space-y-3">
                      {p.features.map((feat, fi) => (
                        <div key={fi} className="flex items-start gap-2.5 text-xs text-foreground/80">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-6">
                    <PremiumButton asChild className="w-full">
                      <Link href={`/register/professional?plan=${p.code}`}>
                        Comenzar 14 Días Gratis
                      </Link>
                    </PremiumButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 border-t border-border/40 bg-gradient-to-b from-background to-amber-500/5 text-center">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl md:text-5xl font-headline font-bold text-foreground">
              LLEVA TU CARRERA PROFESIONAL AL SIGUIENTE NIVEL
            </h2>
            <p className="mt-4 text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
              Únete a la nueva generación de barberos que operan con autonomía comercial, tecnología de punta y respaldo multisede.
            </p>
            <div className="mt-8">
              <PremiumButton asChild size="lg">
                <Link href="/register/professional">
                  Crear mi Espacio Profesional Ahora
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </PremiumButton>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
