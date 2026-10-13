import {NextRequest,NextResponse} from "next/server";
import {and,eq} from "drizzle-orm";
import {z} from "zod";
import {db} from "@/infrastructure/database/client";
import {memberships} from "@/infrastructure/database/schema/memberships";
import {staffProfiles} from "@/infrastructure/database/schema/staff";
import {auditLogs} from "@/infrastructure/database/schema/audit";
import {requireStaffAdmin} from "@/modules/staff/application/staff-admin-auth";
import {AppError} from "@/shared/errors/app-error";
const input=z.object({status:z.enum(["ACTIVE","SUSPENDED"])}).strict();
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const auth=await requireStaffAdmin(req);
  const {id}=await params;
  if(!z.string().uuid().safeParse(id).success)return reply({error:"ID inválido"},400);
  const parsed=input.safeParse(await req.json());
  if(!parsed.success)return reply({error:"Estado inválido"},400);
  const updated=await db.transaction(async tx=>{
   const [staff]=await tx.select().from(staffProfiles)
    .where(and(eq(staffProfiles.id,id),eq(staffProfiles.tenantId,auth.tenantId))).for("update").limit(1);
   if(!staff)return null;
   const [member]=await tx.select().from(memberships).where(eq(memberships.id,staff.membershipId)).limit(1);
   if(!member||member.tenantId!==auth.tenantId)return null;
   await tx.update(staffProfiles).set({status:parsed.data.status,updatedAt:new Date()}).where(eq(staffProfiles.id,id));
   await tx.update(memberships).set({status:parsed.data.status,updatedAt:new Date()}).where(eq(memberships.id,staff.membershipId));
   await tx.insert(auditLogs).values({
    tenantId:auth.tenantId,actorUserId:auth.actorUserId,action:"STAFF_STATUS_CHANGED",
    entityType:"STAFF",entityId:id,metadata:{before:staff.status,after:parsed.data.status},
   });
   return {id,status:parsed.data.status};
  });
  return updated?reply({data:updated}):reply({error:"Barbero no encontrado"},404);
 }catch(e){return e instanceof AppError?reply({error:e.message},e.statusCode):reply({error:"Error interno"},500);}
}
