import Link from "next/link";
import { LockKeyhole, ArrowLeft, Construction } from "lucide-react";

export default function FeatureUnavailablePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card/80 p-10 text-center shadow-lg space-y-6">
        <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-2xl bg-amber-500/10">
          <Construction className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-3xl font-headline uppercase">Módulo en preparación</h1>
        <p className="text-muted-foreground">
          Esta sección todavía se encuentra en certificación. No mostraremos cifras,
          reservas ni operaciones de demostración como si fueran datos reales.
        </p>
        <p className="text-xs text-muted-foreground flex gap-2 items-center justify-center">
          <LockKeyhole className="w-4 h-4" />
          Ninguna operación ha sido realizada.
        </p>
        <Link href="/" className="inline-flex gap-2 items-center px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
