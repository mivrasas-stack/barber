import {NextRequest,NextResponse} from "next/server";
import {and,eq} from "drizzle-orm";
import {db} from "@/infrastructure/database/client";
import {services} from "@/infrastructure/database/schema/services";
import {products,productVariants,inventoryPositions} from "@/infrastructure/database/schema/commerce";
import {locations} from "@/infrastructure/database/schema/locations";
import {authorizeCommerceRequest} from "@/modules/commerce/infrastructure/commerce-auth";
import {AppError} from "@/shared/errors/app-error";

export async function GET(req:NextRequest){
 try{
  const auth=await authorizeCommerceRequest(req,{requiredModule:"pos.checkout",requiredPermission:"pos.checkout"});
  const allowedLocs=await db.select({id:locations.id,name:locations.name}).from(locations)
    .where(and(eq(locations.tenantId,auth.tenantId),eq(locations.status,"ACTIVE")));
  const place=allowedLocs.find(l=>auth.authorizedLocationIds.length===0||auth.authorizedLocationIds.includes(l.id));
  if(!place)return NextResponse.json({error:"No hay una sede autorizada activa"},{status:403});
  const serviceRows=await db.select({
   id:services.id,name:services.name,priceMinor:services.priceMinor
  }).from(services).where(and(eq(services.tenantId,auth.tenantId),eq(services.status,"ACTIVE")));
  const variants=await db.select({
   id:productVariants.id,name:productVariants.name,priceMinor:productVariants.priceMinor,
   productName:products.name,stock:inventoryPositions.onHand,
   reserved:inventoryPositions.reserved,trackInventory:productVariants.trackInventory,
  }).from(productVariants).innerJoin(products,eq(productVariants.productId,products.id))
   .leftJoin(inventoryPositions,and(
     eq(inventoryPositions.productVariantId,productVariants.id),
     eq(inventoryPositions.ownerTenantId,auth.tenantId),
     eq(inventoryPositions.locationId,place.id)))
   .where(and(eq(products.ownerTenantId,auth.tenantId),eq(products.status,"ACTIVE"),
     eq(productVariants.status,"ACTIVE")));
  return NextResponse.json({data:{
   tenantId:auth.tenantId,locationId:place.id,locationName:place.name,
   items:[
    ...serviceRows.map(s=>({id:s.id,type:"SERVICE",name:s.name,priceMinor:String(s.priceMinor)})),
    ...variants.map(v=>({id:v.id,type:"PRODUCT",name:v.productName+" ("+v.name+")",
      priceMinor:v.priceMinor.toString(),stock:v.trackInventory?Math.max(0,(v.stock||0)-(v.reserved||0)):null}))
   ]
  }},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  if(e instanceof AppError)return NextResponse.json({error:e.message},{status:e.statusCode});
  return NextResponse.json({error:"No fue posible consultar catálogo de caja"},{status:500});
 }
}
