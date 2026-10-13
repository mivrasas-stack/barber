"use client";
import {motion} from "framer-motion";
import {Trophy,Medal,Crown,Scissors,Star,Shield,MapPin,UserCircle,Gift} from "lucide-react";
import {ExperiencePage,glass,Status,useLive,money,type CustomerMe,type Loyalty} from "./experience-shared";
export default function PremiumProfile(){
 const me=useLive<CustomerMe>("/api/v1/customers/me");
 const loyalty=useLive<Loyalty>("/api/v1/customers/me/loyalty");
 const points=loyalty.data;
 return <ExperiencePage title="Mi Perfil VIP" subtitle="Tus barberías, puntos e insignias. Cada corte marcado como completado en el sistema aporta puntos verificables.">
  <Status error={me.error||loyalty.error} loading={me.loading||loyalty.loading}/>
  {me.data&&points&&<>
   <motion.section initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className={glass+" relative overflow-hidden p-7 md:p-10"}>
    <div className="absolute right-0 -top-20 h-64 w-64 rounded-full bg-amber-500/15 blur-[80px]"/>
    <div className="relative flex flex-wrap items-center gap-6">
     <div className="h-24 w-24 rounded-full border-2 border-amber-500/50 bg-gradient-to-br from-amber-900/20 to-black flex items-center justify-center shadow-[0_0_35px_rgba(217,119,6,0.15)]"><UserCircle className="h-14 w-14 text-amber-400"/></div>
     <div className="flex-1">
      <h2 className="text-3xl font-headline uppercase tracking-widest">{me.data.user.name}</h2>
      <p className="text-white/45 text-sm mt-2">{me.data.user.email}</p>
      {points.memberSince&&<p className="text-xs mt-2 text-amber-400/70">Miembro desde {new Date(points.memberSince).toLocaleDateString("es-CO")}</p>}
     </div>
     <div className="border border-amber-500/25 rounded-full px-5 py-3 text-amber-300 text-sm font-headline uppercase tracking-widest flex gap-2 items-center"><Crown className="w-5 h-5"/>{points.currentTier}</div>
    </div>
   </motion.section>
   <div className="grid lg:grid-cols-3 gap-5">
    <div className={glass+" lg:col-span-2 p-7 md:p-9 relative overflow-hidden"}>
     <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl"/>
     <div className="flex justify-between items-start gap-4 relative">
      <div><p className="text-[11px] uppercase text-amber-400 tracking-[0.25em]">Rango actual</p>
       <h3 className="font-headline text-3xl md:text-4xl uppercase mt-3 flex gap-3">{points.currentTier}<Trophy className="w-7 h-7 text-amber-400"/></h3>
      </div>
      <div className="text-right"><p className="text-[11px] text-white/40 tracking-widest uppercase">Puntos ganados</p><p className="text-3xl md:text-4xl font-bold text-amber-400 mt-2">{points.points.toLocaleString("es-CO")}</p></div>
     </div>
     <div className="mt-10"><div className="flex justify-between text-xs text-white/55 mb-3"><span>{points.currentTier}</span><span>{points.nextTier||"Rango máximo"}</span></div>
      <div className="h-4 overflow-hidden rounded-full bg-black/70 border border-white/10"><motion.div initial={{width:0}} animate={{width:points.progress+"%"}} transition={{duration:1.2}} className="h-full rounded-full bg-gradient-to-r from-amber-700 via-amber-400 to-yellow-200"/></div>
      <p className="text-right text-xs mt-3 text-white/40">{points.nextTierPoints!==null?Math.max(0,points.nextTierPoints-points.points)+" puntos para el siguiente nivel":"Has alcanzado el nivel máximo"}</p>
     </div>
     <p className="text-xs mt-6 text-white/40">+{points.pointsPerCut} puntos por cada cita de corte completada. No se asignan puntos a citas pendientes o canceladas.</p>
    </div>
    <div className="space-y-4">
     <div className={glass+" p-5 flex items-center gap-5"}><Scissors className="w-8 h-8 text-blue-400"/><div><p className="text-xs uppercase tracking-widest text-white/45">Cortes completados</p><p className="text-2xl font-semibold mt-1">{points.cuts}</p></div></div>
     <div className={glass+" p-5 flex items-center gap-5"}><Medal className="w-8 h-8 text-violet-400"/><div><p className="text-xs uppercase tracking-widest text-white/45">Total pagado en caja</p><p className="text-xl font-semibold mt-1">{money(points.amountSpentMinor)}</p></div></div>
     <div className={glass+" p-5 flex items-center gap-5"}><Gift className="w-8 h-8 text-emerald-400"/><div><p className="text-xs uppercase tracking-widest text-white/45">Insignias obtenidas</p><p className="text-2xl font-semibold mt-1">{points.badges.filter(b=>b.unlocked).length}/{points.badges.length}</p></div></div>
    </div>
   </div>
   <section className={glass+" p-7 md:p-9 space-y-6"}>
    <div className="flex gap-3 items-center"><Star className="text-amber-400 w-6 h-6"/><h3 className="text-2xl font-headline uppercase tracking-widest">Insignias & logros</h3></div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
     {points.badges.map((badge,i)=><div key={badge.name} className={"rounded-2xl border p-5 text-center space-y-3 "+(badge.unlocked?"border-amber-500/30 bg-amber-500/10":"border-white/10 bg-black/30 opacity-55")}>
      <div className="mx-auto w-14 h-14 flex items-center justify-center rounded-full border border-amber-500/20 bg-black/30">
       {badge.unlocked?<Medal className="w-7 h-7 text-amber-400"/>:<Shield className="w-7 h-7 text-white/40"/>}
      </div><p className="font-headline uppercase tracking-wide text-sm">{badge.name}</p><p className="text-xs text-white/45">{badge.description}</p>
      <p className="text-[10px] text-amber-400">{badge.unlocked?"DESBLOQUEADA":badge.goal+" cortes"}</p>
     </div>)}
    </div>
   </section>
   <section className={glass+" p-7 md:p-9 space-y-5"}>
    <h3 className="text-2xl font-headline tracking-widest uppercase flex gap-3 items-center"><MapPin className="text-amber-400"/>Mis barberías vinculadas</h3>
    <div className="grid md:grid-cols-2 gap-4">
     {me.data.relationships.filter(x=>x.status==="ACTIVE").map(relationship=>{
      const local=points.perTenant.find(x=>x.tenantId===relationship.tenantId);
      return <div key={relationship.tenantId} className="rounded-2xl border border-white/10 bg-black/30 p-6 flex justify-between gap-4 items-center">
       <div><h4 className="font-semibold">{relationship.tenantName}</h4><p className="text-xs text-white/45 mt-2">Vinculada desde {new Date(relationship.firstSeenAt).toLocaleDateString("es-CO")}</p></div>
       <div className="text-right text-amber-400"><strong>{local?.points||0} pts</strong><p className="text-xs text-white/50">{local?.cuts||0} visitas</p></div>
      </div>;
     })}
    </div>
    {!me.data.relationships.some(x=>x.status==="ACTIVE")&&<p className="text-white/45">Todavía no tienes una barbería vinculada. Escanea su QR para vincularte.</p>}
   </section>
  </>}
 </ExperiencePage>;
}
