import Link from "next/link";
import { ArrowRight, BadgeCheck, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";

export interface LaunchLink {
  href: string;
  title: string;
  detail: string;
}
export function LaunchDashboard({ title, subtitle, links }: {
 title:string; subtitle:string; links:readonly LaunchLink[];
}) {
 return (
  <main className="min-h-screen bg-background px-6 py-12 lg:px-16 relative overflow-hidden">
   <div className="absolute top-0 right-0 w-[38vw] h-[38vw] bg-amber-500/[0.07] blur-[120px] rounded-full pointer-events-none"/>
   <div className="max-w-6xl mx-auto space-y-10 relative z-10">
    <div className="space-y-4">
     <p className="text-amber-500 text-xs tracking-widest uppercase flex gap-2 items-center">
      <ShieldCheck className="w-4 h-4" /> Accesos de la barbería
     </p>
     <div className="flex justify-between gap-3 items-center flex-wrap">
       <h1 className="font-headline text-4xl md:text-6xl tracking-widest uppercase bg-gradient-to-r from-amber-100 via-amber-400 to-amber-600 bg-clip-text text-transparent">{title}</h1>
       <LogoutButton title="Cerrar sesión" className="rounded-xl border border-border px-4 py-2 text-sm hover:border-red-500/40">Cerrar sesión</LogoutButton>
     </div>
     <p className="text-muted-foreground max-w-2xl">{subtitle}</p>
    </div>
    <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-5 py-4 flex gap-3 items-start">
     <BadgeCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"/>
     <p className="text-sm">Mostramos únicamente áreas habilitadas para esta etapa.
       Algunas operaciones y proveedores externos siguen en certificación y no se presentarán como reales hasta concluirla.</p>
    </div>
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-[165px]">
     {links.map((link,i)=><Link key={link.href} href={link.href}
       className={`group relative rounded-[2rem] border border-white/10 bg-gradient-to-br from-amber-950/20 via-card/85 to-background/95 hover:border-amber-500/40 transition-all backdrop-blur-3xl shadow-[0_15px_45px_rgba(0,0,0,0.25)] p-7 flex flex-col justify-end gap-4 overflow-hidden ${i===0?"md:row-span-2":""}`}>
       <span className="font-semibold flex justify-between gap-3">{link.title}<ArrowRight className="w-4 h-4 text-amber-500"/></span>
       <p className="text-sm text-muted-foreground">{link.detail}</p>
     </Link>)}
    </div>
   </div>
  </main>
 );
}
