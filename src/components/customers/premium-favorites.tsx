"use client";
import {useMemo,useState} from "react";
import {Heart,Building2,Scissors,MapPin,CheckCircle2} from "lucide-react";
import {ExperiencePage,glass,Status,useLive,writeLive,type CustomerMe,type Option} from "./experience-shared";
type Favorite={id:string;tenantId:string;tenantName:string;targetType:string;targetId:string;targetName:string};
type Candidate={tenantId:string;targetType:"TENANT"|"STAFF";targetId:string;name:string;tenantName:string};
export default function PremiumFavorites(){
 const current=useLive<Favorite[]>("/api/v1/customers/me/favorites");
 const me=useLive<CustomerMe>("/api/v1/customers/me");
 const options=useLive<Option[]>("/api/v1/customers/booking-options");
 const [busy,setBusy]=useState("");const [error,setError]=useState("");
 const candidates=useMemo(()=>{
  const active=me.data?.relationships.filter(x=>x.status==="ACTIVE")||[];
  const linked=new Set(active.map(x=>x.tenantId));
  const shops:Candidate[]=active.map(x=>({tenantId:x.tenantId,tenantName:x.tenantName,targetType:"TENANT",targetId:x.tenantId,name:x.tenantName}));
  const barbers:Candidate[]=(options.data||[]).filter(x=>linked.has(x.tenantId)).map(x=>({
   tenantId:x.tenantId,tenantName:x.tenantName,targetType:"STAFF",targetId:x.staffId,name:x.staffName}));
  return [...new Map([...shops,...barbers].map(x=>[x.targetType+":"+x.targetId,x])).values()];
 },[me.data,options.data]);
 const saved=new Set((current.data||[]).map(x=>x.targetType+":"+x.targetId));
 async function toggle(item:Candidate){
  const key=item.targetType+":"+item.targetId;setBusy(key);setError("");
  try{await writeLive("/api/v1/customers/me/favorites",saved.has(key)?"DELETE":"POST",{
   tenantId:item.tenantId,targetType:item.targetType,targetId:item.targetId,
  });current.reload();}catch(e){setError(e instanceof Error?e.message:"Error al guardar favorito")}
  finally{setBusy("")}
 }
 return <ExperiencePage title="Mis Favoritos" subtitle="Guarda tus barberías y profesionales preferidos, sincronizados con tu cuenta y las barberías vinculadas.">
  <Status loading={current.loading||me.loading||options.loading} error={error||current.error||me.error||options.error}/>
  <div className={glass+" p-6 flex gap-4 items-center"}><Heart className="w-8 h-8 text-rose-400"/><div>
   <p className="font-headline uppercase tracking-widest text-xl">{saved.size} favoritos guardados</p>
   <p className="text-white/50 text-sm">Guardados en PostgreSQL para tu usuario.</p>
  </div></div>
  {current.data&&current.data.length>0&&<section className="space-y-5">
   <h2 className="font-headline text-xl uppercase tracking-widest text-amber-300">Tu colección</h2>
   <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{current.data.map(x=><div key={x.id} className={glass+" p-6 flex items-center gap-4"}>
    <Heart className="w-6 h-6 text-rose-400 fill-rose-500/20"/>
    <div><p className="font-semibold">{x.targetName}</p><p className="text-xs text-white/45">{x.tenantName} · {x.targetType==="STAFF"?"Barbero":"Barbería"}</p></div>
   </div>)}</div>
  </section>}
  <section className="space-y-5">
   <h2 className="font-headline text-xl uppercase tracking-widest">Descubre y guarda</h2>
   <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{candidates.map(c=>{
    const key=c.targetType+":"+c.targetId;const selected=saved.has(key);
    return <article key={key} className={glass+" p-7 relative space-y-5"}>
     <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
      {c.targetType==="TENANT"?<Building2 className="w-7 h-7 text-rose-400"/>:<Scissors className="w-7 h-7 text-rose-400"/>}
     </div>
     <div><h3 className="text-xl font-headline uppercase tracking-widest">{c.name}</h3>
      <p className="text-xs text-white/45 flex gap-2 items-center mt-3"><MapPin className="w-4 h-4"/>{c.tenantName}</p></div>
     <button type="button" disabled={busy===key} onClick={()=>void toggle(c)}
      className={"w-full rounded-full border px-5 py-3 flex justify-center gap-2 items-center font-semibold text-sm transition-colors "+(selected?"border-rose-400/40 bg-rose-500/15 text-rose-300":"border-white/20 hover:border-rose-400/40 text-white/80")}>
      {selected?<><CheckCircle2 className="w-4 h-4"/>Guardado · Quitar</>:<><Heart className="w-4 h-4"/>Agregar a favoritos</>}
     </button>
    </article>;
   })}</div>
   {!me.loading&&!candidates.length&&<Status empty="Vincúlate a una barbería mediante su QR para guardar sus barberos y tu establecimiento favorito."/>}
  </section>
 </ExperiencePage>;
}
