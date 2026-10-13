"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {CalendarDays,Clock,MapPin,Scissors,UserRound,RefreshCw,CheckCircle2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

type Appt={id:string;tenantId:string;tenantName:string;locationName:string;staffName:string;
 status:string;startsAt:string;endsAt:string;timezone:string;services:{name:string;priceMinor:number}[]};
type Relationship={tenantId:string;tenantName:string;status:string;firstSeenAt:string};
type User={id:string;name:string;email:string};
type Option={tenantId:string;tenantName:string;locationId:string;locationName:string;
 staffId:string;staffName:string;serviceId:string;serviceName:string;priceMinor:number;durationMinutes:number;currency:string;timezone:string};
type MeData={user:User;relationships:Relationship[];appointments:Appt[]};
const formatMoney=(minor:number)=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(minor/100);
function prettyDate(date:string,timezone:string) {
 try{return new Intl.DateTimeFormat("es-CO",{dateStyle:"long",timeStyle:"short",timeZone:timezone}).format(new Date(date));}
 catch{return new Date(date).toLocaleString("es-CO");}
}
export default function CustomerPortal({view}:{view:"home"|"appointments"|"profile"}){
 const [me,setMe]=useState<MeData|null>(null);
 const [options,setOptions]=useState<Option[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [chosen,setChosen]=useState("");
 const [startsAt,setStartsAt]=useState("");
 const [pendingKey,setPendingKey]=useState<string|null>(null);
 async function load(){
  setLoading(true);setError("");
  try{
   const [userResp,optionsResp]=await Promise.all([
    fetch("/api/v1/customers/me",{cache:"no-store"}),
    fetch("/api/v1/customers/booking-options",{cache:"no-store"}),
   ]);
   if(userResp.status===401||optionsResp.status===401){window.location.replace("/login?redirect=/customers");return;}
   const [userPayload,optionsPayload]=await Promise.all([userResp.json(),optionsResp.json()]);
   if(!userResp.ok||!optionsResp.ok)throw new Error(userPayload.error||optionsPayload.error||"No se pudo consultar tu información");
   setMe(userPayload.data);setOptions(optionsPayload.data);
  }catch(e){setError(e instanceof Error?e.message:"Error al consultar PostgreSQL");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 const selected=options.find(o=>[o.tenantId,o.locationId,o.staffId,o.serviceId].join(":")===chosen);
 const future=useMemo(()=>me?.appointments.filter(a=>new Date(a.startsAt).getTime()>=Date.now()&&
  !["CANCELLED","NO_SHOW"].includes(a.status))??[],[me]);
 async function book(e:React.FormEvent){
  e.preventDefault();setError("");setSuccess("");
  if(!selected||!startsAt)return;
  const date=new Date(startsAt);
  if(!Number.isFinite(date.getTime())){setError("Elige una fecha válida");return;}
  const key=pendingKey||crypto.randomUUID();
  setPendingKey(key);
  setSaving(true);
  try{
   const resp=await fetch("/api/v1/customers/me/appointments",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({tenantId:selected.tenantId,locationId:selected.locationId,staffId:selected.staffId,
     serviceId:selected.serviceId,startsAt:date.toISOString(),idempotencyKey:key}),
   });
   const payload=await resp.json();
   if(!resp.ok)throw new Error(payload.error||"No se pudo confirmar la reserva");
   setSuccess("Reserva confirmada en "+selected.tenantName+". La verás en tu historial.");
   setChosen("");setStartsAt("");setPendingKey(null);
   await load();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo confirmar la reserva");}
  finally{setSaving(false);}
 }
 const cards=<div className="grid md:grid-cols-2 gap-4">
  {(view==="home"?future:me?.appointments||[]).map(a=><article key={a.id}
    className="rounded-2xl border border-border bg-card/80 p-6 space-y-3">
    <div className="flex justify-between gap-2">
      <strong className="font-semibold">{a.tenantName}</strong>
      <span className="text-xs rounded-full bg-amber-500/10 text-amber-500 px-3 py-1">{a.status}</span>
    </div>
    <p className="text-sm flex gap-2 items-center"><CalendarDays className="w-4 h-4 text-amber-500"/>{prettyDate(a.startsAt,a.timezone)}</p>
    <p className="text-sm flex gap-2 items-center"><MapPin className="w-4 h-4 text-amber-500"/>{a.locationName}</p>
    <p className="text-sm flex gap-2 items-center"><Scissors className="w-4 h-4 text-amber-500"/>{a.staffName}</p>
    <p className="text-sm">{a.services.map(s=>s.name).join(" · ")}</p>
    <p className="text-xs text-muted-foreground">Precio registrado: {formatMoney(a.services.reduce((sum,s)=>sum+s.priceMinor,0))}</p>
  </article>)}
 </div>;
 return <main className="max-w-6xl mx-auto p-5 md:p-10 space-y-8 pb-24">
  <div className="flex flex-wrap gap-4 justify-between items-center">
   <div><p className="text-amber-500 text-xs uppercase tracking-[0.2em]">Portal oficial de clientes</p>
    <h1 className="font-headline text-4xl uppercase mt-2">{view==="appointments"?"Mis reservas":view==="profile"?"Mi perfil":("Hola, "+(me?.user.name||"bienvenido"))}</h1>
    <p className="text-muted-foreground text-sm mt-2">Datos reales de tu cuenta Barber Paradise.</p>
   </div>
   <Button variant="outline" onClick={()=>void load()} disabled={loading||saving}>
    <RefreshCw className="w-4 h-4 mr-2"/>Actualizar</Button>
  </div>
  {error&&<p role="alert" className="rounded-xl border border-red-500/40 text-red-500 p-4">{error}</p>}
  {success&&<p role="status" className="rounded-xl border border-emerald-500/40 text-emerald-500 p-4 flex gap-2">
   <CheckCircle2 className="w-5 h-5"/>{success}</p>}
  {loading&&!me?<p className="text-muted-foreground">Cargando información real…</p>:null}
  {view==="profile"?<div className="grid md:grid-cols-2 gap-5">
   <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
    <h2 className="font-semibold flex gap-2"><UserRound className="text-amber-500 w-5 h-5"/>Datos de mi cuenta</h2>
    <p>{me?.user.name||"—"}</p><p className="text-muted-foreground">{me?.user.email||"—"}</p>
    <p className="text-xs text-muted-foreground">Estos datos se consultan directamente desde tu cuenta autenticada.</p>
   </section>
   <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
    <h2 className="font-semibold">Mis barberías vinculadas</h2>
    {me?.relationships.filter(r=>r.status==="ACTIVE").map(r=><p key={r.tenantId} className="text-sm">{r.tenantName}</p>)}
    {!me?.relationships.some(r=>r.status==="ACTIVE")&&<p className="text-sm text-muted-foreground">
     Aún no hay barberías vinculadas. Puedes vincularte escaneando el QR de tu barbería mientras tienes la sesión iniciada.</p>}
   </section>
  </div>:null}
  {view!=="profile"&&<>
   {view==="home"&&<div className="flex flex-wrap gap-3">
    <Link className="rounded-xl bg-amber-500 text-black px-5 py-3 text-sm font-semibold" href="/customers/appointments">Agendar una cita</Link>
    <Link className="rounded-xl border border-border px-5 py-3 text-sm" href="/customers/profile">Ver mi perfil</Link>
   </div>}
   {view==="appointments"&&<section className="rounded-2xl border border-border bg-card/70 p-6 space-y-4">
    <h2 className="font-headline uppercase text-2xl">Reservar un servicio real</h2>
    <p className="text-sm text-muted-foreground">Solo aparecen barberías con servicios, sedes y profesionales activos y con el módulo de agenda habilitado. El horario se confirma al reservar.</p>
    {options.length===0?<p className="text-sm text-amber-500">Todavía no hay combinaciones de servicios y horarios configuradas para reservar en línea.</p>:
     <form onSubmit={book} className="space-y-4 max-w-2xl">
      <div className="space-y-1"><Label htmlFor="booking-service">Barbería, sede, barbero y servicio</Label>
       <select id="booking-service" required className="w-full rounded-xl border border-border bg-background p-3 text-sm"
        value={chosen} onChange={e=>{setChosen(e.target.value);setPendingKey(null);}}>
        <option value="">Selecciona una opción activa</option>
        {options.map(o=><option key={[o.tenantId,o.locationId,o.staffId,o.serviceId].join(":")}
         value={[o.tenantId,o.locationId,o.staffId,o.serviceId].join(":")}>
         {o.tenantName} · {o.locationName} · {o.staffName} · {o.serviceName} · {formatMoney(o.priceMinor)}
        </option>)}
       </select>
      </div>
      <div className="space-y-1"><Label htmlFor="booking-date">Fecha y hora (según tu dispositivo)</Label>
       <Input id="booking-date" type="datetime-local" required value={startsAt}
        onChange={e=>{setStartsAt(e.target.value);setPendingKey(null);}}/></div>
      {selected&&<p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="w-4 h-4"/>
       Duración: {selected.durationMinutes} minutos · Zona horaria del negocio: {selected.timezone}</p>}
      <Button type="submit" disabled={saving||!selected||!startsAt}>
       {saving?"Confirmando en el servidor…":"Confirmar reserva"}
      </Button>
     </form>}
   </section>}
   <section className="space-y-4">
    <h2 className="font-headline uppercase text-2xl">{view==="home"?"Mis próximas reservas":"Mi historial de reservas"}</h2>
    {cards}
    {!loading&&(view==="home"?future.length===0:me?.appointments.length===0)&&
     <p className="rounded-xl border border-border p-8 text-center text-muted-foreground">No encontramos reservas reales para tu cuenta.</p>}
   </section>
  </>}
 </main>;
}
