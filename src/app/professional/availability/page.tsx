"use client";

import { useState } from "react";
import { Clock, Calendar, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/ui/premium-button";

export default function ProfessionalAvailabilityPage() {
  const [saved, setSaved] = useState(false);
  const [days, setDays] = useState([
    { day: "Lunes", dayNum: 1, enabled: true, start: "09:00", end: "19:00" },
    { day: "Martes", dayNum: 2, enabled: true, start: "09:00", end: "19:00" },
    { day: "Miércoles", dayNum: 3, enabled: true, start: "09:00", end: "19:00" },
    { day: "Jueves", dayNum: 4, enabled: true, start: "09:00", end: "19:00" },
    { day: "Viernes", dayNum: 5, enabled: true, start: "09:00", end: "20:00" },
    { day: "Sábado", dayNum: 6, enabled: true, start: "08:00", end: "19:00" },
    { day: "Domingo", dayNum: 0, enabled: false, start: "10:00", end: "16:00" },
  ]);

  const toggleDay = (dayNum: number) => {
    setDays((prev) =>
      prev.map((d) => (d.dayNum === dayNum ? { ...d, enabled: !d.enabled } : d))
    );
  };

  const updateTime = (dayNum: number, field: "start" | "end", val: string) => {
    setDays((prev) =>
      prev.map((d) => (d.dayNum === dayNum ? { ...d, [field]: val } : d))
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-foreground">
            Horarios de Disponibilidad
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configura los días y rangos horarios en los que aceptas reservas automáticas.
          </p>
        </div>

        <PremiumButton size="sm" onClick={handleSave}>
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-1.5 text-emerald-500" />
              Guardado con éxito
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1.5" />
              Guardar Horarios
            </>
          )}
        </PremiumButton>
      </div>

      {/* Days List */}
      <div className="p-6 rounded-2xl border border-border/60 bg-background/60 space-y-4">
        {days.map((d) => (
          <div
            key={d.dayNum}
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
              d.enabled
                ? "border-border/60 bg-muted/20"
                : "border-border/30 bg-muted/5 opacity-50"
            }`}
          >
            <div className="flex items-center gap-4">
              <Switch
                checked={d.enabled}
                onCheckedChange={() => toggleDay(d.dayNum)}
              />
              <span className="font-semibold text-sm text-foreground w-24">
                {d.day}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] py-0 ${
                  d.enabled ? "text-emerald-500 border-emerald-500/30" : "text-muted-foreground"
                }`}
              >
                {d.enabled ? "Disponible" : "Cerrado"}
              </Badge>
            </div>

            {d.enabled && (
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Desde:</span>
                  <input
                    type="time"
                    value={d.start}
                    onChange={(e) => updateTime(d.dayNum, "start", e.target.value)}
                    className="bg-background border border-border/60 rounded px-2 py-1 font-mono text-xs text-foreground"
                  />
                </div>
                <span className="text-muted-foreground">—</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Hasta:</span>
                  <input
                    type="time"
                    value={d.end}
                    onChange={(e) => updateTime(d.dayNum, "end", e.target.value)}
                    className="bg-background border border-border/60 rounded px-2 py-1 font-mono text-xs text-foreground"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
