import { NextRequest,NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { signCustomerQr,validateCustomerQr } from "@/modules/customers/domain/signed-qr";
import { requireQrManagement } from "@/modules/customers/application/qr-access";
import { AppError } from "@/shared/errors/app-error";
const out=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:NextRequest){
 try{
  const token=req.nextUrl.searchParams.get("token");
  if(token){
   const tenantId=validateCustomerQr(token);
   if(!tenantId)return out({error:"Código QR inválido"},400);
   const [tenant]=await db.select({id:tenants.id,name:tenants.name}).from(tenants)
    .where(and(eq(tenants.id,tenantId),eq(tenants.status,"ACTIVE"))).limit(1);
   if(!tenant)return out({error:"Barbería no disponible"},404);
   return out({data:{name:tenant.name}});
  }
  const member=await requireQrManagement(req);
  const qrToken=signCustomerQr(member.tenantId);
  return out({data:{tenantId:member.tenantId,tenantName:member.tenantName,
   url:new URL("/qr-register?token="+encodeURIComponent(qrToken),req.nextUrl.origin).toString()}});
 }catch(e){
  if(e instanceof AppError)return out({error:e.message},e.statusCode);
  return out({error:"Error interno"},500);
 }
}
