"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/ui/premium-button";
import {
  Scissors,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building,
  User,
  Shield,
  AlertCircle,
} from "lucide-react";

export default function RegisterProfessionalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan") || "SOLO_PRO";

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    displayName: "",
    professionalSlug: "",
    bio: "",
    instagram: "",
    yearsExperience: "5",
    workspaceName: "",
    planCode: initialPlan,
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-generate slug and workspace name if editing displayName
      if (field === "displayName" && !prev.professionalSlug) {
        const slug = value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        updated.professionalSlug = slug;
        if (!prev.workspaceName) {
          updated.workspaceName = `${value} Studio`;
        }
      }
      return updated;
    });
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password) {
        setErrorMsg("Por favor completa tu nombre, correo y contraseña.");
        return;
      }
      if (formData.password.length < 8) {
        setErrorMsg("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.displayName || !formData.professionalSlug) {
        setErrorMsg("Por favor define tu nombre profesional y tu slug de enlace.");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const idempotencyKey = crypto.randomUUID();
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName,
        professionalSlug: formData.professionalSlug,
        workspaceName: formData.workspaceName || `${formData.displayName} Studio`,
        planCode: formData.planCode,
        bio: formData.bio || undefined,
        phonePublic: formData.phone || undefined,
        instagram: formData.instagram || undefined,
        yearsExperience: formData.yearsExperience ? parseInt(formData.yearsExperience, 10) : undefined,
      };

      const res = await fetch("/api/v1/professionals/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Ocurrió un error al registrar el profesional");
      }

      setSuccessData(json.data);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl border border-amber-500/30 bg-background/90 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-headline font-bold text-foreground">
              ¡Bienvenido a Barber Paradise!
            </h2>
            <p className="text-sm text-muted-foreground">
              Tu espacio profesional <strong>{successData.tenant?.name}</strong> y tu cuenta han sido creados con éxito.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tu enlace de reservas:</span>
              <span className="font-mono text-amber-500 font-semibold">
                /{successData.profile?.professionalSlug}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan inicial:</span>
              <span className="font-semibold text-foreground">
                {formData.planCode} (14 días gratis)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rol en tu espacio:</span>
              <Badge variant="outline" className="text-[10px] py-0">OWNER</Badge>
            </div>
          </div>

          <div className="pt-4">
            <PremiumButton
              className="w-full"
              onClick={() => router.push("/login")}
            >
              Iniciar Sesión en mi Espacio
              <ArrowRight className="w-4 h-4 ml-2" />
            </PremiumButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Top Header */}
      <header className="p-6 border-b border-border/40 flex items-center justify-between container mx-auto">
        <Link href="/" className="text-xl font-headline font-bold tracking-widest text-foreground flex items-center gap-2">
          <Scissors className="w-5 h-5 text-amber-500" />
          BARBER PARADISE
        </Link>
        <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
          ¿Ya tienes cuenta? Iniciar Sesión
        </Link>
      </header>

      {/* Main Wizard */}
      <main className="container mx-auto px-6 py-12 max-w-2xl flex-1 flex flex-col justify-center">
        {/* Step Indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs text-amber-500 border-amber-500/30">
                Paso {step} de 3
              </Badge>
              <span className="text-xs text-muted-foreground">
                {step === 1 && "Datos de Acceso"}
                {step === 2 && "Perfil Profesional y Marca"}
                {step === 3 && "Workspace y Plan"}
              </span>
            </div>
            <span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> 14 Días de Prueba Gratis
            </span>
          </div>

          <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3 text-destructive text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Account Info */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-headline font-bold text-foreground">
                Crea tu cuenta de acceso
              </h2>
              <p className="text-xs text-muted-foreground">
                Tus credenciales personales para acceder a la plataforma y gestionar tu negocio.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Correo Electrónico *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="carlos@ejemplo.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono / WhatsApp *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+57 300 123 4567"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <PremiumButton type="submit">
                Continuar al Perfil
                <ArrowRight className="w-4 h-4 ml-2" />
              </PremiumButton>
            </div>
          </form>
        )}

        {/* Step 2: Professional Profile */}
        {step === 2 && (
          <form onSubmit={handleNextStep} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-headline font-bold text-foreground">
                Configura tu Perfil Profesional
              </h2>
              <p className="text-xs text-muted-foreground">
                Esta es la información que verán tus clientes al agendarte directamente.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Nombre Artístico / Marca Profesional *</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => handleChange("displayName", e.target.value)}
                  placeholder="Ej. Carlos 'The Barber' Mendoza"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug">Enlace Público de Reservas *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">barberparadise.dev/</span>
                  <Input
                    id="slug"
                    value={formData.professionalSlug}
                    onChange={(e) => handleChange("professionalSlug", e.target.value)}
                    placeholder="carlos-barber"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio">Biografía / Especialidad</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  placeholder="Especialista en degradados, barboterapia y diseño de barba..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => handleChange("instagram", e.target.value)}
                    placeholder="@carlosbarber"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="exp">Años de Experiencia</Label>
                  <Input
                    id="exp"
                    type="number"
                    value={formData.yearsExperience}
                    onChange={(e) => handleChange("yearsExperience", e.target.value)}
                    placeholder="5"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Atrás
              </Button>
              <PremiumButton type="submit">
                Elegir Plan & Finalizar
                <ArrowRight className="w-4 h-4 ml-2" />
              </PremiumButton>
            </div>
          </form>
        )}

        {/* Step 3: Workspace & Plan Selection */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-headline font-bold text-foreground">
                Tu Espacio Comercial y Plan
              </h2>
              <p className="text-xs text-muted-foreground">
                Obtén 14 días gratis. No se te cobrará nada hoy.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="wsName">Nombre de tu Espacio de Trabajo *</Label>
                <Input
                  id="wsName"
                  value={formData.workspaceName}
                  onChange={(e) => handleChange("workspaceName", e.target.value)}
                  placeholder="Ej. Carlos Barber Studio"
                  required
                />
              </div>

              <div className="space-y-2 pt-2">
                <Label>Selecciona tu Plan Inicial</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { code: "SOLO_STARTER", name: "Solo Starter", price: "$49k/m" },
                    { code: "SOLO_PRO", name: "Solo Pro (Recomendado)", price: "$89k/m" },
                    { code: "SOLO_ELITE", name: "Solo Elite", price: "$149k/m" },
                  ].map((p) => (
                    <div
                      key={p.code}
                      onClick={() => handleChange("planCode", p.code)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        formData.planCode === p.code
                          ? "border-amber-500 bg-amber-500/10 shadow-sm"
                          : "border-border/60 hover:border-border bg-background"
                      }`}
                    >
                      <div className="text-xs font-bold text-foreground">{p.name}</div>
                      <div className="text-xs text-amber-500 font-mono mt-1">{p.price}</div>
                      <div className="text-[10px] text-muted-foreground mt-2">14 días de prueba gratis</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Atrás
              </Button>
              <PremiumButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creando espacio..." : "Crear Espacio Profesional"}
                <Sparkles className="w-4 h-4 ml-2" />
              </PremiumButton>
            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-border/40 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Barber Paradise. Todos los derechos reservados.
      </footer>
    </div>
  );
}
