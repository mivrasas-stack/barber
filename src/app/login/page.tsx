"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dummyUsers } from "@/app/dashboard/data";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const user = dummyUsers.find((u) => u.email === email);
    const isTestCustomer = email === "customer@test.com";

    if ((user || isTestCustomer) && password === "123456") {
      router.push("/portal");
    } else {
      setError("Credenciales incorrectas. (Pista: usa admin@test.com y contraseña 123456)");
    }
  };
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Image */}
      <div className="hidden lg:flex relative w-1/2 items-center justify-center">
        <Image
          src="https://images.pexels.com/photos/2079168/pexels-photo-2079168.jpeg"
          alt="Barber atmosphere"
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
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 sm:p-12 lg:p-24 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="w-full max-w-md space-y-12">
          
          <div className="text-center lg:text-left space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold font-headline text-white tracking-wide">
              BIENVENIDO <br />
              <span className="text-white/40">DE VUELTA</span>
            </h1>
            <p className="text-muted-foreground font-light text-lg">
              Ingresa a tu cuenta para gestionar tus citas.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Correo Electrónico
              </Label>
              <Input 
                id="email" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com" 
                required 
                className="bg-transparent border-0 border-b border-white/20 rounded-none px-0 py-4 h-auto text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Contraseña
              </Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required 
                className="bg-transparent border-0 border-b border-white/20 rounded-none px-0 py-4 h-auto text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
              />
            </div>

            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

            <div className="pt-4">
              <PremiumButton type="submit" className="w-full justify-center">
                Iniciar Sesión
              </PremiumButton>
            </div>
          </form>

          <div className="space-y-6 pt-8 border-t border-white/10 text-center lg:text-left">
            <div className="text-sm font-light text-muted-foreground">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="text-white hover:text-primary transition-colors font-medium">
                Regístrate
              </Link>
            </div>
            <div>
              <Link href="/" className="text-sm font-light text-muted-foreground hover:text-white transition-colors">
                &larr; Volver a la página web
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}