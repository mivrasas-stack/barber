"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, LockKeyhole, ArrowRight } from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dummyUsers } from "@/app/clientes/data";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // TEST CREDENTIALS
    const isAdmin = email === "admin@test.com" && password === "123456";
    const isBarber = email === "employee@test.com" && password === "123456";
    const isCustomer = email === "customer@test.com" && password === "123456";

    let redirectUrl = "";
    let role = "";

    if (isAdmin) {
      redirectUrl = "/admin";
      role = "admin";
    } else if (isBarber) {
      redirectUrl = "/barber";
      role = "barber";
    } else if (isCustomer) {
      redirectUrl = "/clientes";
      role = "client";
    }

    if (redirectUrl) {
      // Establecer sesión (simulada) por 1 día
      document.cookie = `barberia_session=${role}; path=/; max-age=86400; SameSite=Lax`;
      router.push(redirectUrl);
    } else {
      setError(
        "Credenciales inválidas. Usa:\n- Admin: admin@test.com\n- Barbero: employee@test.com\n- Cliente: customer@test.com\n(Contraseña para todos: 123456)"
      );
    }
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
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
        
        <div className="relative z-10 p-12 text-center">
          <Link href="/" className="text-4xl font-bold font-headline tracking-[0.3em] text-white hover:text-primary transition-colors">
            BARBER PARADISE
          </Link>
          <p className="mt-6 text-white/60 font-light tracking-widest uppercase text-sm">
            Exclusividad y Estilo
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 lg:p-24 relative overflow-hidden bg-background">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none -translate-x-1/3 translate-y-1/3" />

        <div className="w-full max-w-md bg-white/[0.02] backdrop-blur-3xl border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl space-y-10 relative z-10">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 border border-white/10 mb-2">
              <LockKeyhole className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-headline text-white tracking-wide">
              BIENVENIDO <br />
              <span className="text-white/40">DE VUELTA</span>
            </h1>
            <p className="text-muted-foreground font-light text-sm">
              Ingresa a tu cuenta exclusiva.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium ml-1">
                Correo Electrónico
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-white/30" />
                </div>
                <Input 
                  id="email" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com" 
                  required 
                  className="bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-6 h-auto text-base text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all shadow-inner"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium">
                  Contraseña
                </Label>
                <Link href="#" className="text-[10px] uppercase tracking-wider text-primary hover:text-primary/80 transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockKeyhole className="h-5 w-5 text-white/30" />
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required 
                  className="bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-6 h-auto text-base text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all shadow-inner"
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-xs font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20 whitespace-pre-line">{error}</p>}

            <div className="pt-2">
              <PremiumButton type="submit" className="w-full justify-center py-6 text-sm tracking-widest group">
                INICIAR SESIÓN
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </PremiumButton>
            </div>
          </form>

          <div className="space-y-6 pt-6 border-t border-white/5 text-center">
            <div className="text-xs font-light text-white/50">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="text-white hover:text-primary transition-colors font-medium tracking-wide">
                Regístrate
              </Link>
            </div>
            <div>
              <Link href="/" className="text-xs font-light text-white/30 hover:text-white transition-colors uppercase tracking-widest">
                Volver a la página web
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}