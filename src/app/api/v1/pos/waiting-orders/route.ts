import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {authorizeCommerceRequest} from "@/modules/commerce/infrastructure/commerce-auth";
import {DrizzleOrderRepository} from "@/modules/orders/infrastructure/drizzle-order.repository";
import {DrizzleInventoryRepository} from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import {DrizzleFinanceRepository} from "@/modules/finance/infrastructure/drizzle-finance.repository";
import {CompleteOrderUseCase} from "@/modules/pos/application/complete-order.usecase";
import {checkRateLimit} from "@/infrastructure/security";
import {AppError,ValidationError,ForbiddenError} from "@/shared/errors/app-error";
const codeSchema=z.string().regex(/^WR-[0-9a-f-]{36}$/i);
const paySchema=z.object({code:codeSchema,amountReceivedMinor:z.string().regex(/^\d{1,15}$/)}).strict();
const repo=new DrizzleOrderRepository();
async function authorizedOrder(request:NextRequest,code:string){
 const auth=await authorizeCommerceRequest(request,{requiredModule:"pos.checkout",requiredPermission:"pos.checkout"});
 const order=await repo.findByOrderNumber(code);
 if(!order||order.contextTenantId!==auth.tenantId||!order.locationId||
  order.notes!=="WAITING_ROOM_PAY_AT_REGISTER")throw new ValidationError("Código no corresponde a una orden pendiente de esta barbería");
 auth.assertLocationAccess(order.locationId);
 return {auth,order};
}
export async function GET(request:NextRequest){
 try{
  const parsed=codeSchema.safeParse(request.nextUrl.searchParams.get("code"));
  if(!parsed.success)throw new ValidationError("Código de sala de espera inválido");
  const {order}=await authorizedOrder(request,parsed.data);
  return NextResponse.json({data:{
   code:order.orderNumber,status:order.status,totalMinor:order.grandTotalMinor.toString(),
   customer:order.customerNameSnapshot,items:order.items.map(x=>({description:x.descriptionSnapshot,quantity:x.quantity})),
  }},{headers:{"Cache-Control":"no-store"}});
 }catch(error){if(error instanceof AppError)return NextResponse.json({error:error.message},{status:error.statusCode});
  return NextResponse.json({error:"No se pudo consultar el pedido"},{status:500});}
}
export async function POST(request:NextRequest){
 try{
  const parsed=paySchema.safeParse(await request.json());
  if(!parsed.success)throw new ValidationError("Importe o código inválidos");
  const {auth,order}=await authorizedOrder(request,parsed.data.code);
  const rate=await checkRateLimit("pos.checkout",auth.tenantId+":"+auth.userId);
  if(!rate.allowed&&rate.response)return rate.response;
  if(order.status==="COMPLETED")return NextResponse.json({data:{
   code:order.orderNumber,status:order.status,totalMinor:order.grandTotalMinor.toString(),alreadyPaid:true,
  }},{headers:{"Cache-Control":"no-store"}});
  if(order.status!=="DRAFT")throw new ForbiddenError("Esta orden no está pendiente de pago");
  const received=BigInt(parsed.data.amountReceivedMinor);
  if(received<order.grandTotalMinor)throw new ValidationError("Efectivo recibido insuficiente");
  const result=await new CompleteOrderUseCase(repo,new DrizzleInventoryRepository(),new DrizzleFinanceRepository())
   .execute({orderId:order.id,idempotencyKey:order.id,actorUserId:auth.userId,
    tenders:[{method:"CASH",amountMinor:order.grandTotalMinor,amountReceivedMinor:received}]});
  return NextResponse.json({data:{code:result.orderNumber,status:result.status,
   totalMinor:result.grandTotalMinor.toString(),changeMinor:(received-result.grandTotalMinor).toString(),
  }},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  if(error instanceof AppError)return NextResponse.json({error:error.message},{status:error.statusCode});
  return NextResponse.json({error:"No se pudo registrar el cobro; verifica la orden antes de reintentar"},{status:500});
 }
}
