"use client";
import {useState} from "react";
import Link from "next/link";
import {Clock,Scissors,MapPin,ArrowRight,UserCircle} from "lucide-react";
import {ExperiencePage,glass,Status,useLive,money,type Option} from "./experience-shared";
export default function PremiumServices(){
 const catalog=useLive<Option[]>("/api/v1/customers/booking-options");
 const [tenant,setTenant]=useState("");
 const rows=(catalog.data||[]).filter(x=>!tenant||x.tenantId===tenant);
 const tenants=[...new Map((catalog.data||[]).map(x=>[x.tenantId,{id:x.tenantId,name:x.tenantName}])).values()];
 return <ExperiencePage title="Nuestros servicios" subtitle="Servicios y cortes configurados por barberías reales, con sus profesionales, duración y precio publicado.">
  <Status error={catalog.error} loading={catalog.loading}/>
  <div className={glass+" p-5 flex flex-wrap gap-4 items-center"}>
   <Scissors className="w-5 h-5 text-emerald-400"/>
   <label htmlFor="filter-service-tenant" className="text-sm text-white/60">Filtrar por barbería</label>
   <select id="filter-service-tenant" value={tenant} onChange={e=>setTenant(e.target.value)} className="rounded-xl px-4 py-3 bg-black/60 border border-white/10 text-white text-sm flex-1 max-w-md">
    <option value="">Todas las barberías disponibles</option>
    {tenants.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
   </select>
  </div>
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
   {rows.map((x,i)=><article key={[x.tenantId,x.locationId,x.staffId,x.serviceId].join(":")} className={glass+" group relative p-7 space-y-6 hover:border-emerald-500/30 transition-colors overflow-hidden"}>
    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-[55px] group-hover:bg-emerald-500/15"/>
    <div className="relative flex justify-between items-start"><div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Scissors className="w-7 h-7 text-emerald-400"/></div>
     <span className="font-semibold text-amber-300">{money(x.priceMinor)}</span>
    </div>
    <div className="space-y-3 relative">
     <h3 className="text-xl uppercase tracking-widest font-headline">{x.serviceName}</h3>
     <p className="text-xs text-amber-400 font-semibold">{x.tenantName}</p>
     <p className="text-sm text-white/55 flex gap-2 items-center"><UserCircle className="w-4 h-4"/> {x.staffName}</p>
     <p className="text-sm text-white/55 flex gap-2 items-center"><MapPin className="w-4 h-4"/> {x.locationName}</p>
     <p className="text-xs text-white/50 flex gap-2 items-center"><Clock className="w-4 h-4"/> {x.durationMinutes} minutos</p>
    </div>
    <Link href={"/customers/appointments?service="+encodeURIComponent([x.tenantId,x.locationId,x.staffId,x.serviceId].join(":"))}
     className="inline-flex gap-2 items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-amber-300 hover:bg-amber-500/20 transition-colors text-sm">
     Reservar con este barbero <ArrowRight className="w-4 h-4"/>
    </Link>
   </article>)}
  </div>
  {!catalog.loading&&!rows.length&&<Status empty="No hay servicios activos configurados para esta selección. No mostramos cortes de demostración."/>}
 </ExperiencePage>;
}
