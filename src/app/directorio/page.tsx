import Link from "next/link";
import {MapPin,ShieldCheck,ArrowRight} from "lucide-react";
export default function VerifiedDirectory(){
 return <main className="bg-background min-h-screen px-6 py-20 text-foreground">
  <div className="max-w-4xl mx-auto space-y-8">
   <Link href="/" className="text-amber-400 hover:text-amber-200 text-sm">← Volver al inicio</Link>
   <div className="relative rounded-[2.5rem] border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-card/80 to-background p-10 md:p-16 space-y-7 shadow-2xl">
    <div className="w-16 h-16 rounded-2xl border border-amber-500/20 bg-amber-500/10 flex items-center justify-center"><MapPin className="w-8 h-8 text-amber-400"/></div>
    <p className="text-amber-400 text-xs uppercase tracking-[0.25em]">Barber Paradise · Directorio</p>
    <h1 className="text-4xl md:text-6xl font-headline tracking-widest uppercase">Barberías verificadas</h1>
    <p className="text-white/55 max-w-xl leading-relaxed">El directorio público se está conectando con los negocios que autoricen expresamente su publicación. No mostramos establecimientos, reseñas, rankings ni reservas ficticias.</p>
    <div role="status" className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-6 py-5 flex gap-3">
     <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0"/>
     <p className="text-sm text-white/60">Todavía no hay establecimientos publicados y verificados para este listado.</p>
    </div>
    <Link href="/login" className="text-amber-400 inline-flex gap-2 items-center hover:text-amber-200 font-semibold text-sm">Acceder a mi cuenta <ArrowRight className="w-4 h-4"/></Link>
   </div>
  </div>
 </main>;
}
