"use client";

import React, { useState } from "react";
import { registerCustomerViaQr } from "@/lib/customer-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, CheckCircle2, UserCheck, Sparkles, Phone, Mail, User } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function QrRegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    setLoading(true);
    setTimeout(() => {
      registerCustomerViaQr({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
      });
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {!submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-card/90 border-border backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600/20 via-blue-500/10 to-transparent p-6 text-center border-b border-border/50">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-3 text-blue-400">
                  <QrCode className="w-7 h-7" />
                </div>
                <p className="text-xs uppercase tracking-widest text-blue-400 font-headline mb-1">Registro Rápido</p>
                <CardTitle className="text-2xl font-headline tracking-wide uppercase text-foreground">
                  Bienvenido a la Barbería
                </CardTitle>
                <CardDescription className="text-xs text-foreground/60 mt-1">
                  Completa un breve registro para ingresar al directorio de la barbería y recibir tus visitas.
                </CardDescription>
              </div>

              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs uppercase font-headline tracking-wider text-foreground/80 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-400" /> Nombre Completo <span className="text-blue-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      required
                      placeholder="Ej: Juan Pérez"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-muted/50 border-border rounded-xl h-12 text-sm focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs uppercase font-headline tracking-wider text-foreground/80 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-400" /> Teléfono / WhatsApp <span className="text-blue-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      placeholder="Ej: +57 300 123 4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-muted/50 border-border rounded-xl h-12 text-sm focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs uppercase font-headline tracking-wider text-foreground/60 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-foreground/40" /> Correo Electrónico (Opcional)
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ejemplo@correo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-muted/50 border-border rounded-xl h-12 text-sm focus:border-blue-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-headline uppercase tracking-widest text-sm shadow-lg shadow-blue-500/20 mt-4 transition-all"
                  >
                    {loading ? "Registrando..." : "Registrarme Ahora"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="bg-card/90 border-border backdrop-blur-xl shadow-2xl rounded-3xl p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-headline uppercase tracking-widest mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> ¡Registro Exitoso!
                </div>
                <h2 className="text-2xl font-headline tracking-wider uppercase text-foreground">
                  ¡Gracias, {formData.name.split(" ")[0]}!
                </h2>
                <p className="text-sm text-foreground/70 mt-2">
                  Tus datos han sido registrados en la barbería. Ya apareces en el módulo de clientes.
                </p>
              </div>

              <div className="pt-2">
                <Button asChild className="w-full h-12 rounded-xl bg-muted border border-border hover:bg-muted/80 text-foreground font-headline uppercase tracking-widest text-xs">
                  <Link href="/barber/customers">
                    <UserCheck className="w-4 h-4 mr-2 text-blue-400" />
                    Ir al Directorio de Clientes
                  </Link>
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
