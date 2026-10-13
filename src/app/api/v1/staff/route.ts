import {NextRequest,NextResponse} from "next/server";
import {and,eq,desc,isNull} from "drizzle-orm";
import {z} from "zod";
import {randomBytes} from "node:crypto";
import {db} from "@/infrastructure/database/client";
import {users} from "@/infrastructure/database/schema/users";
import {memberships} from "@/infrastructure/database/schema/memberships";
import {membershipRoles,roles} from "@/infrastructure/database/schema/roles";
import {staffProfiles} from "@/infrastructure/database/schema/staff";
import {auditLogs} from "@/infrastructure/database/schema/audit";
import {PasswordHasher} from "@/modules/identity/infrastructure/password-hasher";
import {requireStaffAdmin} from "@/modules/staff/application/staff-admin-auth";
import {AppError} from "@/shared/errors/app-error";
const input=z.object({name:z.string().trim().min(2).max(255),email:z.string().trim().email().max(255)}).strict();
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store,max-age=0"}});
export async function GET(req:NextRequest) {
 try{
  const {tenantId}=await requireStaffAdmin(req);
  const rows=await db.select({
    id:staffProfiles.id,name:staffProfiles.displayName,email:users.email,
    status:staffProfiles.status,membershipStatus:memberships.status,
    createdAt:staffProfiles.createdAt, membershipId:memberships.id,
  }).from(staffProfiles)
  .innerJoin(memberships,eq(staffProfiles.membershipId,memberships.id))
  .innerJoin(users,eq(memberships.userId,users.id))
  .where(eq(staffProfiles.tenantId,tenantId))
  .orderBy(desc(staffProfiles.createdAt));
  return reply({data:rows});
 }catch(e){return e instanceof AppError?reply({error:e.message},e.statusCode):reply({error:"Error interno"},500);}
}
export async function POST(req:NextRequest){
 try{
  const auth=await requireStaffAdmin(req);
  const body=input.safeParse(await req.json());
  if(!body.success)return reply({error:"Nombre y correo válidos son obligatorios"},400);
  const normalized=body.data.email.toLowerCase();
  const secret=randomBytes(24).toString("base64url");
  const passwordHash=await PasswordHasher.hash(secret);
  const result=await db.transaction(async tx=>{
   const [existing]=await tx.select({id:users.id}).from(users).where(eq(users.emailNormalized,normalized)).limit(1);
   if(existing)throw new Error("EMAIL_EXISTS");
   const [account]=await tx.insert(users).values({
     email:body.data.email,emailNormalized:normalized,
     name:body.data.name,passwordHash,status:"ACTIVE",
   }).returning({id:users.id,email:users.email});
   const [role]=await tx.select().from(roles)
     .where(and(eq(roles.name,"EMPLOYEE"),isNull(roles.tenantId))).limit(1);
   if(!role)throw new Error("EMPLOYEE_ROLE_NOT_CONFIGURED");
   const [membership]=await tx.insert(memberships).values({
    tenantId:auth.tenantId,userId:account.id,status:"ACTIVE",
   }).returning();
   await tx.insert(membershipRoles).values({membershipId:membership.id,roleId:role.id});
   const [staff]=await tx.insert(staffProfiles).values({
    tenantId:auth.tenantId,membershipId:membership.id,displayName:body.data.name,
   }).returning({id:staffProfiles.id});
   await tx.insert(auditLogs).values({
    tenantId:auth.tenantId,actorUserId:auth.actorUserId,action:"STAFF_PROVISIONED",
    entityType:"STAFF",entityId:staff.id,metadata:{userId:account.id},
   });
   return {id:staff.id,email:account.email,name:body.data.name,status:"ACTIVE"};
  });
  return reply({data:result,credentials:{email:result.email,temporaryPassword:secret}},201);
 }catch(e){
  if(e instanceof SyntaxError)return reply({error:"JSON inválido"},400);
  if(e instanceof AppError)return reply({error:e.message},e.statusCode);
  if((e as Error).message==="EMAIL_EXISTS"||(e as {code?:string}).code==="23505")
   return reply({error:"El correo ya existe. Vincula la cuenta mediante una invitación verificada.",code:"CONFLICT"},409);
  return reply({error:"No se pudo crear el barbero"},500);
 }
}
