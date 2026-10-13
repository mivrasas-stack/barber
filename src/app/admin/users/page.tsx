"use client";

import {useEffect,useState,useCallback} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from "@/components/ui/dialog";
import {ShieldCheck,Search,UserPlus,RefreshCcw,Download,KeyRound,Users,CalendarClock,Settings2,LockKeyhole} from "lucide-react";

type Kind="ALL"|"PLATFORM_ADMIN"|"SOLO"|"BUSINESS"|"EMPLOYEE"|"CUSTOMER";
type UserList={id:string;name:string;email:string;status:string;kind:Kind;isPlatformAdmin:boolean;lastLoginAt:string|null;createdAt:string;workspaces:{tenantId:string;tenantName:string;tenantType:string;membershipStatus:string;subscription?:{planCode:string;planName:string;status:string;currentPeriodEnd:string|null;trialEndsAt:string|null}}[]};
type GrantType="DAY"|"MONTH"|"SIX_MONTHS"|"YEAR"|"CUSTOM";
type Plan={code:string;name:string;audience:string;priceMinor:number|null;currency:string};
type Tenant={id:string;name:string;type:string};
type Module={code:string;name:string;enabled:boolean;source:string;reason?:string};
type Workspace={tenantId:string;tenantName:string;tenantType:string;membershipStatus:string;roles:string[];subscription?:{id:string;status:string;planCode:string;planName:string;currentPeriodEnd:string|null;trialEndsAt:string|null;cancelAtPeriodEnd:boolean}|null;modules:Module[]};
type UserDetail={user:{id:string;name:string;email:string;status:string;isPlatformAdmin:boolean;lastLoginAt:string|null};workspaces:Workspace[];profiles:{slug:string;displayName:string;tenantId:string|null}[];relationships:{tenantName:string}[];events:{action:string;createdAt:string}[];statuses:{toStatus:string;createdAt:string}[]};
const kinds:Record<Kind,string>={ALL:"Todos",PLATFORM_ADMIN:"Administradores del sistema",SOLO:"Independientes",BUSINESS:"Dueños de barbería",EMPLOYEE:"Empleados",CUSTOMER:"Clientes"};
const durations:Record<GrantType,string>={DAY:"1 día",MONTH:"1 mes",SIX_MONTHS:"6 meses",YEAR:"1 año",CUSTOM:"Fechas específicas"};
const initialForm=()=>({kind:"CUSTOMER" as Exclude<Kind,"ALL">,name:"",email:"",displayName:"",businessName:"",slug:"",tenantId:"",planCode:"",duration:"MONTH" as GrantType,startsAt:"",endsAt:""});
const slugify=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const present=(d?:string|null)=>d?new Date(d).toLocaleString("es-CO",{dateStyle:"medium",timeStyle:"short"}):"Sin registrar";
const errorText=(e:unknown)=>e instanceof Error?e.message:"Error inesperado";
async function api(url:string,options?:RequestInit){
 const response=await fetch(url,{cache:"no-store",...options,headers:{"Content-Type":"application/json",...(options?.headers||{})}});
 const json=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(json.error||"Solicitud rechazada");
 return json;
}
function grantFrom(f:{duration:GrantType;startsAt:string;endsAt:string}){
 if(f.duration!=="CUSTOM")return {duration:f.duration};
 if(!f.endsAt)throw new Error("Selecciona una fecha de vencimiento.");
 return {duration:"CUSTOM",...(f.startsAt?{startsAt:new Date(f.startsAt).toISOString()}:{}),endsAt:new Date(f.endsAt).toISOString()};
}

export default function PlatformUsersPage(){
 const [rows,setRows]=useState<UserList[]>([]);
 const [total,setTotal]=useState(0);
 const [page,setPage]=useState(1);
 const [query,setQuery]=useState("");
 const [kind,setKind]=useState<Kind>("ALL");
 const [status,setStatus]=useState("ALL");
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [plans,setPlans]=useState<Plan[]>([]);
 const [tenants,setTenants]=useState<Tenant[]>([]);
 const [showCreate,setShowCreate]=useState(false);
 const [form,setForm]=useState(initialForm);
 const [credentials,setCredentials]=useState<{email:string;temporaryPassword:string}|null>(null);
 const [detail,setDetail]=useState<UserDetail|null>(null);
 const [editName,setEditName]=useState("");
 const [editEmail,setEditEmail]=useState("");
 const [editStatus,setEditStatus]=useState("ACTIVE");
 const [editAdmin,setEditAdmin]=useState(false);
 const [accessPlan,setAccessPlan]=useState("");
 const [accessDuration,setAccessDuration]=useState<GrantType>("MONTH");
 const [accessEndsAt,setAccessEndsAt]=useState("");
 const [accessStartsAt,setAccessStartsAt]=useState("");
 const [workingTenant,setWorkingTenant]=useState("");

 const reload=useCallback(async()=>{
  setLoading(true);
  try{
   const url=new URL("/api/v1/admin/users",location.origin);
   url.searchParams.set("page",String(page));url.searchParams.set("pageSize","20");
   url.searchParams.set("q",query.trim());url.searchParams.set("kind",kind);url.searchParams.set("status",status);
   const {data}=await api(url.pathname+url.search);
   setRows(data.items||[]);setTotal(data.total||0);setMessage("");
  }catch(e){setMessage(errorText(e));}
  finally{setLoading(false);}
 },[page,query,kind,status]);
 useEffect(()=>{const timer=setTimeout(()=>{void reload();},250);return()=>clearTimeout(timer);},[reload]);
 useEffect(()=>{void api("/api/v1/admin/users/options").then(x=>{setPlans(x.data.plans);setTenants(x.data.workspaces);}).catch(e=>setMessage(errorText(e)));},[]);
 const updateForm=(key:string,value:string)=>setForm(f=>{
  const next={...f,[key]:value};
  if(key==="kind"){next.planCode="";next.tenantId="";next.slug="";}
  if(key==="businessName"||key==="displayName") next.slug=slugify(value);
  return next;
 });
 const closeCreate=()=>{setShowCreate(false);setCredentials(null);setForm(initialForm());};
 const create=async(e:React.FormEvent)=>{
  e.preventDefault();
  if(form.kind==="PLATFORM_ADMIN"&&!confirm("¿Confirmas la creación de un nuevo administrador con acceso global? Esta operación se registrará en auditoría."))return;
  setBusy(true);setMessage("");
  try{
   const body:Record<string,unknown>={kind:form.kind,name:form.name,email:form.email};
   if(form.kind==="CUSTOMER"&&form.tenantId)body.tenantId=form.tenantId;
   if(form.kind==="EMPLOYEE")body.tenantId=form.tenantId;
   if(form.kind==="SOLO"||form.kind==="BUSINESS"){
    body.slug=form.slug;body.planCode=form.planCode;body.grant=grantFrom(form);
    if(form.kind==="SOLO")body.displayName=form.displayName;
    else body.businessName=form.businessName;
   }
   const result=await api("/api/v1/admin/users",{method:"POST",body:JSON.stringify(body)});
   setCredentials(result.credentials);await reload();
  }catch(e){setMessage(errorText(e));}finally{setBusy(false);}
 };
 const openDetail=async(id:string)=>{
  setBusy(true);setMessage("");
  try{
   const result=await api("/api/v1/admin/users/"+id);
   const item=result.data as UserDetail;setDetail(item);
   setEditName(item.user.name);setEditEmail(item.user.email);setEditStatus(item.user.status);setEditAdmin(item.user.isPlatformAdmin);
   setWorkingTenant(item.workspaces[0]?.tenantId||"");
   setAccessPlan(item.workspaces[0]?.subscription?.planCode||"");
   setAccessDuration("MONTH");setAccessEndsAt("");setAccessStartsAt("");
  }catch(e){setMessage(errorText(e));}finally{setBusy(false);}
 };
 const refreshDetail=async(id:string)=>{const result=await api("/api/v1/admin/users/"+id);setDetail(result.data as UserDetail);await reload();};
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setMessage("");try{await fn();}catch(e){setMessage(errorText(e));}finally{setBusy(false);}};
 const saveUser=()=>{if(!detail)return;void run(async()=>{
   const old=detail.user;
   if((old.isPlatformAdmin!==editAdmin||old.status!==editStatus)&&!confirm("¿Confirmas el cambio de privilegios/estado? Se registrará en auditoría."))return;
   await api("/api/v1/admin/users/"+old.id,{method:"PATCH",body:JSON.stringify({name:editName,email:editEmail,status:editStatus,isPlatformAdmin:editAdmin})});
   await refreshDetail(old.id);
  });};
 const archiveUser=()=>{if(!detail)return;void run(async()=>{
  if(!confirm("¿Desactivar la cuenta? No se borrarán reservas, facturas ni historial."))return;
  await api("/api/v1/admin/users/"+detail.user.id,{method:"DELETE"});
  await refreshDetail(detail.user.id);
 });};
 const resetPassword=()=>{if(!detail)return;void run(async()=>{
  if(!confirm("¿Generar otra contraseña y cerrar todas las sesiones de este usuario?"))return;
  const result=await api("/api/v1/admin/users/"+detail.user.id+"/credentials",{method:"POST"});
  setCredentials(result.credentials);await refreshDetail(detail.user.id);
 });};
 const saveAccess=()=>{if(!detail||!workingTenant)return;void run(async()=>{
  if(!confirm("¿Aplicar el plan/período al workspace seleccionado? Los movimientos financieros históricos no se modificarán."))return;
  const grant=grantFrom({duration:accessDuration,startsAt:accessStartsAt,endsAt:accessEndsAt});
  await api("/api/v1/admin/users/"+detail.user.id+"/access",{method:"PATCH",body:JSON.stringify({tenantId:workingTenant,planCode:accessPlan||undefined,grant})});
  await refreshDetail(detail.user.id);
 });};
 const changeModule=(m:Module,state:string)=>{if(!detail||!workingTenant)return;void run(async()=>{
  const reason=prompt("Justificación obligatoria del cambio de módulo:","");
  if(!reason||reason.trim().length<3)return;
  await api("/api/v1/admin/users/"+detail.user.id+"/modules",{method:"PUT",body:JSON.stringify({tenantId:workingTenant,moduleCode:m.code,state,reason:reason.trim()})});
  await refreshDetail(detail.user.id);
 });};
 const selected=detail?.workspaces.find(x=>x.tenantId===workingTenant);
 const exportPage=()=>{
  const esc=(s:unknown)=>{let value=String(s??"");if(/^[=+\-@\t\r]/.test(value))value="'"+value;return '"'+value.replace(/"/g,'""')+'"';};
  const lines=[["Nombre","Email","Tipo","Estado","Último acceso"],...rows.map(x=>[x.name,x.email,kinds[x.kind],x.status,x.lastLoginAt||""])];
  const text=lines.map(x=>x.map(esc).join(",")).join("\r\n");
  const uri=URL.createObjectURL(new Blob(["\ufeff",text],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=uri;link.download="barber-usuarios-pagina-"+page+".csv";link.click();URL.revokeObjectURL(uri);
 };
 return (
 <div className="mx-auto max-w-7xl px-5 py-10 pb-36 space-y-7 text-foreground">
  <div className="flex flex-wrap items-center justify-between gap-4">
   <div><div className="flex items-center gap-2 text-amber-500 text-xs uppercase tracking-widest"><ShieldCheck size={17}/> Control central de identidad</div>
    <h1 className="text-3xl font-bold mt-2">Usuarios de Barber Paradise</h1>
    <p className="text-sm text-muted-foreground mt-1">Cuentas reales, roles, planes, permisos y vigencias auditables.</p>
   </div>
   <div className="flex gap-2">
    <Button variant="outline" onClick={()=>void reload()} disabled={loading}><RefreshCcw size={15} className="mr-2"/>Actualizar</Button>
    <Button onClick={()=>{setCredentials(null);setForm(initialForm());setShowCreate(true);}}><UserPlus size={16} className="mr-2"/>Nuevo usuario</Button>
   </div>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
   <div className="border rounded-xl p-5"><p className="text-xs text-muted-foreground">Coincidencias</p><p className="text-3xl font-semibold mt-1">{total}</p></div>
   <div className="border rounded-xl p-5"><p className="text-xs text-muted-foreground">Tipo seleccionado</p><p className="text-lg font-semibold mt-2">{kinds[kind]}</p></div>
   <div className="border rounded-xl p-5"><p className="text-xs text-muted-foreground">Estado consultado</p><p className="text-lg font-semibold mt-2">{status==="ALL"?"Todos":status}</p></div>
  </div>
  <div className="border rounded-xl p-4 space-y-3">
   <div className="flex flex-wrap gap-3 items-center">
    <div className="flex items-center gap-2 flex-1 min-w-60"><Search size={17}/><Input aria-label="Buscar usuarios" placeholder="Nombre o correo..." value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></div>
    <select aria-label="Filtrar tipo de usuario" className="border rounded-lg bg-background px-3 h-10 max-w-full" value={kind} onChange={e=>{setKind(e.target.value as Kind);setPage(1);}}>
     {Object.entries(kinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}
    </select>
    <select aria-label="Filtrar estado" className="border rounded-lg bg-background px-3 h-10" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
     <option value="ALL">Todos los estados</option><option value="ACTIVE">Activos</option><option value="SUSPENDED">Suspendidos</option><option value="DISABLED">Desactivados</option>
    </select>
    <Button variant="outline" onClick={exportPage} disabled={!rows.length}><Download size={15} className="mr-2"/>Exportar página CSV</Button>
   </div>
   {message&&<div role="alert" className="rounded-lg border border-red-500/40 p-3 text-red-400 text-sm">{message}</div>}
   <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
     <thead className="text-xs text-muted-foreground border-b"><tr><th className="p-3">Usuario</th><th className="p-3">Tipo</th><th className="p-3">Workspace / Plan</th><th className="p-3">Estado</th><th className="p-3">Último acceso</th><th className="p-3 text-right">Control</th></tr></thead>
     <tbody>{rows.map(user=><tr key={user.id} className="border-b hover:bg-muted/20">
       <td className="p-3"><div className="font-semibold">{user.name}</div><div className="text-muted-foreground text-xs">{user.email}</div></td>
       <td className="p-3">{kinds[user.kind]||user.kind}{user.isPlatformAdmin&&<ShieldCheck size={14} className="inline ml-2 text-amber-500"/>}</td>
       <td className="p-3 text-xs">{user.workspaces.length?user.workspaces.map(w=><div key={w.tenantId}>{w.tenantName} <span className="text-muted-foreground">· {w.subscription?.planName||"Sin plan"}</span></div>):"—"}</td>
       <td className="p-3">{user.status}</td><td className="p-3 text-xs">{present(user.lastLoginAt)}</td>
       <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={()=>void openDetail(user.id)}>Ver / editar</Button></td>
      </tr>)}</tbody>
    </table>
    {!loading&&!rows.length&&<p className="text-center p-10 text-muted-foreground">No hay usuarios para estos filtros.</p>}
    {loading&&<p className="text-center p-5 text-muted-foreground">Consultando registros...</p>}
   </div>
   <div className="flex justify-between items-center text-xs text-muted-foreground"><span>Página {page} · {total} usuarios encontrados</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage(x=>x-1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page*20>=total} onClick={()=>setPage(x=>x+1)}>Siguiente</Button></div></div>
  </div>
  <Dialog open={showCreate} onOpenChange={open=>{if(!open)closeCreate();else setShowCreate(true);}}>
   <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
    <DialogHeader><DialogTitle>Registrar usuario en la plataforma</DialogTitle><DialogDescription>Las credenciales sólo se mostrarán una vez. El registro queda auditado.</DialogDescription></DialogHeader>
    {credentials?<div className="space-y-3 text-sm">
      <p className="text-emerald-500 font-semibold">Cuenta creada correctamente.</p>
      <Label>Correo de acceso</Label><Input readOnly value={credentials.email}/>
      <Label>Contraseña generada — copia ahora</Label><Input aria-label="Contraseña generada" readOnly value={credentials.temporaryPassword}/>
      <Button className="w-full" onClick={()=>void navigator.clipboard.writeText(`Usuario: ${credentials.email}\nContraseña: ${credentials.temporaryPassword}`)}>Copiar credenciales</Button>
      <Button variant="outline" className="w-full" onClick={closeCreate}>Cerrar y olvidar contraseña</Button>
     </div>:<form onSubmit={e=>void create(e)} className="space-y-3">
      <Label htmlFor="g-kind">Tipo de usuario</Label>
      <select id="g-kind" className="w-full h-10 rounded border bg-background px-2" value={form.kind} onChange={e=>updateForm("kind",e.target.value)}>
       {Object.entries(kinds).filter(([k])=>k!=="ALL").map(([k,v])=><option key={k} value={k}>{v}</option>)}
      </select>
      <Label htmlFor="g-name">Nombre completo</Label><Input id="g-name" value={form.name} onChange={e=>updateForm("name",e.target.value)} required minLength={2}/>
      <Label htmlFor="g-email">Correo (usuario de acceso)</Label><Input id="g-email" type="email" value={form.email} onChange={e=>updateForm("email",e.target.value)} required/>
      {(form.kind==="CUSTOMER"||form.kind==="EMPLOYEE")&&<>
       <Label htmlFor="g-tenant">Barbería {form.kind==="CUSTOMER"?"(opcional)":"(obligatoria)"}</Label>
       <select id="g-tenant" className="w-full h-10 border rounded bg-background" value={form.tenantId} onChange={e=>updateForm("tenantId",e.target.value)} required={form.kind==="EMPLOYEE"}>
        <option value="">{form.kind==="EMPLOYEE"?"Seleccionar barbería":"Sin vincular a barbería"}</option>
        {tenants.filter(t=>t.type==="BUSINESS").map(t=><option value={t.id} key={t.id}>{t.name}</option>)}
       </select>
      </>}
      {form.kind==="SOLO"&&<><Label htmlFor="g-professional">Nombre profesional</Label><Input id="g-professional" value={form.displayName} onChange={e=>updateForm("displayName",e.target.value)} required/></>}
      {form.kind==="BUSINESS"&&<><Label htmlFor="g-business">Nombre de la barbería</Label><Input id="g-business" value={form.businessName} onChange={e=>updateForm("businessName",e.target.value)} required/></>}
      {(form.kind==="SOLO"||form.kind==="BUSINESS")&&<>
       <Label htmlFor="g-slug">Enlace / slug</Label><Input id="g-slug" value={form.slug} onChange={e=>updateForm("slug",slugify(e.target.value))} required/>
       <Label htmlFor="g-plan">Plan asignado</Label>
       <select id="g-plan" className="w-full h-10 border rounded bg-background" required value={form.planCode} onChange={e=>updateForm("planCode",e.target.value)}>
        <option value="">Selecciona un plan</option>
        {plans.filter(p=>p.audience==="ALL"||p.audience===(form.kind==="SOLO"?"SOLO_PROFESSIONAL":"BUSINESS")).map(p=><option key={p.code} value={p.code}>{p.name} ({p.code})</option>)}
       </select>
       <Label htmlFor="g-duration">Tiempo de acceso</Label>
       <select id="g-duration" className="w-full h-10 border rounded bg-background" value={form.duration} onChange={e=>updateForm("duration",e.target.value)}>
        {Object.entries(durations).map(([k,v])=><option key={k} value={k}>{v}</option>)}
       </select>
       {form.duration==="CUSTOM"&&<>
        <Label htmlFor="g-start">Inicio (opcional: ahora)</Label><Input id="g-start" type="datetime-local" value={form.startsAt} onChange={e=>updateForm("startsAt",e.target.value)}/>
        <Label htmlFor="g-end">Vencimiento exacto</Label><Input id="g-end" type="datetime-local" required value={form.endsAt} onChange={e=>updateForm("endsAt",e.target.value)}/>
       </>}
       <p className="text-xs text-muted-foreground">Concesión temporal sin cobro automático; al vencer se revocan módulos de pago.</p>
      </>}
      {form.kind==="PLATFORM_ADMIN"&&<div className="border border-amber-500/40 rounded p-3 text-xs">Acceso global completo. Sólo disponible para un administrador de plataforma autenticado. Quedará registrado en auditoría.</div>}
      <DialogFooter><Button type="button" variant="outline" onClick={closeCreate}>Cancelar</Button><Button type="submit" disabled={busy}>{busy?"Creando...":"Crear usuario"}</Button></DialogFooter>
     </form>}
   </DialogContent>
  </Dialog>
  <Dialog open={!!detail} onOpenChange={open=>{if(!open){setDetail(null);setCredentials(null);}}}>
   <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
    <DialogHeader><DialogTitle>Expediente global de usuario</DialogTitle><DialogDescription>Datos reales y permisos efectivos de PostgreSQL. Los cambios quedan auditados.</DialogDescription></DialogHeader>
    {detail&&<div className="space-y-5 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
       <div className="space-y-1"><Label>Nombre</Label><Input value={editName} onChange={e=>setEditName(e.target.value)}/></div>
       <div className="space-y-1"><Label>Correo</Label><Input value={editEmail} type="email" onChange={e=>setEditEmail(e.target.value)}/></div>
       <div className="space-y-1"><Label>Estado de cuenta</Label><select className="w-full h-10 rounded border bg-background" value={editStatus} onChange={e=>setEditStatus(e.target.value)}><option value="ACTIVE">Activo</option><option value="SUSPENDED">Suspendido</option><option value="DISABLED">Desactivado</option></select></div>
       <div className="space-y-1"><Label>Administrador del sistema</Label><select className="w-full h-10 rounded border bg-background" value={editAdmin?"yes":"no"} onChange={e=>setEditAdmin(e.target.value==="yes")}><option value="no">Sin privilegios globales</option><option value="yes">Administrador global</option></select></div>
      </div>
      <div className="flex flex-wrap gap-2">
       <Button onClick={saveUser} disabled={busy}>Guardar datos y privilegios</Button>
       <Button variant="outline" onClick={resetPassword} disabled={busy}><KeyRound size={15} className="mr-1"/>Nueva contraseña</Button>
       <Button variant="outline" onClick={archiveUser} disabled={busy||detail.user.status==="DISABLED"}><LockKeyhole size={15} className="mr-1"/>Desactivar / archivar</Button>
      </div>
      {credentials&&<div className="space-y-2 border rounded p-3 border-amber-500/40"><p className="font-semibold">Nueva contraseña de un solo uso</p><Input aria-label="Contraseña temporal nueva" readOnly value={credentials.temporaryPassword}/><Button onClick={()=>void navigator.clipboard.writeText(`Usuario: ${credentials.email}\nContraseña: ${credentials.temporaryPassword}`)}>Copiar</Button><Button variant="outline" onClick={()=>setCredentials(null)}>Olvidar</Button></div>}
      {detail.workspaces.length>0&&<section className="border-t pt-4 space-y-3">
       <h2 className="font-semibold flex items-center gap-2"><CalendarClock size={17}/>Workspaces, planes y acceso</h2>
       <select aria-label="Seleccionar workspace" className="h-10 w-full border bg-background rounded" value={workingTenant} onChange={e=>{const v=e.target.value;setWorkingTenant(v);setAccessPlan(detail.workspaces.find(w=>w.tenantId===v)?.subscription?.planCode||"");}}>
        {detail.workspaces.map(w=><option key={w.tenantId} value={w.tenantId}>{w.tenantName} ({w.tenantType}) · {w.roles.join(", ")||"Sin rol"}</option>)}
       </select>
       {selected&&<>
        <p className="text-xs text-muted-foreground">Estado: {selected.subscription?.status||"Sin suscripción"} · Plan: {selected.subscription?.planName||"Sin plan"} · Vencimiento: {present(selected.subscription?.currentPeriodEnd||selected.subscription?.trialEndsAt)}</p>
        {selected.subscription&&<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
         <div><Label>Plan</Label><select aria-label="Editar plan" className="h-10 w-full border rounded bg-background" value={accessPlan} onChange={e=>setAccessPlan(e.target.value)}>{plans.filter(p=>p.audience==="ALL"||p.audience===selected.tenantType).map(p=><option key={p.code} value={p.code}>{p.name}</option>)}</select></div>
         <div><Label>Nuevo período de acceso</Label><select aria-label="Nuevo período" className="h-10 w-full border rounded bg-background" value={accessDuration} onChange={e=>setAccessDuration(e.target.value as GrantType)}>{Object.entries(durations).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
         {accessDuration==="CUSTOM"&&<><div><Label>Fecha inicial opcional</Label><Input type="datetime-local" value={accessStartsAt} onChange={e=>setAccessStartsAt(e.target.value)}/></div><div><Label>Fecha final</Label><Input type="datetime-local" value={accessEndsAt} onChange={e=>setAccessEndsAt(e.target.value)}/></div></>}
         <div className="sm:col-span-2"><Button onClick={saveAccess} disabled={busy}>Aplicar plan y acceso</Button></div>
        </div>}
        <h3 className="font-semibold pt-3 flex items-center gap-2"><Settings2 size={16}/>Módulos efectivos</h3>
        {selected.tenantType==="BUSINESS"&&<p className="text-xs text-muted-foreground">Los módulos de esta barbería se determinan por el plan empresarial.</p>}
        <div className="max-h-52 overflow-y-auto border rounded">
         {selected.modules.map(m=><div key={m.code} className="flex flex-wrap items-center justify-between p-2 border-b gap-2">
          <div><div className="font-medium text-xs">{m.name}</div><div className="text-[11px] text-muted-foreground">{m.code} · {m.reason||m.source}</div></div>
          <div className="flex items-center gap-2"><span className={m.enabled?"text-emerald-500 text-xs":"text-muted-foreground text-xs"}>{m.enabled?"Habilitado":"Restringido"}</span>
           {selected.tenantType==="SOLO_PROFESSIONAL"&&<select aria-label={"Modificar módulo "+m.name} className="text-xs border rounded bg-background p-1" value="" onChange={e=>{if(e.target.value)changeModule(m,e.target.value);}}>
            <option value="">Modificar...</option><option value="FORCE_ENABLED">Habilitar</option><option value="FORCE_DISABLED">Restringir</option><option value="INHERIT">Restablecer plan</option>
           </select>}
          </div>
         </div>)}
        </div>
       </>}
      </section>}
      <section className="border-t pt-4"><h3 className="font-semibold mb-2">Relaciones como cliente</h3><p className="text-xs text-muted-foreground">{detail.relationships.map(x=>x.tenantName).join(", ")||"Sin relaciones"}</p></section>
      <section className="border-t pt-4"><h3 className="font-semibold mb-2">Auditoría reciente</h3>{detail.events.slice(0,12).map((e,i)=><div key={i} className="flex justify-between text-xs border-b py-2"><span>{e.action}</span><span>{present(e.createdAt)}</span></div>)}{!detail.events.length&&<p className="text-xs text-muted-foreground">Sin eventos de gestión global registrados</p>}</section>
     </div>}
   </DialogContent>
  </Dialog>
 </div>
 );
}
