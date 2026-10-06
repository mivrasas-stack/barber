"use client";

import { useEffect, useState } from "react";
import { User, Globe, Instagram, Phone, Save, CheckCircle2, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PremiumButton } from "@/components/ui/premium-button";

export default function ProfessionalProfilePage() {
  const [profile, setProfile] = useState<any>({
    displayName: "Carlos 'The Barber' Mendoza",
    professionalSlug: "carlos-barber",
    bio: "Especialista en degradados, barboterapia y diseño de barba con más de 8 años de experiencia.",
    phonePublic: "+573009998877",
    instagram: "@carlosbarber_official",
    tiktok: "",
    yearsExperience: 8,
    bookingEnabled: true,
  });
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/professionals/me");
        if (res.ok) {
          const d = await res.json();
          if (d.profile) setProfile(d.profile);
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/professionals/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-foreground">
            Perfil Público & Enlace Web
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Personaliza cómo ven tus clientes tu perfil y marca personal en tu enlace de reservas.
          </p>
        </div>

        <PremiumButton type="submit" disabled={isSubmitting}>
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" />
              Guardado
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1.5" />
              Guardar Cambios
            </>
          )}
        </PremiumButton>
      </div>

      <div className="p-6 rounded-2xl border border-border/60 bg-background/60 space-y-5">
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/40">
          <div>
            <span className="font-semibold text-sm text-foreground">
              Aceptar Reservas Públicas
            </span>
            <p className="text-xs text-muted-foreground">
              Permite a los clientes agendar citas directamente desde tu enlace.
            </p>
          </div>
          <Switch
            checked={profile.bookingEnabled}
            onCheckedChange={(val) => setProfile({ ...profile, bookingEnabled: val })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dn">Nombre Profesional / Artístico</Label>
          <Input
            id="dn"
            value={profile.displayName}
            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug del Enlace Personal</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              barberparadise.dev/
            </span>
            <Input
              id="slug"
              value={profile.professionalSlug}
              onChange={(e) => setProfile({ ...profile, professionalSlug: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Biografía & Especialidad</Label>
          <Textarea
            id="bio"
            rows={3}
            value={profile.bio || ""}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ig">Instagram</Label>
            <Input
              id="ig"
              value={profile.instagram || ""}
              onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
              placeholder="@usuario"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono de Contacto</Label>
            <Input
              id="phone"
              value={profile.phonePublic || ""}
              onChange={(e) => setProfile({ ...profile, phonePublic: e.target.value })}
            />
          </div>
        </div>
      </div>
    </form>
  );
}
