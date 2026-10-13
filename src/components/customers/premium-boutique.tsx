"use client";
import {useState} from "react";
import {motion} from "framer-motion";
import {ShoppingBag,Package,MapPin,Sparkles,ShieldCheck} from "lucide-react";
import {ExperiencePage,glass,Status,useLive,money,type Product} from "./experience-shared";
export default function PremiumBoutique(){
 const query=useLive<Product[]>("/api/v1/customers/me/products");
 const [shop,setShop]=useState("");
 const shops=[...new Map((query.data||[]).map(x=>[x.tenantId,{id:x.tenantId,name:x.tenantName}])).values()];
 const data=(query.data||[]).filter(x=>!shop||x.tenantId===shop);
 return <ExperiencePage title="Boutique prémium" subtitle="Productos reales de las barberías que tienes vinculadas. Precios y existencias provienen de sus catálogos en PostgreSQL.">
  <Status loading={query.loading} error={query.error}/>
  <div className={glass+" px-6 py-5 flex flex-wrap items-center gap-3"}>
   <Sparkles className="w-6 h-6 text-purple-400"/>
   <label className="text-sm text-white/60" htmlFor="boutique-shop">Barbería</label>
   <select id="boutique-shop" value={shop} onChange={e=>setShop(e.target.value)}
    className="rounded-xl bg-black/60 border border-white/10 px-4 py-3 flex-1 max-w-md text-sm">
    <option value="">Todas mis barberías vinculadas</option>
    {shops.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
   </select>
  </div>
  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
   {data.map((x,i)=><motion.article initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
    transition={{delay:Math.min(i*0.05,.5)}} key={x.locationId+":"+x.variantId}
    className={glass+" group overflow-hidden relative hover:border-purple-500/30 transition-colors"}>
    <div className="h-52 bg-gradient-to-br from-purple-950/30 via-black/70 to-amber-950/15 relative flex items-center justify-center overflow-hidden">
     <div className="absolute w-48 h-48 rounded-full blur-[65px] bg-purple-500/10 group-hover:bg-purple-500/20"/>
     <Package className="w-20 h-20 text-purple-300/30 group-hover:scale-110 transition-transform"/>
     <span className="absolute left-5 top-5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 text-xs text-purple-200 uppercase">{x.category}</span>
     <span className="absolute right-5 top-5 rounded-full bg-black/60 border border-white/10 px-3 py-2 text-xs">{x.available?"Disponible":"Agotado"}</span>
    </div>
    <div className="p-7 space-y-4">
     <p className="text-[11px] tracking-[0.2em] uppercase text-purple-400">{x.brand||x.tenantName}</p>
     <h2 className="font-headline text-xl uppercase tracking-widest">{x.productName}</h2>
     <p className="text-white/40 text-xs">{x.variantName}</p>
     <p className="text-sm text-white/55 min-h-10">{x.description||"Producto registrado por la barbería"}</p>
     <p className="text-xs text-white/50 flex gap-2 items-center"><MapPin className="w-4 h-4"/>{x.tenantName} · {x.locationName}</p>
     <div className="border-t border-white/10 pt-5 flex justify-between gap-2 items-center">
      <strong className="text-2xl text-amber-300">{money(x.priceMinor)}</strong>
      <span className="rounded-full border border-white/10 py-2 px-3 text-xs text-white/60 flex gap-2 items-center"><ShoppingBag className="w-4 h-4"/> {x.availableUnits===null?"Consulta en caja":x.availableUnits+" unidades"}</span>
     </div>
    </div>
   </motion.article>)}
  </div>
  {!query.loading&&!data.length&&<Status empty="Aún no hay productos activos en las barberías vinculadas. Vincúlate escaneando el QR de tu barbería."/>}
  <p className="text-xs text-white/40 flex gap-2 items-center"><ShieldCheck className="w-4 h-4 text-amber-400"/> Boutique de consulta: el pago online no se habilitará hasta certificar los procesos de pago y entrega. Los productos de sala de espera pueden pedirse para pagar en caja.</p>
 </ExperiencePage>;
}
