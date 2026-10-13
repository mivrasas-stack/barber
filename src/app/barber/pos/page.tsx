"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {Receipt,ShoppingCart,RefreshCw,CheckCircle2,AlertCircle,Plus,Minus} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import WaitingRoomCheckout from "@/components/pos/waiting-room-checkout";
type Product={id:string;type:"SERVICE"|"PRODUCT";name:string;priceMinor:string;stock?:number|null};
type ReceiptData={id:string;orderNumber:string;status:string;grandTotalMinor:string;changeDueMinor:string};
type Catalog={tenantId:string;locationId:string;locationName:string;items:Product[]};
type CartLine={item:Product;qty:number};
function money(amount:bigint|string){
 const minor=BigInt(amount);
 const whole=minor/100n,dec=minor%100n;
 return "$ "+whole.toLocaleString("es-CO")+(dec!==0n?","+dec.toString().padStart(2,"0"):"")+" COP";
}
function fromCop(value:string){
 if(!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim()))throw new Error("Ingresa un monto válido en COP");
 const [whole,dec=""]=value.trim().replace(",",".").split(".");
 return BigInt(whole)*100n+BigInt((dec+"00").slice(0,2));
}
export default function BarberPOSPage(){
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [cart,setCart]=useState<CartLine[]>([]);
 const [search,setSearch]=useState("");
 const [name,setName]=useState("");
 const [received,setReceived]=useState("");
 const [cashConfirmed,setCashConfirmed]=useState(false);
 const [loading,setLoading]=useState(true);
 const [paying,setPaying]=useState(false);
 const [error,setError]=useState("");
 const [result,setResult]=useState<ReceiptData|null>(null);
 const [key,setKey]=useState(()=>crypto.randomUUID());
 const reload=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const resp=await fetch("/api/v1/pos/catalog",{cache:"no-store"});
   const data=await resp.json();
   if(!resp.ok)throw new Error(data.error||"No tienes acceso al catálogo del POS");
   setCatalog(data.data);
  }catch(e){setError(e instanceof Error?e.message:"No se pudo cargar caja");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void reload();},[reload]);
 function change(item:Product,delta:number){
  setResult(null);setCashConfirmed(false);setKey(crypto.randomUUID());
  setCart(prev=>{
   const before=prev.find(x=>x.item.id===item.id);
   const next=(before?.qty||0)+delta;
   const stock=item.type==="PRODUCT"?item.stock:null;
   if(stock!==null&&stock!==undefined&&next>stock)return prev;
   return [...prev.filter(x=>x.item.id!==item.id),...(next>0?[{item,qty:next}]:[])];
  });
 }
 const total=useMemo(()=>cart.reduce((sum,x)=>sum+BigInt(x.item.priceMinor)*BigInt(x.qty),0n),[cart]);
 const filtered=(catalog?.items||[]).filter(x=>x.name.toLowerCase().includes(search.toLowerCase()));
 async function checkout(){
  if(!catalog||!cart.length||!cashConfirmed)return;
  setPaying(true);setError("");setResult(null);
  try{
   const receivedMinor=received?fromCop(received):total;
   if(receivedMinor<total)throw new Error("El efectivo recibido debe cubrir el total");
   const response=await fetch("/api/v1/pos/sale",{
    method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":key},
    body:JSON.stringify({
     checkoutKey:key,locationId:catalog.locationId,customerName:name,
     amountReceivedMinor:receivedMinor.toString(),
     items:cart.map(x=>({id:x.item.id,type:x.item.type,quantity:x.qty})),
    }),
   });
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.error||"No se confirmó la venta");
   if(payload.data.status!=="COMPLETED")throw new Error("La venta no quedó completada");
   setResult(payload.data);
   setCart([]);setReceived("");setName("");setCashConfirmed(false);setKey(crypto.randomUUID());
   await reload();
  }catch(e){setError(e instanceof Error?e.message:"El cobro no fue confirmado");}
  finally{setPaying(false);}
 }
 return <div className="pb-20 space-y-8">
  <header className="flex flex-wrap justify-between items-center gap-3">
   <div><p className="text-xs text-amber-500 tracking-widest uppercase">Caja real y contabilidad</p>
    <h1 className="font-headline text-4xl uppercase mt-2">Punto de Venta</h1>
    <p className="text-sm text-muted-foreground mt-2">{catalog?.locationName||"Selecciona un workspace autorizado"}</p></div>
   <Button onClick={()=>void reload()} variant="outline" disabled={loading||paying}><RefreshCw className="w-4 h-4 mr-2"/>Actualizar productos</Button>
  </header>
  {error&&<div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 p-4 flex gap-2"><AlertCircle className="w-5 h-5"/>{error}</div>}
  {result&&<div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-2">
   <h2 className="font-semibold flex gap-2"><CheckCircle2 className="text-emerald-500"/>Venta confirmada en PostgreSQL</h2>
   <p className="text-sm">Orden {result.orderNumber}</p>
   <p>Total: {money(result.grandTotalMinor)} · Cambio: {money(result.changeDueMinor)}</p>
   <Button variant="outline" onClick={()=>window.print()}><Receipt className="w-4 h-4 mr-2"/>Imprimir comprobante</Button>
  </div>}
  <WaitingRoomCheckout/>
  <div className="grid lg:grid-cols-5 gap-6">
   <section className="lg:col-span-3 space-y-4">
    <Input aria-label="Buscar en catálogo POS" placeholder="Buscar servicio o producto real" value={search} onChange={e=>setSearch(e.target.value)}/>
    {loading?<p className="text-muted-foreground">Cargando catálogo del backend…</p>:<div className="grid sm:grid-cols-2 gap-3">
     {filtered.map(item=>{
      const qty=cart.find(c=>c.item.id===item.id)?.qty||0;
      return <article key={item.type+item.id} className="rounded-xl bg-card border border-border p-4 space-y-3">
       <div className="text-xs uppercase text-amber-500">{item.type==="PRODUCT"?"Producto":"Servicio"}</div>
       <h3 className="font-semibold">{item.name}</h3><p>{money(item.priceMinor)}</p>
       {item.stock!==undefined&&item.stock!==null&&<p className="text-xs text-muted-foreground">Disponible: {item.stock}</p>}
       <div className="flex justify-end gap-2 items-center">
        <Button variant="outline" size="sm" aria-label={"Quitar "+item.name} onClick={()=>change(item,-1)} disabled={qty===0||paying}><Minus className="w-4 h-4"/></Button>
        <span>{qty}</span>
        <Button size="sm" aria-label={"Agregar "+item.name} onClick={()=>change(item,1)}
         disabled={paying||(item.stock!==undefined&&item.stock!==null&&qty>=item.stock)}><Plus className="w-4 h-4"/></Button>
       </div>
      </article>;
     })}
    </div>}
    {!loading&&filtered.length===0&&<p className="text-muted-foreground">No hay servicios ni productos activos para esta sede.</p>}
   </section>
   <section className="lg:col-span-2 space-y-5 rounded-2xl border border-border bg-card/80 p-6 h-fit">
    <h2 className="font-headline uppercase text-xl flex items-center gap-2"><ShoppingCart className="w-5 h-5"/>Carrito</h2>
    {cart.map(x=><div className="flex justify-between text-sm gap-2" key={x.item.id}>
     <span>{x.qty} × {x.item.name}</span><span className="whitespace-nowrap">{money(BigInt(x.item.priceMinor)*BigInt(x.qty))}</span>
    </div>)}
    {cart.length===0&&<p className="text-muted-foreground text-sm">Agrega productos o servicios del catálogo real.</p>}
    <div className="border-t pt-3 text-lg font-semibold flex justify-between"><span>Total</span><span>{money(total)}</span></div>
    <div className="space-y-1"><Label htmlFor="pos-customer">Nombre del cliente (opcional)</Label>
     <Input id="pos-customer" maxLength={255} value={name} onChange={e=>setName(e.target.value)}/></div>
    <div className="space-y-1"><Label htmlFor="cash-received">Efectivo recibido (COP, en blanco = total)</Label>
     <Input id="cash-received" inputMode="decimal" placeholder={(total/100n).toString()} value={received} onChange={e=>{setReceived(e.target.value);setCashConfirmed(false);}}/></div>
    <label className="text-xs flex items-start gap-2">
     <input type="checkbox" checked={cashConfirmed} onChange={e=>setCashConfirmed(e.target.checked)}/>
     Confirmo que ya recibí el efectivo físicamente. No usar para Wompi ni pagos pendientes.
    </label>
    <Button className="w-full h-12" disabled={paying||!cart.length||!cashConfirmed||loading} onClick={()=>void checkout()}>
     {paying?"Confirmando con el servidor…":"Registrar cobro REAL"}
    </Button>
    <p className="text-xs text-muted-foreground">El recibo solo aparece si el servidor completó la orden, registró el inventario y asentó el cobro.</p>
   </section>
  </div>
 </div>;
}
