"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ShieldCheck,Scissors,Building2,ArrowRight,UserCircle2} from "lucide-react";
type ProfessionalResult={data?:{profile?:{displayName?:string;professionalSlug?:string};
 workspace?:{tenantId?:string};
 subscription?:{status?:string};
 plan?:{name?:string}};error?:string};

export default function ProfessionalDashboardPage(){
 const [details,setDetails]=useState<ProfessionalResult["data"]|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
  let alive=true;
  fetch("/api/v1/professionals/me",{cache:"no-store",credentials:"same-origin"}).then(async r=>{
   const result:ProfessionalResult=await r.json();
   if(!r.ok)throw Error(r.status===404?"Tu cuenta aún no tiene un perfil profesional habilitado.":result.error||"No se pudo cargar el perfil profesional");
   if(alive)setDetails(result.data||null);
  }).catch(e=>{if(alive)setError(e instanceof Error?e.message:"Error de conexión")})
   .finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[]);
 return <main className="min-h-[75vh] max-w-6xl mx-auto py-10 px-5 md:px-8 space-y-9 relative">
  <div className="pointer-events-none absolute -top-12 right-0 w-80 h-80 rounded-full bg-amber-500/10 blur-[90px]"/>
  <div className="relative">
   <p className="text-amber-400 tracking-[0.25em] uppercase text-xs flex gap-2 items-center">
    <ShieldCheck className="w-4 h-4"/> Espacio profesional seguro
   </p>
   <h1 className="mt-4 text-4xl md:text-6xl font-headline uppercase tracking-widest bg-gradient-to-r from-amber-100 via-amber-400 to-amber-700 bg-clip-text text-transparent">Mi espacio profesional</h1>
   <p className="mt-4 text-white/50 max-w-2xl">Tu cuenta y suscripciones se consultan directamente al servidor. No mostramos ingresos, citas ni clientes de demostración.</p>
  </div>
  {loading&&<p className="rounded-3xl bg-white/[0.04] border border-white/10 p-8 text-white/50">Cargando tu perfil real…</p>}
  {error&&<div role="alert" className="rounded-3xl bg-amber-500/[0.05] border border-amber-500/30 p-8 space-y-3">
   <p className="font-semibold text-amber-200">{error}</p>
   <p className="text-sm text-white/50">Si todavía no eres profesional independiente, primero completa el registro correspondiente.</p>
   <Link className="inline-flex gap-2 items-center text-amber-400 text-sm" href="/register/professional">Registrar mi perfil <ArrowRight className="w-4 h-4"/></Link>
  </div>}
  {details&&<div className="grid md:grid-cols-2 gap-5">
   <section className="rounded-[2rem] border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-card/80 to-black/80 backdrop-blur-3xl p-8 space-y-5 shadow-2xl">
    <UserCircle2 className="w-12 h-12 text-amber-400"/>
    <div><p className="text-xs text-amber-400 uppercase tracking-widest">Perfil verificado</p>
     <h2 className="text-2xl font-headline uppercase tracking-widest mt-2">{details.profile?.displayName||"Perfil sin nombre comercial"}</h2>
    </div>
    <p className="text-sm text-white/50">{details.profile?.professionalSlug?"URL del profesional: "+details.profile.professionalSlug:"Aún no tienes URL pública configurada."}</p>
   </section>
   <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] backdrop-blur-3xl p-8 space-y-5">
    <Building2 className="w-12 h-12 text-amber-400"/>
    <div><p className="text-xs text-white/50 uppercase tracking-widest">Plan y workspace</p>
     <h2 className="text-xl font-headline uppercase tracking-wider mt-2">{details.plan?.name||"Sin plan comercial asignado"}</h2>
    </div>
    <p className="text-sm text-white/50">Suscripción: {details.subscription?.status||"Sin suscripción vigente"}</p>
    <p className="text-xs text-white/40">Los datos financieros y agendas se habilitan únicamente desde módulos certificados.</p>
   </section>
  </div>}
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex items-center gap-4">
   <Scissors className="w-7 h-7 text-amber-400 shrink-0"/>
   <p className="text-sm text-white/60">Los módulos profesionales no certificados están temporalmente restringidos. Tus datos reales permanecen guardados.</p>
  </div>
 </main>;
}
