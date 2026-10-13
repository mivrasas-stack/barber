"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Mail, LockKeyhole, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    searchParams.get("error") === "session_expired"
      ? "Tu sesión ha expirado. Por favor inicia sesión de nuevo."
      : searchParams.get("error") === "forbidden_platform_admin_required"
      ? "Acceso denegado: se requieren permisos de Administrador de Plataforma."
      : ""
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Credenciales inválidas. Verifica tu correo y contraseña.");
        setIsLoading(false);
        return;
      }

      const requested = searchParams.get("redirect");
      const safeRedirect = requested && requested.startsWith("/") && !requested.startsWith("//") && !requested.includes("\\")
        && !/[\u0000-\u001f]/.test(requested) ? requested : null;
      const redirect = safeRedirect || data.redirectUrl || "/customers";
      router.push(redirect);
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      setError("Error de conexión al servidor. Inténtalo de nuevo.");
      setIsLoading(false);
    }
  };

  const fillDevAccount = (devEmail: string) => {
    setEmail(devEmail);
    setPassword("DevPassword123!");
    setError("");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Image */}
      <div className="hidden lg:flex relative w-1/2 items-center justify-center">
        <Image
          src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop"
          alt="Premium Barber atmosphere"
          fill
          className="object-cover grayscale brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />

        <div className="relative z-10 p-12 text-center">
          <Link
            href="/"
            className="text-4xl font-bold font-headline tracking-[0.3em] text-foreground hover:text-primary transition-colors"
          >
            BARBER PARADISE
          </Link>
          <p className="mt-6 text-foreground/60 font-light tracking-widest uppercase text-sm">
            Exclusividad y Estilo — SaaS Multi-Tenant
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 lg:p-24 relative overflow-hidden bg-background">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none -translate-x-1/3 translate-y-1/3" />

        <div className="w-full max-w-md bg-foreground/5 backdrop-blur-3xl border border-border p-8 sm:p-10 rounded-3xl shadow-2xl space-y-8 relative z-10">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-foreground/5 border border-border mb-2">
              <LockKeyhole className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-headline text-foreground tracking-wide">
              BIENVENIDO <br />
              <span className="text-foreground/40">DE VUELTA</span>
            </h1>
            <p className="text-muted-foreground font-light text-sm">
              Ingresa con tus credenciales verificadas.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 font-medium ml-1"
              >
                Correo Electrónico
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-foreground/30" />
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  disabled={isLoading}
                  className="bg-black/20 border border-border rounded-xl pl-12 pr-4 py-6 h-auto text-base text-foreground placeholder:text-foreground/20 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label
                  htmlFor="password"
                  className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 font-medium"
                >
                  Contraseña
                </Label>
                <Link
                  href="#"
                  className="text-[10px] uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockKeyhole className="h-5 w-5 text-foreground/30" />
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="bg-black/20 border border-border rounded-xl pl-12 pr-4 py-6 h-auto text-base text-foreground placeholder:text-foreground/20 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all shadow-inner"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs font-medium text-center bg-red-500/10 py-2.5 px-3 rounded-lg border border-red-500/20 whitespace-pre-line">
                {error}
              </p>
            )}

            <div className="pt-2">
              <PremiumButton
                type="submit"
                disabled={isLoading}
                className="w-full justify-center py-6 text-sm tracking-widest group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AUTENTICANDO...
                  </>
                ) : (
                  <>
                    INICIAR SESIÓN
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </PremiumButton>
            </div>
          </form>

          {/* Quick-fill Dev Accounts Banner */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-left">
            <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cuentas de Desarrollo (Password: DevPassword123!)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => fillDevAccount("admin@barberparadise.dev")}
                className="px-2 py-1 text-[10px] bg-background/50 hover:bg-amber-500/20 text-foreground/80 rounded border border-border transition-colors font-mono"
              >
                Platform Admin
              </button>
              <button
                type="button"
                onClick={() => fillDevAccount("owner@royalbarber.dev")}
                className="px-2 py-1 text-[10px] bg-background/50 hover:bg-amber-500/20 text-foreground/80 rounded border border-border transition-colors font-mono"
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => fillDevAccount("barber1@royalbarber.dev")}
                className="px-2 py-1 text-[10px] bg-background/50 hover:bg-amber-500/20 text-foreground/80 rounded border border-border transition-colors font-mono"
              >
                Employee (Barber)
              </button>
              <button
                type="button"
                onClick={() => fillDevAccount("customer@barberparadise.dev")}
                className="px-2 py-1 text-[10px] bg-background/50 hover:bg-amber-500/20 text-foreground/80 rounded border border-border transition-colors font-mono"
              >
                Customer
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border text-center">
            <div className="text-xs font-light text-foreground/50">
              ¿No tienes una cuenta?{" "}
              <Link
                href="/register"
                className="text-foreground hover:text-primary transition-colors font-medium tracking-wide"
              >
                Regístrate
              </Link>
            </div>
            <div>
              <Link
                href="/"
                className="text-xs font-light text-foreground/30 hover:text-foreground transition-colors uppercase tracking-widest"
              >
                Volver a la página web
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}