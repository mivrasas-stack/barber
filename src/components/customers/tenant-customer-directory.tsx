"use client";
import {useCallback,useEffect,useState} from "react";
import QRCode from "qrcode";
import {QrCode,Users,RefreshCw,Copy,CheckCircle2,Clock} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";

type Intake={id:string;name:string;phone:string;email:string|null;status:string;createdAt:string};
export default function TenantCustomerDirectory(){
 const [clients,setClients]=useState<Intake[]>([]);
 const [url,setUrl]=useState("");
 const [qr,setQr]=useState("");
 const [name,setName]=useState("");
 const [search,setSearch]=useState("");
 const [open,setOpen]=useState(false);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const reload=useCallback(async()=>{
  setBusy(true);setError("");
  try{
   const [list,registration]=await Promise.all([
    fetch("/api/v1/customers/intakes",{cache:"no-store"}),
    fetch("/api/v1/customers/qr",{cache:"no-store"})
   ]);
   if(!list.ok||!registration.ok)throw new Error("No se pudo cargar el directorio o el QR para este workspace");
   const [clientsData,qrData]=await Promise.all([list.json(),registration.json()]);
   setClients(clientsData.data);
   setUrl(qrData.data.url);
   setName(qrData.data.tenantName);
   setQr(await QRCode.toDataURL(qrData.data.url,{
    width:320,margin:2,color:{dark:"#1d4ed8",light:"#ffffff"}
   }));
  }catch(e){setError(e instanceof Error?e.message:"No se pudo consultar PostgreSQL");}
  finally{setBusy(false);}
 },[]);
 useEffect(()=>{void reload();},[reload]);
 const visible=clients.filter(c=>(c.name+" "+c.phone+" "+(c.email||"")).toLowerCase().includes(search.toLowerCase()));
 return <section className="min-h-screen space-y-8 pb-16">
  <div className="flex gap-4 justify-between items-end flex-wrap">
   <div>
    <p className="text-xs tracking-widest text-blue-500 uppercase">Directorio de clientes por barbería</p>
    <h1 className="text-4xl font-headline uppercase mt-2">Mis Clientes</h1>
    <p className="text-sm text-muted-foreground mt-2">{name||"Barbería activa"} · datos sincronizados con PostgreSQL</p>
   </div>
   <div className="flex gap-2">
    <Button variant="outline" onClick={()=>void reload()} disabled={busy}><RefreshCw className="w-4 h-4 mr-2"/>Actualizar</Button>
    <Button onClick={()=>setOpen(true)} disabled={!qr}><QrCode className="w-4 h-4 mr-2"/>Código QR</Button>
   </div>
  </div>
  {error&&<p role="alert" className="text-sm text-red-500">{error}</p>}
  <Input aria-label="Buscar clientes" placeholder="Buscar por nombre, teléfono o correo" value={search}
    onChange={e=>setSearch(e.target.value)} className="max-w-xl"/>
  <p className="text-xs text-muted-foreground">{visible.length} registros de esta barbería. Los no verificados son contactos, no cuentas autenticadas.</p>
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
   {visible.map(c=><article key={c.id} className="rounded-2xl border border-border bg-card/70 p-6 space-y-3">
    <div className="flex items-center gap-3"><span className="w-11 h-11 rounded-full bg-blue-500/10 flex items-center justify-center">
      <Users className="w-5 h-5 text-blue-500"/></span><h2 className="font-semibold">{c.name}</h2></div>
    <p className="text-sm">{c.phone}</p>
    {c.email&&<p className="text-sm text-muted-foreground break-all">{c.email}</p>}
    <div className="flex gap-2 items-center text-xs">
     {c.status==="LINKED"?<><CheckCircle2 className="w-4 h-4 text-emerald-500"/>Cuenta vinculada</>:
      <><Clock className="w-4 h-4 text-amber-500"/>Pendiente de verificar</>}
    </div>
    <p className="text-xs text-muted-foreground">Registrado: {new Date(c.createdAt).toLocaleDateString("es-CO")}</p>
   </article>)}
  </div>
  {visible.length===0&&!busy&&<p className="rounded-2xl border border-border p-8 text-muted-foreground text-center">No hay clientes registrados en este workspace.</p>}
  <Dialog open={open} onOpenChange={setOpen}>
   <DialogContent className="max-w-md">
    <DialogHeader><DialogTitle>QR de {name}</DialogTitle>
     <DialogDescription>Este código vincula únicamente a esta barbería. Muéstralo en el mostrador o compártelo.</DialogDescription>
    </DialogHeader>
    {qr&&<img src={qr} alt="QR para registro de clientes" className="mx-auto w-64 h-64 bg-white p-2 rounded-xl"/>}
    <p className="text-xs break-all text-muted-foreground">{url}</p>
    <Button onClick={()=>void navigator.clipboard.writeText(url)}><Copy className="w-4 h-4 mr-2"/>Copiar enlace</Button>
    <a className="text-center text-sm underline text-blue-500" href={url} target="_blank" rel="noopener noreferrer">Probar registro</a>
   </DialogContent>
  </Dialog>
 </section>;
}
