import { NextRequest,NextResponse } from "next/server";
import { eq,and,desc,or,isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/infrastructure/database/client";
import { customerIntakes } from "@/infrastructure/database/schema/customer-intake";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { users } from "@/infrastructure/database/schema/users";
import { customerRelationships } from "@/infrastructure/database/schema/professionals";
import { SESSION_COOKIE_NAME, validateSessionWithDb } from "@/infrastructure/auth/session";
import { validateCustomerQr } from "@/modules/customers/domain/signed-qr";
import { requireQrManagement } from "@/modules/customers/application/qr-access";
import { checkRateLimit,extractClientIp } from "@/infrastructure/security";
import { getRedisProducerClient } from "@/infrastructure/redis/redis-connection-factory";
import { AppError,ConflictError } from "@/shared/errors/app-error";
const schema=z.object({
 token:z.string().max(200),
 name:z.string().trim().min(2).max(255),
 phone:z.string().trim().min(7).max(40),
 email:z.union([z.string().trim().email().max(255),z.literal("")]).optional(),
 consent:z.literal(true),
 honeypot:z.string().max(50).optional(),
}).strict();
const out=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:NextRequest) {
 try{
  const {tenantId}=await requireQrManagement(req);
  const records=await db.select({
   id:customerIntakes.id,name:customerIntakes.name,phone:customerIntakes.phone,
   email:customerIntakes.email,status:customerIntakes.status,createdAt:customerIntakes.createdAt,
   updatedAt:customerIntakes.updatedAt,
  }).from(customerIntakes).where(eq(customerIntakes.tenantId,tenantId))
  .orderBy(desc(customerIntakes.updatedAt)).limit(200);
  return out({data:records});
 }catch(e){return e instanceof AppError?out({error:e.message},e.statusCode):out({error:"Error interno"},500);}
}
export async function POST(req:NextRequest){
 try{
  const input=schema.safeParse(await req.json());
  if(!input.success)return out({error:"Datos de registro inválidos"},400);
  if(input.data.honeypot)return out({ok:true},202);
  const tenantId=validateCustomerQr(input.data.token);
  if(!tenantId)return out({error:"QR inválido o alterado"},400);
  const phone=input.data.phone.replace(/[^0-9+]/g,"");
  const normalized=phone.replace(/[^0-9]/g,"");
  if(normalized.length<7 || normalized.length>15)return out({error:"Teléfono inválido"},400);
  // On a cold boot, wait for the Redis connection before the fail-closed guard.
  const redis=getRedisProducerClient();
  if(redis.status!=="ready"){
   try {
    await new Promise<void>((resolve,reject)=>{
     const timeout=setTimeout(()=>{cleanup();reject(new Error("Redis not ready"));},2000);
     function cleanup(){clearTimeout(timeout);redis.off("ready",ready);redis.off("end",ended);}
     function ready(){cleanup();resolve();}
     function ended(){cleanup();reject(new Error("Redis unavailable"));}
     redis.once("ready",ready);redis.once("end",ended);
     if(redis.status==="ready")ready();
    });
   }catch{return out({error:"Registro temporalmente no disponible"},503);}
  }
  const limit=await checkRateLimit("customer.qr.register",
    tenantId+":"+extractClientIp(req));
  if(!limit.allowed)return limit.response??out({error:"Demasiados intentos"},429);
  const [tenant]=await db.select({id:tenants.id}).from(tenants)
  .where(and(eq(tenants.id,tenantId),eq(tenants.status,"ACTIVE"))).limit(1);
  if(!tenant)return out({error:"Barbería no disponible"},404);
  const signedCookie=req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated=signedCookie?await validateSessionWithDb(signedCookie):null;
  const existing=authenticated?await db.select({name:users.name,email:users.email})
    .from(users).where(eq(users.id,authenticated.userId)).limit(1):[];
  // No claimed global identity solely on a typed email/phone.
  const linkedUserId=existing.length?authenticated!.userId:null;
  const now=new Date();
  const intake=await db.transaction(async tx=>{
   const [record]=await tx.insert(customerIntakes).values({
    tenantId,name:linkedUserId?existing[0].name:input.data.name,
    phone:input.data.phone,phoneNormalized:normalized,
    email:linkedUserId?existing[0].email:input.data.email||null,
    status:linkedUserId?"LINKED":"UNVERIFIED",customerUserId:linkedUserId,updatedAt:now,
   }).onConflictDoUpdate({
     target:[customerIntakes.tenantId,customerIntakes.phoneNormalized],
     set:{
       ...(linkedUserId ? {
         name:existing[0].name,phone:input.data.phone,email:existing[0].email,
         status:"LINKED",customerUserId:linkedUserId,
       } : {}),
       // An anonymous revisit must never overwrite a previously linked identity.
       updatedAt:now,
     },
     setWhere: linkedUserId
       ? or(isNull(customerIntakes.customerUserId),eq(customerIntakes.customerUserId,linkedUserId))
       : undefined,
   }).returning({id:customerIntakes.id,status:customerIntakes.status});
   if(!record)throw new ConflictError("Este teléfono ya está vinculado a otra cuenta");
   if(linkedUserId){
    await tx.insert(customerRelationships).values({tenantId,customerUserId:linkedUserId,lastSeenAt:now})
    .onConflictDoUpdate({
     target:[customerRelationships.tenantId,customerRelationships.customerUserId],
     set:{status:"ACTIVE",lastSeenAt:now,updatedAt:now},
    });
   }
   return record;
  });
  return out({data:{id:intake.id,status:intake.status,
    message:linkedUserId?"Vinculación confirmada":"Registro recibido; verifica tu identidad para vincular tu cuenta"}},201);
 }catch(e){
  if(e instanceof SyntaxError)return out({error:"JSON inválido"},400);
  if(e instanceof AppError)return out({error:e.message},e.statusCode);
  return out({error:"No se pudo registrar al cliente"},500);
 }
}
