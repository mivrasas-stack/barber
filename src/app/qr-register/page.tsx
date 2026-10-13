"use client";
import { useEffect,useState } from "react";
import {QrCode,CheckCircle2,AlertCircle} from "lucide-react";
import {Card,CardContent,CardHeader,CardTitle,CardDescription} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";

export default function QrRegisterPage() {
 const [token,setToken]=useState("");
 const [shop,setShop]=useState("");
 const [loading,setLoading]=useState(true);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState<"LINKED"|"UNVERIFIED"|null>(null);
 const [form,setForm]=useState({name:"",phone:"",email:"",consent:false,honeypot:""});
 useEffect(()=>{
  const candidate=new URLSearchParams(window.location.search).get("token")||"";
  setToken(candidate);
  if(!candidate){setLoading(false);setError("El QR no identifica una barbería. Solicita un código válido.");return;}
  void fetch("/api/v1/customers/qr?token="+encodeURIComponent(candidate),{cache:"no-store"})
   .then(async r=>{if(!r.ok)throw new Error("El código QR no está activo o no es válido");return r.json();})
   .then(data=>setShop(data.data.name))
   .catch(e=>setError(e.message))
   .finally(()=>setLoading(false));
 },[]);
 async function submit(event:React.FormEvent){
  event.preventDefault();setError("");setSending(true);
  try{
   const resp=await fetch("/api/v1/customers/intakes",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({...form,token}),
   });
   const json=await resp.json();
   if(!resp.ok)throw new Error(json.error||"No fue posible registrar tus datos");
   setSuccess(json.data?.status==="LINKED"?"LINKED":"UNVERIFIED");
  }catch(e){setError(e instanceof Error?e.message:"Error al registrar cliente");}
  finally{setSending(false);}
 }
 return <main className="min-h-screen bg-background p-5 flex items-center justify-center">
  <Card className="w-full max-w-md rounded-3xl border-border bg-card/95 shadow-xl">
   <CardHeader className="text-center space-y-3">
    <QrCode className="w-9 h-9 mx-auto text-blue-500"/>
    <CardTitle className="font-headline text-2xl uppercase">Registro de Cliente</CardTitle>
    <CardDescription>{loading?"Validando QR…":shop?("Barbería: "+shop):"Registro mediante código QR"}</CardDescription>
   </CardHeader>
   <CardContent>
    {error&&<p role="alert" className="mb-4 text-sm text-red-500 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0"/>{error}</p>}
    {success?<div className="text-center space-y-4 py-8">
      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto"/>
      <h2 className="font-semibold">Solicitud recibida en {shop}</h2>
      <p className="text-sm text-muted-foreground">{success==="LINKED"?
        "Tu cuenta autenticada quedó vinculada a esta barbería.":
        "Tus datos ya están en el directorio de la barbería como registro pendiente de verificar. Para vincular tu cuenta de usuario debes iniciar sesión y escanear de nuevo."}</p>
     </div>:
    <form onSubmit={submit} className="space-y-4">
     <div className="space-y-1"><Label htmlFor="name">Nombre completo *</Label>
       <Input id="name" required minLength={2} maxLength={255} value={form.name}
        onChange={e=>setForm({...form,name:e.target.value})}/></div>
     <div className="space-y-1"><Label htmlFor="phone">WhatsApp / teléfono *</Label>
       <Input id="phone" required type="tel" minLength={7} maxLength={40} value={form.phone}
        onChange={e=>setForm({...form,phone:e.target.value})}/></div>
     <div className="space-y-1"><Label htmlFor="email">Correo (opcional)</Label>
       <Input id="email" type="email" value={form.email}
        onChange={e=>setForm({...form,email:e.target.value})}/></div>
     <div className="hidden" aria-hidden="true"><Label htmlFor="companyName">Empresa</Label>
       <Input id="companyName" tabIndex={-1} autoComplete="off" value={form.honeypot}
        onChange={e=>setForm({...form,honeypot:e.target.value})}/></div>
     <label className="flex gap-2 text-xs items-start">
      <input type="checkbox" required checked={form.consent}
       onChange={e=>setForm({...form,consent:e.target.checked})}/>
      Autorizo a {shop||"la barbería"} a registrar mis datos de contacto para gestionar mi relación como cliente.
     </label>
     <Button className="w-full" type="submit" disabled={!shop||!token||loading||sending||!form.consent}>
      {sending?"Registrando…":"Registrar mis datos"}
     </Button>
    </form>}
   </CardContent>
  </Card>
 </main>;
}
