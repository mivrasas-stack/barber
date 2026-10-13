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
  <main className="min-h-screen bg-background px-6 py-12 lg:px-16">
   <div className="max-w-6xl mx-auto space-y-10">
    <div className="space-y-4">
     <p className="text-amber-500 text-xs tracking-widest uppercase flex gap-2 items-center">
      <ShieldCheck className="w-4 h-4" /> Accesos de la barbería
     </p>
     <div className="flex justify-between gap-3 items-center flex-wrap">
       <h1 className="font-headline text-4xl md:text-5xl uppercase">{title}</h1>
       <LogoutButton title="Cerrar sesión" className="rounded-xl border border-border px-4 py-2 text-sm hover:border-red-500/40">Cerrar sesión</LogoutButton>
     </div>
     <p className="text-muted-foreground max-w-2xl">{subtitle}</p>
    </div>
    <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-5 py-4 flex gap-3 items-start">
     <BadgeCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"/>
     <p className="text-sm">Mostramos únicamente áreas habilitadas para esta etapa.
       Algunas operaciones y proveedores externos siguen en certificación y no se presentarán como reales hasta concluirla.</p>
    </div>
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
     {links.map(link=><Link key={link.href} href={link.href}
       className="group rounded-2xl border border-border bg-card/80 hover:border-amber-500/40 transition-colors p-6 space-y-3">
       <span className="font-semibold flex justify-between gap-3">{link.title}<ArrowRight className="w-4 h-4 text-amber-500"/></span>
       <p className="text-sm text-muted-foreground">{link.detail}</p>
     </Link>)}
    </div>
   </div>
  </main>
 );
}
