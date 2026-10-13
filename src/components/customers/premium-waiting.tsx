"use client";
import {useMemo,useState} from "react";
import {Coffee,GlassWater,ShoppingCart,Plus,Minus,Ticket,Clock,CheckCircle2,Copy} from "lucide-react";
import {ExperiencePage,glass,Status,useLive,money,writeLive,type Product,type CustomerMe} from "./experience-shared";
type WaitingOrder={id:string;orderNumber:string;code?:string;status:string;totalMinor:string;createdAt:string;tenantId:string};
export default function PremiumWaiting(){
 const me=useLive<CustomerMe>("/api/v1/customers/me");
 const catalog=useLive<Product[]>("/api/v1/customers/me/products?waiting=true");
 const orders=useLive<WaitingOrder[]>("/api/v1/customers/me/waiting-orders");
 const [appointmentId,setAppointmentId]=useState("");
 const [cart,setCart]=useState<Record<string,number>>({});
 const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
 const [result,setResult]=useState<{code:string;totalMinor:string}|null>(null);
 const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const now=Date.now();
 const active=me.data?.appointments.filter(x=>
  ["CONFIRMED","IN_PROGRESS","ARRIVED"].includes(x.status)&&
  now>=new Date(x.startsAt).getTime()-3*3600000&&now<=new Date(x.endsAt).getTime()+3600000)||[];
 const selected=active.find(a=>a.id===appointmentId)||active[0];
 const products=(catalog.data||[]).filter(p=>!selected||(p.tenantId===selected.tenantId&&p.locationId===selected.locationId));
 const entries=products.filter(p=>cart[p.variantId]);
 const total=entries.reduce((sum,p)=>sum+BigInt(p.priceMinor)*BigInt(cart[p.variantId]),0n);
 function change(p:Product,delta:number){
  setResult(null);setRequestId(crypto.randomUUID());
  setCart(old=>{
   const available=p.availableUnits??5;
   const next=Math.min(Math.min(5,available),Math.max(0,(old[p.variantId]||0)+delta));
   return {...old,[p.variantId]:next};
  });
 }
 async function order(){
  if(!selected||!entries.length)return;
  setBusy(true);setError("");
  try{
   const response=await writeLive("/api/v1/customers/me/waiting-orders","POST",{
    appointmentId:selected.id,requestId,items:entries.map(p=>({variantId:p.variantId,quantity:cart[p.variantId]})),
   });
   setResult(response.data);setCart({});setRequestId(crypto.randomUUID());orders.reload();catalog.reload();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo guardar el pedido")}
  finally{setBusy(false)}
 }
 return <ExperiencePage title="Sala de espera" subtitle="Elige snacks, comida o bebidas ofrecidas por tu barbería. Realiza el pedido desde tu celular y paga en caja con el código generado.">
  <Status error={error||me.error||catalog.error||orders.error} loading={me.loading||catalog.loading||orders.loading}/>
  <section className={glass+" p-6 md:p-8 flex flex-wrap gap-4 justify-between items-center"}>
   <div><p className="text-xs text-amber-400 uppercase tracking-widest">Tu turno</p>
    <h2 className="font-headline uppercase text-xl tracking-widest mt-2">{selected?selected.tenantName:"Aún no estás en horario de sala de espera"}</h2>
    <p className="text-white/50 text-sm mt-2">{selected?new Date(selected.startsAt).toLocaleString("es-CO")+" · "+selected.locationName:
     "Puedes explorar el menú de tus barberías vinculadas. Para hacer un pedido necesitas una reserva activa dentro de las tres horas anteriores a tu cita."}</p>
   </div>
   {active.length>1&&<select value={selected?.id||""} onChange={e=>{setAppointmentId(e.target.value);setCart({});}}
    className="bg-black/60 border border-white/10 rounded-xl p-3 text-sm">{active.map(a=><option key={a.id} value={a.id}>{a.tenantName} · {a.locationName}</option>)}</select>}
  </section>
  <div className="grid xl:grid-cols-3 gap-6">
   <div className="xl:col-span-2 space-y-5">
    <h2 className="font-headline uppercase tracking-widest text-2xl flex items-center gap-2"><Coffee className="text-amber-400"/>Menú disponible</h2>
    <div className="grid sm:grid-cols-2 gap-4">{products.map((p,i)=><div key={p.locationId+":"+p.variantId} className={glass+" p-6 space-y-5 relative overflow-hidden"}>
     <div className="absolute right-0 -top-10 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl"/>
     <div className="flex justify-between relative"><div className="w-12 h-12 rounded-2xl border border-amber-500/20 bg-amber-500/10 flex items-center justify-center"><GlassWater className="w-6 h-6 text-amber-400"/></div><p className="text-amber-300 font-semibold">{money(p.priceMinor)}</p></div>
     <div><p className="text-xs text-amber-400 uppercase">{p.category}</p><h3 className="font-headline uppercase text-xl tracking-wider mt-2">{p.productName}</h3>
      <p className="text-white/45 text-xs mt-2">{p.tenantName} · {p.locationName} · {p.variantName}</p></div>
     <div className="flex justify-between items-center gap-3">
      <span className="text-xs text-white/45">{p.available?p.availableUnits===null?"En catálogo":"Disponibles: "+p.availableUnits:"Agotado"}</span>
      <div className="flex gap-3 items-center">
       <button type="button" aria-label={"Quitar "+p.productName} onClick={()=>change(p,-1)} disabled={!selected||!cart[p.variantId]} className="h-9 w-9 flex items-center justify-center border border-white/15 rounded-full disabled:opacity-30"><Minus className="w-4 h-4"/></button>
       <span>{cart[p.variantId]||0}</span>
       <button type="button" aria-label={"Agregar "+p.productName} onClick={()=>change(p,1)} disabled={!selected||!p.available||(p.availableUnits!==null&&(cart[p.variantId]||0)>=p.availableUnits)} className="h-9 w-9 flex items-center justify-center border border-amber-500/30 text-amber-300 rounded-full disabled:opacity-30"><Plus className="w-4 h-4"/></button>
      </div>
     </div>
    </div>)}</div>
    {!catalog.loading&&products.length===0&&<Status empty="Esta barbería aún no tiene comida o bebidas activas clasificadas para sala de espera."/>}
   </div>
   <section className={glass+" p-7 h-fit space-y-5 sticky top-28"}>
    <h2 className="text-xl font-headline uppercase tracking-widest flex gap-2 items-center"><ShoppingCart className="text-amber-400"/>Mi pedido</h2>
    {!entries.length?<p className="text-white/50 text-sm">Selecciona productos de tu barbería.</p>:entries.map(p=><div className="flex justify-between gap-3 text-sm" key={p.variantId}><span>{cart[p.variantId]} × {p.productName}</span><span>{money(BigInt(p.priceMinor)*BigInt(cart[p.variantId]))}</span></div>)}
    <div className="pt-5 border-t border-white/10 flex justify-between text-lg font-semibold"><span>Total estimado</span><span className="text-amber-400">{money(total.toString())}</span></div>
    <button type="button" disabled={!selected||!entries.length||busy} onClick={()=>void order()}
     className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-700 text-black font-semibold text-sm disabled:opacity-40">
     {busy?"Guardando pedido…":"Generar código para pagar en caja"}</button>
    <p className="text-xs text-white/45 flex items-start gap-2"><Clock className="w-4 h-4"/>No se cobra al pedir. La caja verifica disponibilidad y confirma el pago en efectivo.</p>
    {result&&<div role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3">
     <CheckCircle2 className="w-7 h-7 text-emerald-400"/><p className="text-xs uppercase text-emerald-400">Pendiente de pago en caja</p>
     <p className="font-mono text-sm break-all select-all">{result.code}</p>
     <button type="button" className="flex gap-2 text-xs items-center text-amber-300" onClick={()=>void navigator.clipboard.writeText(result.code)}><Copy className="w-4 h-4"/>Copiar código</button>
     <p className="text-xs">Muestra este código en caja para confirmar el pago de {money(result.totalMinor)}.</p>
    </div>}
   </section>
  </div>
  <section className={glass+" p-7 space-y-4"}><h3 className="font-headline uppercase tracking-widest text-xl flex gap-2"><Ticket className="text-amber-400"/>Mis códigos registrados</h3>
   <div className="grid md:grid-cols-2 gap-3">{orders.data?.map(x=><div key={x.id} className="rounded-xl border border-white/10 bg-black/30 p-5">
    <p className="font-mono text-xs break-all">{x.orderNumber}</p><p className="text-xs text-amber-300 mt-2">{x.status==="COMPLETED"?"Pagado en caja":x.status==="CANCELLED"?"Cancelado":"Pendiente de pago"}</p>
    <p className="font-semibold mt-2">{money(x.totalMinor)}</p>
   </div>)}</div>
   {!orders.data?.length&&<p className="text-white/45 text-sm">Todavía no has creado pedidos de sala de espera.</p>}
  </section>
 </ExperiencePage>;
}
