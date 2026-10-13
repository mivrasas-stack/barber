"use client";
import {useEffect,useState,type ReactNode} from "react";
import Link from "next/link";
import {ArrowLeft,ShieldCheck} from "lucide-react";
export const glass="rounded-[2rem] border border-white/10 bg-white/[0.035] backdrop-blur-3xl shadow-[0_25px_75px_rgba(0,0,0,0.32)]";
export const money=(value:string|number|bigint)=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Number(value)/100);
export function useLive<T>(endpoint:string){
 const [data,setData]=useState<T|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [version,setVersion]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError("");
  fetch(endpoint,{cache:"no-store",credentials:"same-origin"}).then(async response=>{
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error||"No fue posible consultar el servidor");
   if(active)setData(payload.data);
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Error de conexión")})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[endpoint,version]);
 return {data,error,loading,reload:()=>setVersion(v=>v+1)};
}
export async function writeLive(url:string,method:"POST"|"DELETE",body:unknown){
 const resp=await fetch(url,{method,headers:{"Content-Type":"application/json"},
  credentials:"same-origin",body:JSON.stringify(body)});
 const payload=await resp.json();
 if(!resp.ok)throw Error(payload.error||"No se pudo guardar");
 return payload;
}
export function ExperiencePage({title,subtitle,eyebrow,children}:{
 title:string;subtitle:string;eyebrow?:string;children:ReactNode;
}){
 return <main className="relative pb-24 min-h-[80vh] max-w-6xl mx-auto space-y-8">
  <div className="pointer-events-none fixed top-20 right-0 w-[45vw] h-[45vw] rounded-full bg-amber-500/[0.06] blur-[130px]"/>
  <div className="relative pt-3 md:pt-8 space-y-5">
   <Link href="/customers" className="inline-flex items-center gap-2 text-xs text-white/50 uppercase font-headline tracking-[0.2em] hover:text-amber-400"><ArrowLeft className="w-4 h-4"/> Panel principal</Link>
   <div className="space-y-3">
    <p className="text-amber-500 uppercase tracking-[0.25em] font-headline text-xs">{eyebrow||"Barber Paradise · Exclusivo para ti"}</p>
    <h1 className="text-4xl md:text-6xl font-headline tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-100 via-amber-400 to-amber-600">{title}</h1>
    <p className="text-white/50 max-w-2xl">{subtitle}</p>
   </div>
  </div>
  {children}
 </main>;
}
export function Status({error,loading,empty}:{error?:string;loading?:boolean;empty?:string}){
 if(error)return <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-red-300">{error}</p>;
 if(loading)return <div className={glass+" p-8 text-white/50"}>Consultando los datos de tu cuenta…</div>;
 if(empty)return <div className={glass+" p-8 text-white/50 flex items-center gap-3"}><ShieldCheck className="w-5 h-5 text-amber-400"/>{empty}</div>;
 return null;
}
export type Relationship={tenantId:string;tenantName:string;status:string;firstSeenAt:string};
export type CustomerMe={user:{id:string;name:string;email:string};relationships:Relationship[];
 appointments:Array<{id:string;tenantId:string;tenantName:string;locationId:string;locationName:string;staffName:string;
  status:string;startsAt:string;endsAt:string;timezone:string;services:Array<{name:string;priceMinor:number}>}>};
export type Option={tenantId:string;tenantName:string;locationId:string;locationName:string;staffId:string;
 staffName:string;serviceId:string;serviceName:string;priceMinor:number;durationMinutes:number;currency:string;timezone:string};
export type Product={tenantId:string;tenantName:string;locationId:string;locationName:string;
 productId:string;productName:string;description:string|null;brand:string|null;category:string;
 categorySlug:string|null;variantId:string;variantName:string;priceMinor:string;currency:string;
 available:boolean;availableUnits:number|null};
export type Loyalty={cuts:number;points:number;currentTier:string;nextTier:string|null;nextTierPoints:number|null;
 progress:number;pointsPerCut:number;amountSpentMinor:string;memberSince:string|null;
 perTenant:Array<{tenantId:string;cuts:number;points:number}>;
 badges:Array<{name:string;description:string;goal:number;unlocked:boolean}>};
