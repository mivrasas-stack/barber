import {NextRequest} from "next/server";
import {z} from "zod";
import {and,eq} from "drizzle-orm";
import {db} from "@/infrastructure/database/client";
import {customerRelationships} from "@/infrastructure/database/schema/professionals";
import {requireCustomerSession,customerResponse,customerError} from "@/modules/customers/application/customer-portal-auth";
import {listCustomerBookingOptions} from "@/modules/customers/application/booking-catalog";
import {DrizzleAppointmentRepository} from "@/modules/appointments/infrastructure/drizzle-appointment.repository";
import {DrizzleIdempotencyRepository} from "@/modules/appointments/infrastructure/drizzle-idempotency.repository";
import {DrizzleServiceRepository} from "@/modules/catalog/infrastructure/drizzle-service.repository";
import {DrizzleStaffRepository} from "@/modules/staff/infrastructure/drizzle-staff.repository";
import {DrizzleModuleRepository} from "@/modules/modules/infrastructure/drizzle-module.repository";
import {DrizzleSubscriptionRepository} from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import {ModuleEntitlementResolver} from "@/modules/modules/application/module-entitlement-resolver";
import {CreateAppointmentUseCase} from "@/modules/appointments/application/create-appointment.usecase";
import {checkRateLimit} from "@/infrastructure/security";
import {ValidationError,ForbiddenError} from "@/shared/errors/app-error";

const schema=z.object({
 tenantId:z.string().uuid(),locationId:z.string().uuid(),
 staffId:z.string().uuid(),serviceId:z.string().uuid(),
 startsAt:z.string().datetime({offset:true}),
 idempotencyKey:z.string().uuid(),
}).strict();

/** Customer-only booking: the authenticated identity and service price are never client-provided. */
export async function POST(request:NextRequest) {
 try{
  const session=await requireCustomerSession(request);
  const parsed=schema.safeParse(await request.json());
  if(!parsed.success)throw new ValidationError("Datos de reserva inválidos");
  const input=parsed.data;
  const when=new Date(input.startsAt);
  const diff=when.getTime()-Date.now();
  if(diff<60*60*1000||diff>60*24*60*60*1000){
   throw new ValidationError("Reserva con al menos una hora y máximo 60 días de anticipación");
  }
  const options=await listCustomerBookingOptions();
  const match=options.find(o=>o.tenantId===input.tenantId&&o.locationId===input.locationId&&
   o.staffId===input.staffId&&o.serviceId===input.serviceId);
  if(!match)throw new ForbiddenError("El servicio o profesional no está disponible en esa barbería");
  const limited=await checkRateLimit("appointment.create",input.tenantId+":user_"+session.userId);
  if(!limited.allowed&&limited.response)return limited.response;
  const resolver=new ModuleEntitlementResolver(new DrizzleModuleRepository(),new DrizzleSubscriptionRepository());
  const creation=await new CreateAppointmentUseCase(
   new DrizzleAppointmentRepository(),new DrizzleIdempotencyRepository(),
   new DrizzleServiceRepository(),new DrizzleStaffRepository(),
   undefined,undefined,resolver,
  ).execute({
   tenantId:input.tenantId,locationId:input.locationId,staffId:input.staffId,
   serviceIds:[input.serviceId],startsAt:when,timezone:match.timezone,
   customerName:session.name,customerEmail:session.email,
   customerUserId:session.userId,actorUserId:session.userId,
   source:"ONLINE",idempotencyKey:input.idempotencyKey,
  });
  await db.insert(customerRelationships).values({
   tenantId:input.tenantId,customerUserId:session.userId,lastSeenAt:new Date()
  }).onConflictDoUpdate({
   target:[customerRelationships.tenantId,customerRelationships.customerUserId],
   set:{lastSeenAt:new Date(),updatedAt:new Date()},
  });
  const appointment=creation.appointment.appointment;
  return customerResponse({data:{
   id:appointment.id,tenantId:appointment.tenantId,status:appointment.status,
   startsAt:appointment.startsAt,endsAt:appointment.endsAt,
  },isIdempotentReplay:Boolean(creation.isIdempotentReplay)},creation.isIdempotentReplay?200:201);
 }catch(e){return customerError(e);}
}
