import {NextRequest,NextResponse} from "next/server";
import {and,eq,inArray} from "drizzle-orm";
import {z} from "zod";
import {db} from "@/infrastructure/database/client";
import {services} from "@/infrastructure/database/schema/services";
import {products,productVariants} from "@/infrastructure/database/schema/commerce";
import {locations} from "@/infrastructure/database/schema/locations";
import {authorizeCommerceRequest} from "@/modules/commerce/infrastructure/commerce-auth";
import {DrizzleOrderRepository} from "@/modules/orders/infrastructure/drizzle-order.repository";
import {DrizzleProductRepository} from "@/modules/commerce/infrastructure/drizzle-product.repository";
import {DrizzleInventoryRepository} from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import {DrizzleFinanceRepository} from "@/modules/finance/infrastructure/drizzle-finance.repository";
import {CreateDraftOrderUseCase} from "@/modules/orders/application/create-draft-order.usecase";
import {CompleteOrderUseCase} from "@/modules/pos/application/complete-order.usecase";
import {checkRateLimit} from "@/infrastructure/security";
import {AppError,ConflictError,ValidationError} from "@/shared/errors/app-error";

const saleSchema=z.object({
 checkoutKey:z.string().uuid(),locationId:z.string().uuid(),
 customerName:z.string().trim().max(255).optional(),
 amountReceivedMinor:z.string().regex(/^[0-9]{1,15}$/),
 items:z.array(z.object({
  type:z.enum(["PRODUCT","SERVICE"]),id:z.string().uuid(),quantity:z.number().int().min(1).max(100)
 }).strict()).min(1).max(50),
}).strict();

const orderRepo=new DrizzleOrderRepository();
const productRepo=new DrizzleProductRepository();
const inventoryRepo=new DrizzleInventoryRepository();
const financeRepo=new DrizzleFinanceRepository();

export async function POST(req:NextRequest){
 try{
  const auth=await authorizeCommerceRequest(req,{requiredModule:"pos.checkout",requiredPermission:"pos.checkout"});
  const parsed=saleSchema.safeParse(await req.json());
  if(!parsed.success)throw new ValidationError("Datos del POS inválidos");
  const input=parsed.data;
  auth.assertLocationAccess(input.locationId);
  const [location]=await db.select({id:locations.id}).from(locations)
   .where(and(eq(locations.id,input.locationId),eq(locations.tenantId,auth.tenantId),eq(locations.status,"ACTIVE"))).limit(1);
  if(!location)throw new ValidationError("La sede no pertenece a esta barbería");
  const limit=await checkRateLimit("pos.checkout",auth.tenantId+":"+auth.userId);
  if(!limit.allowed)return limit.response!;
  let order=await orderRepo.findById(input.checkoutKey);
  if(order){
   if(order.contextTenantId!==auth.tenantId||order.createdByUserId!==auth.userId
     ||order.locationId!==input.locationId)throw new ConflictError("ID de venta en uso");
   if(order.status==="CANCELLED")throw new ConflictError("Orden cancelada");
   const storedItems=order.items.map(x=>({type:x.itemType,id:x.itemType==="PRODUCT"?x.productVariantId:x.serviceId,quantity:x.quantity})).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
   const requested=input.items.map(x=>({...x})).sort((a,b)=>a.id.localeCompare(b.id));
   if(JSON.stringify(storedItems)!==JSON.stringify(requested))throw new ConflictError("Clave de venta reutilizada con carrito diferente");
  }else{
   const serviceIds=input.items.filter(x=>x.type==="SERVICE").map(x=>x.id);
   const variantIds=input.items.filter(x=>x.type==="PRODUCT").map(x=>x.id);
   const serviceRows=serviceIds.length?await db.select().from(services)
     .where(and(inArray(services.id,serviceIds),eq(services.tenantId,auth.tenantId),eq(services.status,"ACTIVE"))):[];
   const variantRows=variantIds.length?await db.select({id:productVariants.id,priceMinor:productVariants.priceMinor,
    ownerTenantId:products.ownerTenantId}).from(productVariants)
    .innerJoin(products,eq(productVariants.productId,products.id))
    .where(and(inArray(productVariants.id,variantIds),eq(products.ownerTenantId,auth.tenantId),
      eq(products.status,"ACTIVE"),eq(productVariants.status,"ACTIVE"))):[];
   if(serviceRows.length!==new Set(serviceIds).size||variantRows.length!==new Set(variantIds).size)
    throw new ValidationError("El producto o servicio no está disponible en esta barbería");
   const allowedSellers=await auth.getAllowedSellerTenantIds(input.locationId);
   const draft=new CreateDraftOrderUseCase(orderRepo,productRepo);
   order=await draft.execute({
    id:input.checkoutKey,orderNumber:"POS-"+input.checkoutKey,
    contextTenantId:auth.tenantId,locationId:input.locationId,
    customerNameSnapshot:input.customerName||"Consumidor final",
    createdByUserId:auth.userId,allowedSellerTenantIds:allowedSellers,
    items:input.items.map(x=>x.type==="SERVICE"?
     {itemType:"SERVICE" as const,serviceId:x.id,description:serviceRows.find(s=>s.id===x.id)!.name,
       quantity:x.quantity,unitPriceMinor:BigInt(serviceRows.find(s=>s.id===x.id)!.priceMinor),
       sellerTenantId:auth.tenantId}:
     {itemType:"PRODUCT" as const,productVariantId:x.id,quantity:x.quantity,sellerTenantId:auth.tenantId}),
   });
  }
  if(order.grandTotalMinor<=0n)throw new ValidationError("El total debe ser positivo");
  const received=BigInt(input.amountReceivedMinor);
  if(received<order.grandTotalMinor)throw new ValidationError("Efectivo recibido insuficiente");
  const completed=await new CompleteOrderUseCase(orderRepo,inventoryRepo,financeRepo).execute({
   orderId:order.id,idempotencyKey:input.checkoutKey,actorUserId:auth.userId,
   tenders:[{method:"CASH",amountMinor:order.grandTotalMinor,amountReceivedMinor:received}],
  });
  return NextResponse.json({data:{
   id:completed.id,orderNumber:completed.orderNumber,status:completed.status,
   grandTotalMinor:completed.grandTotalMinor.toString(),
   changeDueMinor:(received-completed.grandTotalMinor).toString(),
  }},{status:200,headers:{"Cache-Control":"no-store"}});
 }catch(e){
  if(e instanceof SyntaxError)return NextResponse.json({error:"JSON inválido"},{status:400});
  if(e instanceof AppError)return NextResponse.json({error:e.message,code:e.code},{status:e.statusCode});
  const code=(e as {code?:string}).code;
  if(code==="23505")return NextResponse.json({error:"La venta ya está en proceso: reintenta con el mismo identificador"},{status:409});
  // Never mark a sale paid when ledger, stock or order completion failed.
  return NextResponse.json({error:"No se confirmó la venta. Consulta el historial antes de reintentar."},{status:500});
 }
}
