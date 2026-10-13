"use client";
import {useCallback,useEffect,useState} from "react";
import {UserPlus,Users,ShieldCheck,RefreshCw,Copy} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
type Staff={id:string;name:string;email:string;status:string};
export default function StaffDirectory(){
 const [rows,setRows]=useState<Staff[]>([]);
 const [open,setOpen]=useState(false);
 const [name,setName]=useState("");
 const [email,setEmail]=useState("");
 const [credentials,setCredentials]=useState<{email:string;temporaryPassword:string}|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const refresh=useCallback(async()=>{
  setError("");
  try{
   const resp=await fetch("/api/v1/staff",{cache:"no-store"});
   const body=await resp.json();
   if(!resp.ok)throw new Error(body.error||"No tienes permiso para gestionar el personal");
   setRows(body.data);
  }catch(e){setError(e instanceof Error?e.message:"No se pudo cargar el personal");}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");
  try{
   const resp=await fetch("/api/v1/staff",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email})});
   const body=await resp.json();
   if(!resp.ok)throw new Error(body.error||"No se pudo crear el barbero");
   setCredentials(body.credentials);
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Error en el alta");}finally{setBusy(false);}
 }
 async function toggle(member:Staff){
  if(!confirm("¿Confirmas cambiar el acceso de "+member.name+"?"))return;
  setBusy(true);setError("");
  try{
   const resp=await fetch("/api/v1/staff/"+member.id,{method:"PATCH",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({status:member.status==="ACTIVE"?"SUSPENDED":"ACTIVE"})});
   const body=await resp.json();
   if(!resp.ok)throw new Error(body.error||"No se pudo actualizar");
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Error al cambiar acceso");}finally{setBusy(false);}
 }
 function close(openNext:boolean){
  setOpen(openNext);
  if(!openNext){setCredentials(null);setName("");setEmail("");}
 }
 return <section className="space-y-8 pb-16">
  <header className="flex flex-wrap gap-4 justify-between items-center">
   <div><p className="uppercase tracking-widest text-xs text-amber-500">Administración de equipo</p>
    <h1 className="text-4xl font-headline uppercase mt-2">Mis Barberos</h1>
    <p className="text-sm text-muted-foreground mt-2">Cuentas y permisos persistentes por barbería.</p></div>
   <div className="flex gap-2">
    <Button variant="outline" onClick={()=>void refresh()} disabled={busy}><RefreshCw className="w-4 h-4 mr-2"/>Actualizar</Button>
    <Button onClick={()=>setOpen(true)}><UserPlus className="w-4 h-4 mr-2"/>Nuevo barbero</Button>
   </div>
  </header>
  {error&&<p role="alert" className="text-sm text-red-500">{error}</p>}
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
   {rows.map(m=><article key={m.id} className="rounded-2xl border border-border bg-card/70 p-6 space-y-4">
    <div className="flex gap-3 items-center"><Users className="w-9 h-9 text-amber-500"/>
     <div><h2 className="font-semibold">{m.name}</h2><p className="text-xs text-muted-foreground">{m.email}</p></div></div>
    <p className="text-xs">{m.status==="ACTIVE"?"Acceso activo":"Acceso suspendido"}</p>
    <Button variant="outline" className="w-full" disabled={busy} onClick={()=>void toggle(m)}>
      {m.status==="ACTIVE"?"Suspender acceso":"Reactivar acceso"}
    </Button>
   </article>)}
  </div>
  {rows.length===0&&!error&&<div className="text-muted-foreground rounded-2xl border border-border p-8 text-center">Todavía no hay barberos registrados en esta barbería.</div>}
  <Dialog open={open} onOpenChange={close}>
   <DialogContent>
    <DialogHeader><DialogTitle>{credentials?"Barbero creado correctamente":"Nuevo barbero"}</DialogTitle>
     <DialogDescription>{credentials?"Copia las credenciales ahora: se muestran una sola vez.":"Crearemos una cuenta segura y una membresía de empleado en la barbería activa."}</DialogDescription>
    </DialogHeader>
    {credentials?<div className="space-y-3">
      <div><Label>Correo de acceso</Label><Input readOnly value={credentials.email}/></div>
      <div><Label>Contraseña inicial segura</Label><Input aria-label="Contraseña inicial segura" readOnly value={credentials.temporaryPassword}/></div>
      <Button className="w-full" onClick={()=>void navigator.clipboard.writeText("Usuario: "+credentials.email+"\nContraseña: "+credentials.temporaryPassword)}><Copy className="w-4 h-4 mr-2"/>Copiar credenciales</Button>
      <p className="text-xs text-muted-foreground">Comparte la contraseña por un canal seguro; la cuenta puede cambiarla después.</p>
      <Button variant="outline" className="w-full" onClick={()=>close(false)}>Cerrar y ocultar credenciales</Button>
     </div>:<form onSubmit={submit} className="space-y-4">
      <div><Label htmlFor="staffName">Nombre *</Label><Input id="staffName" required minLength={2} maxLength={255} value={name} onChange={e=>setName(e.target.value)}/></div>
      <div><Label htmlFor="staffEmail">Correo de acceso *</Label><Input id="staffEmail" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div>
      <Button type="submit" className="w-full" disabled={busy}>{busy?"Creando…":"Crear barbero y credenciales"}</Button>
    </form>}
   </DialogContent>
  </Dialog>
 </section>;
}
