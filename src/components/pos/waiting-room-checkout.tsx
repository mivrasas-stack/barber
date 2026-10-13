"use client";
import {useState} from "react";
import {CheckCircle2,Receipt,Search,Wallet} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {money} from "@/components/customers/experience-shared";
type Order={code:string;status:string;totalMinor:string;customer:string|null;items:Array<{description:string;quantity:number}>};
export default function WaitingRoomCheckout(){
 const [code,setCode]=useState("");
 const [data,setData]=useState<Order|null>(null);
 const [received,setReceived]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [paid,setPaid]=useState<{status:string;code:string;changeMinor:string;totalMinor:string}|null>(null);
 async function lookup(){
  setBusy(true);setError("");setData(null);setPaid(null);setConfirmed(false);
  try{
   const response=await fetch("/api/v1/pos/waiting-orders?code="+encodeURIComponent(code.trim()),{cache:"no-store"});
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error||"Pedido no encontrado");
   setData(payload.data);
  }catch(e){setError(e instanceof Error?e.message:"Error de consulta")}
  finally{setBusy(false)}
 }
 async function pay(){
  if(!data||!confirmed)return;
  setBusy(true);setError("");
  try{
   const raw=received.trim().replace(",",".");
   const cents=raw?BigInt(Math.round(Number(raw)*100)):BigInt(data.totalMinor);
   if(cents<BigInt(data.totalMinor))throw Error("El efectivo recibido es insuficiente");
   const response=await fetch("/api/v1/pos/waiting-orders",{method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({code:data.code,amountReceivedMinor:cents.toString()})});
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error||"No se confirmó el pago");
   if(payload.data.status!=="COMPLETED")throw Error("El pago no quedó completado");
   setPaid(payload.data);setConfirmed(false);setData({...data,status:"COMPLETED"});
  }catch(e){setError(e instanceof Error?e.message:"No se pudo completar el pago")}
  finally{setBusy(false)}
 }
 return <section className="rounded-[1.75rem] border border-amber-500/25 bg-gradient-to-br from-amber-950/20 via-card/80 to-background p-6 md:p-8 space-y-5">
  <div><p className="text-xs text-amber-400 tracking-widest uppercase">Pedidos de clientes en sala de espera</p>
   <h2 className="font-headline uppercase text-2xl mt-2 flex items-center gap-2"><Receipt className="w-6 h-6 text-amber-400"/>Cobrar con código</h2>
   <p className="text-xs text-muted-foreground mt-2">Busca el pedido de esta barbería, recibe efectivo y completa el cobro con inventario y contabilidad del POS.</p>
  </div>
  {error&&<p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-400">{error}</p>}
  <div className="flex gap-3 max-w-3xl">
   <Input aria-label="Código de pedido de sala de espera" placeholder="WR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    value={code} onChange={e=>{setCode(e.target.value);setData(null);setPaid(null);}}/>
   <Button type="button" variant="outline" disabled={busy||!code.trim()} onClick={()=>void lookup()}><Search className="w-4 h-4 mr-2"/>Consultar</Button>
  </div>
  {data&&<div className="rounded-2xl bg-black/30 border border-white/10 p-6 space-y-4">
   <div className="flex gap-3 flex-wrap justify-between"><div><p className="font-mono text-xs break-all">{data.code}</p>
    <h3 className="font-semibold mt-3">{data.customer||"Cliente"} · {data.status}</h3></div><p className="text-amber-300 font-bold text-xl">{money(data.totalMinor)}</p></div>
   {data.items.map((i,index)=><p key={index} className="text-sm text-white/65">{i.quantity} × {i.description}</p>)}
   {data.status==="DRAFT"&&<div className="border-t border-white/10 pt-4 max-w-sm space-y-4">
    <label className="text-sm block space-y-2">Efectivo recibido en COP (vacío = total exacto)
     <Input inputMode="decimal" value={received} onChange={e=>{setReceived(e.target.value);setConfirmed(false);}}/></label>
    <label className="flex gap-3 text-xs"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>
     Confirmo que recibí físicamente el efectivo. Esta operación descontará existencias y creará el movimiento contable.</label>
    <Button type="button" disabled={busy||!confirmed} onClick={()=>void pay()}><Wallet className="w-4 h-4 mr-2"/>Cobrar en caja</Button>
   </div>}
   {paid&&<p role="status" className="text-emerald-400 flex gap-2 items-center text-sm"><CheckCircle2 className="w-5 h-5"/>Cobro completado · Cambio: {money(paid.changeMinor)}</p>}
  </div>}
 </section>;
}
