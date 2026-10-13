import Link from "next/link";
import { ArrowLeft, Clock3, type LucideIcon } from "lucide-react";

export function CustomerModulePreview({
 title, description, Icon, accent,
}:{
 title:string;description:string;Icon:LucideIcon;accent:"amber"|"pink"|"purple"|"emerald"|"rose";
}){
 const textColors={
  amber:"text-amber-400",pink:"text-pink-400",purple:"text-purple-400",
  emerald:"text-emerald-400",rose:"text-rose-400",
 } as const;
 return <section className="relative max-w-5xl mx-auto min-h-[70vh] flex flex-col justify-center py-10 md:py-16">
  <div className="fixed -top-20 right-0 w-96 h-96 rounded-full bg-amber-600/10 blur-[130px] pointer-events-none"/>
  <div className="relative rounded-[2rem] border border-border bg-gradient-to-br from-amber-950/20 via-card/80 to-background p-8 md:p-14 space-y-8 shadow-[0_12px_80px_rgba(0,0,0,0.3)] overflow-hidden">
   <Link href="/customers" className="inline-flex gap-2 items-center text-sm text-foreground/60 hover:text-amber-400">
    <ArrowLeft className="w-4 h-4"/> Panel principal
   </Link>
   <div className="w-16 h-16 rounded-2xl border border-amber-500/20 bg-foreground/5 flex items-center justify-center">
    <Icon className={"w-8 h-8 "+textColors[accent]}/>
   </div>
   <div className="space-y-3">
    <p className="text-xs font-headline tracking-[0.25em] text-amber-500 uppercase">Barber Paradise · Portal de clientes</p>
    <h1 className="text-4xl md:text-6xl font-headline tracking-widest uppercase">{title}</h1>
    <p className="text-foreground/60 text-base max-w-xl">{description}</p>
   </div>
   <div className="flex gap-3 items-start border border-amber-500/20 bg-amber-500/5 rounded-2xl p-5">
    <Clock3 className="shrink-0 text-amber-400 w-5 h-5 mt-0.5"/>
    <div className="space-y-1">
     <p className="font-headline tracking-widest text-amber-400 uppercase text-sm">Módulo en preparación</p>
     <p className="text-sm text-foreground/60">Conservamos esta sección y su diseño. Aún no está habilitada para operar con clientes reales; no se mostrarán productos, turnos ni reseñas de demostración.</p>
    </div>
   </div>
   <Link href="/customers/appointments" className="inline-flex px-5 py-3 rounded-full border border-amber-500/30 hover:bg-amber-500/10 text-amber-400 font-semibold text-sm">Ver mis citas reales</Link>
  </div>
 </section>;
}
