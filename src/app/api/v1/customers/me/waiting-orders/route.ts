import {randomUUID} from "node:crypto";
import {NextRequest} from "next/server";
import {and,desc,eq,or} from "drizzle-orm";
import {z} from "zod";
import {db} from "@/infrastructure/database/client";
import {orders} from "@/infrastructure/database/schema/commerce";
import {appointments} from "@/infrastructure/database/schema/appointments";
import {customerProductCatalog} from "@/modules/customers/application/customer-products";
import {requireCustomerSession,customerResponse,customerError} from "@/modules/customers/application/customer-portal-auth";
import {CreateDraftOrderUseCase} from "@/modules/orders/application/create-draft-order.usecase";
import {DrizzleOrderRepository} from "@/modules/orders/infrastructure/drizzle-order.repository";
import {DrizzleProductRepository} from "@/modules/commerce/infrastructure/drizzle-product.repository";
import {ValidationError,ForbiddenError,ConflictError} from "@/shared/errors/app-error";
import {checkRateLimit} from "@/infrastructure/security";
import {ModuleEntitlementResolver} from "@/modules/modules/application/module-entitlement-resolver";
import {DrizzleModuleRepository} from "@/modules/modules/infrastructure/drizzle-module.repository";
import {DrizzleSubscriptionRepository} from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";

const schema=z.object({
 appointmentId:z.string().uuid(),requestId:z.string().uuid(),
 items:z.array(z.object({variantId:z.string().uuid(),quantity:z.number().int().min(1).max(5)}).strict()).min(1).max(10),
}).strict();
const repo=new DrizzleOrderRepository();
export async function GET(request:NextRequest){
 try{
  const session=await requireCustomerSession(request);
  const rows=await db.select({id:orders.id,orderNumber:orders.orderNumber,status:orders.status,
   totalMinor:orders.grandTotalMinor,createdAt:orders.createdAt,tenantId:orders.contextTenantId})
    .from(orders).where(and(eq(orders.customerUserId,session.userId),
     eq(orders.notes,"WAITING_ROOM_PAY_AT_REGISTER")))
    .orderBy(desc(orders.createdAt)).limit(30);
  return customerResponse({data:rows.map(x=>({...x,totalMinor:x.totalMinor.toString()}))});
 }catch(e){return customerError(e);}
}
export async function POST(request:NextRequest){
 try{
  const session=await requireCustomerSession(request);
  const parsed=schema.safeParse(await request.json());
  if(!parsed.success)throw new ValidationError("Productos o cantidades inválidos");
  const input=parsed.data;
  if(new Set(input.items.map(i=>i.variantId)).size!==input.items.length)
   throw new ValidationError("No se pueden duplicar productos en el mismo pedido");
  const [appointment]=await db.select().from(appointments)
   .where(and(eq(appointments.id,input.appointmentId),eq(appointments.customerUserId,session.userId))).limit(1);
  if(!appointment||!["CONFIRMED","IN_PROGRESS","ARRIVED"].includes(appointment.status))
   throw new ForbiddenError("Solo puedes pedir productos para una cita activa");
  const now=Date.now();
  if(now<appointment.startsAt.getTime()-3*3600000||now>appointment.endsAt.getTime()+3600000)
   throw new ForbiddenError("Los pedidos de sala de espera están disponibles cerca del horario de tu cita");
  const code="WR-"+input.requestId;
  const old=await repo.findByOrderNumber(code);
  if(old){
   if(old.customerUserId!==session.userId||old.appointmentId!==input.appointmentId)
    throw new ConflictError("Código de pedido en uso");
   return customerResponse({data:{code:old.orderNumber,status:old.status,totalMinor:old.grandTotalMinor.toString()},replay:true});
  }
  const resolver=new ModuleEntitlementResolver(new DrizzleModuleRepository(),new DrizzleSubscriptionRepository());
  if(!await resolver.isModuleEnabled(appointment.tenantId,"pos.checkout"))
   throw new ForbiddenError("La caja de esta barbería no tiene el módulo habilitado");
  const catalog=await customerProductCatalog(session.userId,true);
  const lines=input.items.map(item=>{
   const product=catalog.find(p=>p.variantId===item.variantId&&p.tenantId===appointment.tenantId&&
    p.locationId===appointment.locationId);
   if(!product||!product.available||product.availableUnits!==null&&product.availableUnits<item.quantity)
    throw new ValidationError("Producto agotado o no ofrecido en esta sede");
   return {itemType:"PRODUCT" as const,productVariantId:item.variantId,quantity:item.quantity,
    sellerTenantId:appointment.tenantId};
  });
  const throttle=await checkRateLimit("pos.checkout",appointment.tenantId+":waiting:"+session.userId);
  if(!throttle.allowed&&throttle.response)return throttle.response;
  try{
   const order=await new CreateDraftOrderUseCase(repo,new DrizzleProductRepository()).execute({
    orderNumber:code,contextTenantId:appointment.tenantId,locationId:appointment.locationId,
    customerUserId:session.userId,customerNameSnapshot:session.name,customerEmailSnapshot:session.email,
    appointmentId:appointment.id,createdByUserId:session.userId,
    notes:"WAITING_ROOM_PAY_AT_REGISTER",
    allowedSellerTenantIds:[appointment.tenantId],items:lines,
   });
   return customerResponse({data:{code:order.orderNumber,status:order.status,
    totalMinor:order.grandTotalMinor.toString(),warning:"Pendiente de pago y disponibilidad en caja"}},201);
  }catch(error){
   if((error as {code?:string})?.code==="23505"){
    const existing=await repo.findByOrderNumber(code);
    if(existing?.customerUserId===session.userId&&existing.appointmentId===input.appointmentId)
     return customerResponse({data:{code:existing.orderNumber,status:existing.status,totalMinor:existing.grandTotalMinor.toString()},replay:true});
   }
   throw error;
  }
 }catch(e){return customerError(e);}
}
