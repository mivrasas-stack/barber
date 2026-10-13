import {NextRequest} from "next/server";
import {and,eq,desc,inArray} from "drizzle-orm";
import {z} from "zod";
import {db} from "@/infrastructure/database/client";
import {customerReviews} from "@/infrastructure/database/schema/customer-experience";
import {appointments} from "@/infrastructure/database/schema/appointments";
import {tenants} from "@/infrastructure/database/schema/tenants";
import {staffProfiles} from "@/infrastructure/database/schema/staff";
import {requireCustomerSession,customerResponse,customerError} from "@/modules/customers/application/customer-portal-auth";
import {ValidationError,ForbiddenError} from "@/shared/errors/app-error";
const schema=z.object({
 appointmentId:z.string().uuid(),targetType:z.enum(["TENANT","STAFF"]),
 rating:z.number().int().min(1).max(5),comment:z.string().trim().min(10).max(1200),
}).strict();
export async function GET(request:NextRequest){
 try{
  const session=await requireCustomerSession(request);
  const myCompleted=await db.select({id:appointments.id,tenantId:appointments.tenantId,
   staffId:appointments.staffId,startsAt:appointments.startsAt})
   .from(appointments).where(and(eq(appointments.customerUserId,session.userId),
    eq(appointments.status,"COMPLETED"))).orderBy(desc(appointments.startsAt)).limit(100);
  const reviewableTenants=[...new Set(myCompleted.map(x=>x.tenantId))];
  const reviews=reviewableTenants.length?await db.select({
   id:customerReviews.id,tenantId:customerReviews.tenantId,
   tenantName:tenants.name,userId:customerReviews.userId,
   rating:customerReviews.rating,comment:customerReviews.comment,
   targetType:customerReviews.targetType,targetId:customerReviews.targetId,
   appointmentId:customerReviews.appointmentId,createdAt:customerReviews.createdAt,
  }).from(customerReviews).innerJoin(tenants,eq(tenants.id,customerReviews.tenantId))
   .where(and(inArray(customerReviews.tenantId,reviewableTenants),eq(customerReviews.status,"PUBLISHED")))
   .orderBy(desc(customerReviews.createdAt)).limit(100):[];
  const own=await db.select({appointmentId:customerReviews.appointmentId,targetType:customerReviews.targetType})
    .from(customerReviews).where(eq(customerReviews.userId,session.userId)).limit(250);
  const staffIds=[...new Set(reviews.filter(x=>x.targetType==="STAFF").map(x=>x.targetId))];
  const staff=staffIds.length?await db.select({id:staffProfiles.id,name:staffProfiles.displayName})
    .from(staffProfiles).where(inArray(staffProfiles.id,staffIds)):[];
  const byId=new Map(staff.map(x=>[x.id,x.name]));
  return customerResponse({data:{completedAppointments:myCompleted,
   submitted:own,reviews:reviews.map(x=>({...x,targetName:x.targetType==="STAFF"?
    byId.get(x.targetId)||"Barbero":x.tenantName,author:x.userId===session.userId?"Tú":"Cliente verificado",
    userId:undefined}))}});
 }catch(e){return customerError(e);}
}
export async function POST(request:NextRequest){
 try{
  const session=await requireCustomerSession(request);
  const parsed=schema.safeParse(await request.json());
  if(!parsed.success)throw new ValidationError("Calificación o comentario inválidos");
  const input=parsed.data;
  const [appt]=await db.select().from(appointments)
   .where(and(eq(appointments.id,input.appointmentId),eq(appointments.customerUserId,session.userId),
    eq(appointments.status,"COMPLETED"))).limit(1);
  if(!appt)throw new ForbiddenError("Solo puedes calificar cortes completados de tu cuenta");
  const targetId=input.targetType==="TENANT"?appt.tenantId:appt.staffId;
  const inserted=await db.insert(customerReviews).values({
   userId:session.userId,tenantId:appt.tenantId,appointmentId:appt.id,
   targetType:input.targetType,targetId,rating:input.rating,comment:input.comment,
  }).onConflictDoNothing({target:[customerReviews.appointmentId,customerReviews.targetType]}).returning({id:customerReviews.id});
  if(inserted.length===0)return customerResponse({error:"Esta visita ya tiene una reseña de ese tipo"},409);
  return customerResponse({data:{id:inserted[0].id,status:"PUBLISHED"}},201);
 }catch(e){return customerError(e);}
}
