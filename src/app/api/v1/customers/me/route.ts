import {NextRequest} from "next/server";
import {eq,desc,inArray} from "drizzle-orm";
import {db} from "@/infrastructure/database/client";
import {users} from "@/infrastructure/database/schema/users";
import {appointments,appointmentServices} from "@/infrastructure/database/schema/appointments";
import {tenants} from "@/infrastructure/database/schema/tenants";
import {locations} from "@/infrastructure/database/schema/locations";
import {staffProfiles} from "@/infrastructure/database/schema/staff";
import {customerRelationships} from "@/infrastructure/database/schema/professionals";
import {requireCustomerSession,customerResponse,customerError} from "@/modules/customers/application/customer-portal-auth";

export async function GET(request:NextRequest) {
 try {
  const session=await requireCustomerSession(request);
  const [[user],rows,relationships]=await Promise.all([
   db.select({id:users.id,name:users.name,email:users.email}).from(users).where(eq(users.id,session.userId)).limit(1),
   db.select({id:appointments.id,tenantId:appointments.tenantId,tenantName:tenants.name,
    locationId:locations.id,locationName:locations.name,staffName:staffProfiles.displayName,
    status:appointments.status,startsAt:appointments.startsAt,endsAt:appointments.endsAt,
    timezone:appointments.timezone})
    .from(appointments).innerJoin(tenants,eq(appointments.tenantId,tenants.id))
    .innerJoin(locations,eq(appointments.locationId,locations.id))
    .innerJoin(staffProfiles,eq(appointments.staffId,staffProfiles.id))
    .where(eq(appointments.customerUserId,session.userId))
    .orderBy(desc(appointments.startsAt)).limit(100),
   db.select({tenantId:customerRelationships.tenantId,tenantName:tenants.name,
    status:customerRelationships.status,firstSeenAt:customerRelationships.firstSeenAt})
    .from(customerRelationships)
    .innerJoin(tenants,eq(customerRelationships.tenantId,tenants.id))
    .where(eq(customerRelationships.customerUserId,session.userId)),
  ]);
  if(!user)return customerResponse({error:"Cuenta no encontrada"},404);
  const appointmentIds=rows.map(x=>x.id);
  const serviceRows=appointmentIds.length?
   await db.select({appointmentId:appointmentServices.appointmentId,
    name:appointmentServices.serviceNameSnapshot,priceMinor:appointmentServices.priceMinor})
    .from(appointmentServices)
    .where(inArray(appointmentServices.appointmentId,appointmentIds)) : [];
  return customerResponse({data:{
   user,relationships,
   appointments:rows.map(row=>({...row,
    services:serviceRows.filter(x=>x.appointmentId===row.id).map(x=>({name:x.name,priceMinor:x.priceMinor}))
   }))
  }});
 }catch(err){return customerError(err);}
}
