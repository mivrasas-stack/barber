import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[100] backdrop-blur-sm">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 border-2 border-amber-500/20 rounded-full animate-ping" />
          <div className="w-16 h-16 rounded-full bg-foreground/5 border border-border flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.15)]">
             <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        </div>
        <p className="text-amber-500/80 font-headline tracking-[0.2em] uppercase text-xs animate-pulse">
          Cargando Módulo...
        </p>
      </div>
    </div>
  );
}
