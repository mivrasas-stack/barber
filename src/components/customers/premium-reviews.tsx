"use client";
import {useState} from "react";
import {motion} from "framer-motion";
import {Star,MessageSquare,Send,CheckCircle2,ShieldCheck,UserRound} from "lucide-react";
import {ExperiencePage,glass,Status,useLive,writeLive} from "./experience-shared";
type Review={id:string;tenantId:string;tenantName:string;targetType:string;targetId:string;
 targetName:string;rating:number;comment:string;author:string;createdAt:string;appointmentId:string};
type Completed={id:string;tenantId:string;staffId:string;startsAt:string};
type ReviewData={reviews:Review[];completedAppointments:Completed[];
 submitted:Array<{appointmentId:string;targetType:string}>};
export default function PremiumReviews(){
 const query=useLive<ReviewData>("/api/v1/customers/me/reviews");
 const [appointmentId,setAppointmentId]=useState("");
 const [targetType,setTargetType]=useState<"TENANT"|"STAFF">("TENANT");
 const [rating,setRating]=useState(0);const [hovered,setHovered]=useState(0);
 const [comment,setComment]=useState("");
 const [error,setError]=useState("");const [success,setSuccess]=useState("");
 const [saving,setSaving]=useState(false);
 const available=query.data?.completedAppointments.filter(x=>!query.data?.submitted.some(y=>y.appointmentId===x.id&&y.targetType===targetType))||[];
 async function submit(event:React.FormEvent){
  event.preventDefault();if(!appointmentId||rating<1||comment.trim().length<10){setError("Selecciona una visita, de 1 a 5 estrellas y escribe al menos 10 caracteres");return;}
  setSaving(true);setError("");setSuccess("");
  try{
   await writeLive("/api/v1/customers/me/reviews","POST",{appointmentId,targetType,rating,comment:comment.trim()});
   setSuccess("¡Gracias! Tu reseña quedó registrada desde tu visita completada.");
   setRating(0);setComment("");setAppointmentId("");query.reload();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo registrar tu reseña")}
  finally{setSaving(false)}
 }
 return <ExperiencePage title="Reseñas" subtitle="Opiniones auténticas de clientes que completaron su visita. Califica tu barbería o al barbero que te atendió.">
  <Status loading={query.loading} error={query.error||error}/>
  {success&&<div role="status" className={glass+" p-5 border-emerald-500/30 text-emerald-400 flex items-center gap-3"}><CheckCircle2 className="w-5 h-5"/>{success}</div>}
  <section className={glass+" p-7 md:p-10 relative overflow-hidden space-y-6"}>
   <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-pink-500/10 blur-[90px]"/>
   <div className="relative"><p className="text-pink-400 text-xs uppercase tracking-widest">Tu experiencia importa</p>
    <h2 className="font-headline text-2xl uppercase tracking-widest mt-3">Comparte tu opinión</h2></div>
   <form onSubmit={submit} className="relative space-y-5 max-w-3xl">
    <div className="grid md:grid-cols-2 gap-4">
     <label className="text-xs text-white/60 space-y-2 block">¿Qué deseas calificar?
      <select value={targetType} onChange={e=>{setTargetType(e.target.value as "TENANT"|"STAFF");setAppointmentId("");}} className="w-full rounded-xl border border-white/15 bg-black/70 px-4 py-3 text-white text-sm">
       <option value="TENANT">La barbería</option><option value="STAFF">El barbero que me atendió</option>
      </select></label>
     <label className="text-xs text-white/60 space-y-2 block">Visita completada
      <select value={appointmentId} required onChange={e=>setAppointmentId(e.target.value)}
       className="w-full rounded-xl border border-white/15 bg-black/70 px-4 py-3 text-white text-sm">
       <option value="">Selecciona tu visita</option>
       {available.map(a=><option value={a.id} key={a.id}>{new Date(a.startsAt).toLocaleDateString("es-CO")} · {a.id.slice(0,8)}</option>)}
      </select>
     </label>
    </div>
    <div className="space-y-3"><p className="text-sm text-white/60">Calificación</p>
     <div className="flex gap-2" onMouseLeave={()=>setHovered(0)}>
      {Array.from({length:5},(_,i)=><button aria-label={(i+1)+" estrellas"} type="button" key={i} onClick={()=>setRating(i+1)} onMouseEnter={()=>setHovered(i+1)}>
       <Star className={"w-9 h-9 transition-transform hover:scale-110 "+(i<(hovered||rating)?"fill-amber-400 text-amber-400":"text-white/20")}/>
      </button>)}
     </div></div>
    <label className="text-sm text-white/60 block space-y-2">Tu experiencia
     <textarea minLength={10} maxLength={1200} required value={comment} onChange={e=>setComment(e.target.value)}
      className="w-full min-h-32 resize-y rounded-2xl border border-white/15 bg-black/40 p-4 text-white"
      placeholder="¿Cómo fue tu corte y la atención?"/></label>
    <button disabled={saving||!available.length} type="submit"
     className="rounded-full border border-pink-500/30 bg-pink-500/15 px-7 py-3 text-pink-200 font-semibold text-sm flex gap-2 items-center disabled:opacity-50">
     <Send className="w-4 h-4"/>{saving?"Publicando…":"Publicar reseña verificada"}</button>
    {!available.length&&!query.loading&&<p className="text-white/45 text-sm">Necesitas al menos una visita marcada como completada y sin reseña previa de este tipo.</p>}
   </form>
  </section>
  <section className="space-y-5"><h2 className="font-headline text-2xl uppercase tracking-widest flex gap-3"><MessageSquare className="text-pink-400"/>Experiencias verificadas</h2>
   <div className="grid lg:grid-cols-2 gap-5">{query.data?.reviews.map((x,i)=><motion.article initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*.03}} className={glass+" p-7 space-y-4"} key={x.id}>
    <div className="flex gap-4 justify-between">
     <div><h3 className="font-headline uppercase tracking-widest">{x.targetName}</h3><p className="text-white/40 text-xs mt-1">{x.tenantName} · {x.targetType==="STAFF"?"Barbero":"Barbería"}</p></div>
     <p className="flex gap-1 text-amber-400">{Array.from({length:5},(_,k)=><Star key={k} className={"w-4 h-4 "+(k<x.rating?"fill-amber-400":"text-white/20")}/>)}</p>
    </div>
    <p className="text-white/75 leading-relaxed whitespace-pre-wrap">{x.comment}</p>
    <div className="flex justify-between items-center text-xs text-white/40 border-t border-white/10 pt-4">
     <span className="flex gap-2 items-center"><ShieldCheck className="w-4 h-4 text-emerald-400"/>{x.author}</span>
     <span>{new Date(x.createdAt).toLocaleDateString("es-CO")}</span>
    </div>
   </motion.article>)}</div>
   {!query.loading&&!query.data?.reviews.length&&<Status empty="Aún no hay reseñas verificadas de tus visitas. Sé el primero en opinar tras completar un corte."/>}
  </section>
 </ExperiencePage>;
}
