import Link from "next/link";
import {Scissors,ShieldCheck,ArrowLeft} from "lucide-react";
export default function VerifiedBarberPage(){
 return <main className="min-h-screen bg-background text-foreground px-5 py-20">
  <div className="max-w-3xl mx-auto rounded-[2.25rem] bg-gradient-to-br from-amber-950/20 via-card to-background border border-amber-500/20 p-8 md:p-14 space-y-7">
   <Link href="/directorio" className="text-amber-400 text-sm inline-flex gap-2 items-center"><ArrowLeft className="w-4 h-4"/>Volver al directorio</Link>
   <Scissors className="w-14 h-14 text-amber-400"/>
   <h1 className="font-headline text-4xl md:text-5xl tracking-widest uppercase">Perfil del barbero</h1>
   <p className="text-white/60">Este perfil todavía no está publicado mediante datos verificados. No mostramos fotografías, valoraciones ni reservas de una persona ficticia.</p>
   <div role="status" className="flex gap-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 text-sm text-white/60"><ShieldCheck className="w-5 h-5 text-amber-400 shrink-0"/>Cuando el propietario autorice su publicación, podrás consultar aquí la información del profesional.</div>
  </div>
 </main>;
}
