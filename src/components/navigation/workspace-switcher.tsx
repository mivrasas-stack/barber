"use client";

import {useCallback,useEffect,useState} from "react";
import {usePathname,useRouter} from "next/navigation";
import {
 DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,
 DropdownMenuSeparator,DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Building2,Check,ChevronsUpDown,Plus,Scissors,AlertCircle} from "lucide-react";

// Matches GET /api/v1/workspaces (WorkspaceContext), not an unrelated UI type.
export interface WorkspaceSummary {
 id:string;
 name:string;
 slug:string;
 type:"BUSINESS"|"SOLO_PROFESSIONAL";
 role:string;
 isOwner:boolean;
}
interface WorkspaceResponse {
 workspaces:WorkspaceSummary[];
 activeWorkspaceId:string|null;
}

export function WorkspaceSwitcher(){
 const router=useRouter();
 const pathname=usePathname();
 const [workspaces,setWorkspaces]=useState<WorkspaceSummary[]>([]);
 const [activeId,setActiveId]=useState<string|null>(null);
 const [isLoading,setIsLoading]=useState(true);
 const [isSwitching,setIsSwitching]=useState(false);
 const [error,setError]=useState("");
 const load=useCallback(async()=>{
  setIsLoading(true);setError("");
  try{
   const response=await fetch("/api/v1/workspaces",{cache:"no-store"});
   const data:WorkspaceResponse&{error?:string}=await response.json();
   if(!response.ok)throw new Error(data.error||"No fue posible cargar tus barberías");
   setWorkspaces(data.workspaces||[]);
   setActiveId(data.activeWorkspaceId||null);
  }catch(e){setError(e instanceof Error?e.message:"Error al cargar tus barberías");}
  finally{setIsLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 const active=workspaces.find(w=>w.id===activeId)||null;

 async function handleSwitch(target:WorkspaceSummary){
  if(target.id===activeId)return;
  setError("");setIsSwitching(true);
  try{
   const response=await fetch("/api/v1/workspaces/switch",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({workspaceId:target.id}),
   });
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"No se pudo cambiar de barbería");
   setActiveId(target.id);
   // Reload client-side queries (staff, products, POS) after the server-owned cookie changes.
   const destination=target.type==="SOLO_PROFESSIONAL"?"/professional"
    :pathname.startsWith("/business")||pathname.startsWith("/barber")?pathname:"/business";
   if(destination===pathname)window.location.reload();
   else window.location.assign(destination);
  }catch(e){
   setError(e instanceof Error?e.message:"No se pudo seleccionar la barbería");
   setIsSwitching(false);
  }
 }
 const message=isLoading?"Cargando barberías…":active?.name||
  (workspaces.length?"Seleccionar barbería":"Sin barberías vinculadas");
 return <div className="flex flex-col gap-1 max-w-[240px]">
  <DropdownMenu>
   <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm"
     aria-label="Seleccionar barbería activa"
     className="flex items-center gap-2 border-border/60 bg-background/80 hover:bg-muted/40 h-9 px-3 text-xs font-medium"
     disabled={isLoading||isSwitching}>
     {active?.type==="SOLO_PROFESSIONAL"?<Scissors className="w-3.5 h-3.5 text-amber-500"/>:
      <Building2 className="w-3.5 h-3.5 text-blue-500"/>}
     <span className="font-semibold text-foreground max-w-[130px] truncate">{message}</span>
     {active&&<Badge variant="secondary" className="text-[10px] uppercase py-0 px-1.5">
      {active.type==="SOLO_PROFESSIONAL"?"Solo":"Barbería"}
     </Badge>}
     <ChevronsUpDown className="w-3.5 h-3.5 opacity-70"/>
    </Button>
   </DropdownMenuTrigger>
   <DropdownMenuContent align="start" className="w-72">
    <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">Tus espacios de trabajo</DropdownMenuLabel>
    <DropdownMenuSeparator/>
    {workspaces.map(ws=><DropdownMenuItem key={ws.id} onClick={()=>void handleSwitch(ws)}
     className="flex items-center justify-between py-3 cursor-pointer">
     <div className="flex items-center gap-2 min-w-0">
      {ws.type==="SOLO_PROFESSIONAL"?<Scissors className="w-4 h-4 text-amber-500 shrink-0"/>:
       <Building2 className="w-4 h-4 text-blue-500 shrink-0"/>}
      <div className="flex flex-col min-w-0">
       <span className="text-xs font-medium truncate">{ws.name}</span>
       <span className="text-[10px] text-muted-foreground">Rol: {ws.role}</span>
      </div>
     </div>
     {activeId===ws.id&&<Check className="w-4 h-4 text-emerald-500 shrink-0"/>}
    </DropdownMenuItem>)}
    {!workspaces.length&&<DropdownMenuItem disabled>No hay barberías activas para esta cuenta</DropdownMenuItem>}
    <DropdownMenuSeparator/>
    <DropdownMenuItem onClick={()=>router.push("/register/professional")} className="text-xs text-primary">
     <Plus className="w-3.5 h-3.5 mr-2"/> Registrar espacio profesional
    </DropdownMenuItem>
   </DropdownMenuContent>
  </DropdownMenu>
  {error&&<button type="button" onClick={()=>void load()} className="text-xs text-red-500 text-left flex gap-1 items-start">
   <AlertCircle className="w-3.5 h-3.5 shrink-0"/>{error}. Reintentar
  </button>}
 </div>;
}
