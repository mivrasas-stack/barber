import {NextRequest} from "next/server";
import {and,eq,desc} from "drizzle-orm";
import {z} from "zod";
import {db} from "@/infrastructure/database/client";
import {customerFavorites} from "@/infrastructure/database/schema/customer-experience";
import {customerRelationships} from "@/infrastructure/database/schema/professionals";
import {tenants} from "@/infrastructure/database/schema/tenants";
import {staffProfiles} from "@/infrastructure/database/schema/staff";
import {requireCustomerSession,customerResponse,customerError} from "@/modules/customers/application/customer-portal-auth";
import {ValidationError,ForbiddenError} from "@/shared/errors/app-error";

const choice=z.object({tenantId:z.string().uuid(),targetType:z.enum(["TENANT","STAFF"]),targetId:z.string().uuid()}).strict();
async function validateChoice(userId:string, input:z.infer<typeof choice>){
 const [rel]=await db.select({id:customerRelationships.id}).from(customerRelationships)
 .innerJoin(tenants,and(eq(tenants.id,customerRelationships.tenantId),eq(tenants.status,"ACTIVE")))
 .where(and(eq(customerRelationships.customerUserId,userId),eq(customerRelationships.status,"ACTIVE"),
  eq(customerRelationships.tenantId,input.tenantId))).limit(1);
 if(!rel)throw new ForbiddenError("Vincúlate a esta barbería antes de agregar favoritos");
 if(input.targetType==="TENANT"){
  if(input.targetId!==input.tenantId)throw new ValidationError("Barbería inválida");
 }else{
  const [staff]=await db.select({id:staffProfiles.id}).from(staffProfiles)
   .where(and(eq(staffProfiles.id,input.targetId),eq(staffProfiles.tenantId,input.tenantId),
    eq(staffProfiles.status,"ACTIVE"))).limit(1);
  if(!staff)throw new ValidationError("Barbero no pertenece a esta barbería");
 }
}
export async function GET(request:NextRequest){
 try{
  const session=await requireCustomerSession(request);
  const rows=await db.select({
   id:customerFavorites.id,tenantId:customerFavorites.tenantId,
   targetType:customerFavorites.targetType,targetId:customerFavorites.targetId,
   tenantName:tenants.name,createdAt:customerFavorites.createdAt,
  }).from(customerFavorites).innerJoin(tenants,eq(tenants.id,customerFavorites.tenantId))
  .where(eq(customerFavorites.userId,session.userId))
  .orderBy(desc(customerFavorites.createdAt)).limit(100);
  const results=await Promise.all(rows.map(async row=>{
   if(row.targetType!=="STAFF")return {...row,targetName:row.tenantName};
   const [staff]=await db.select({name:staffProfiles.displayName}).from(staffProfiles)
    .where(eq(staffProfiles.id,row.targetId)).limit(1);
   return {...row,targetName:staff?.name||"Barbero no disponible"};
  }));
  return customerResponse({data:results});
 }catch(e){return customerError(e);}
}
export async function POST(request:NextRequest){
 try{
  const session=await requireCustomerSession(request);
  const input=choice.safeParse(await request.json());
  if(!input.success)throw new ValidationError("Favorito inválido");
  await validateChoice(session.userId,input.data);
  await db.insert(customerFavorites).values({userId:session.userId,...input.data})
   .onConflictDoNothing({target:[customerFavorites.userId,customerFavorites.targetType,customerFavorites.targetId]});
  return customerResponse({success:true},201);
 }catch(e){return customerError(e);}
}
export async function DELETE(request:NextRequest){
 try{
  const session=await requireCustomerSession(request);
  const input=choice.safeParse(await request.json());
  if(!input.success)throw new ValidationError("Favorito inválido");
  await db.delete(customerFavorites).where(and(eq(customerFavorites.userId,session.userId),
   eq(customerFavorites.tenantId,input.data.tenantId),eq(customerFavorites.targetType,input.data.targetType),
   eq(customerFavorites.targetId,input.data.targetId)));
  return customerResponse({success:true});
 }catch(e){return customerError(e);}
}
