import { and,eq } from "drizzle-orm";
import {db} from "@/infrastructure/database/client";
import {tenants} from "@/infrastructure/database/schema/tenants";
import {locations} from "@/infrastructure/database/schema/locations";
import {services,locationServices} from "@/infrastructure/database/schema/services";
import {staffProfiles,staffLocations,staffServices} from "@/infrastructure/database/schema/staff";
import {memberships} from "@/infrastructure/database/schema/memberships";
import {users} from "@/infrastructure/database/schema/users";
import {ModuleEntitlementResolver} from "@/modules/modules/application/module-entitlement-resolver";
import {DrizzleModuleRepository} from "@/modules/modules/infrastructure/drizzle-module.repository";
import {DrizzleSubscriptionRepository} from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";

export interface CustomerBookingOption {
 tenantId:string;tenantName:string;locationId:string;locationName:string;
 staffId:string;staffName:string;serviceId:string;serviceName:string;
 durationMinutes:number;priceMinor:number;currency:string;timezone:string;
}
/** Only publish genuinely configured active location × professional × service combinations. */
export async function listCustomerBookingOptions():Promise<CustomerBookingOption[]> {
 const rows=await db.select({
  tenantId:tenants.id,tenantName:tenants.name,
  locationId:locations.id,locationName:locations.name,timezone:locations.timezone,
  staffId:staffProfiles.id,staffName:staffProfiles.displayName,
  serviceId:services.id,serviceName:services.name,
  durationMinutes:services.durationMinutes,priceMinor:services.priceMinor,currency:services.currency,
 }).from(staffServices)
 .innerJoin(staffProfiles,eq(staffServices.staffId,staffProfiles.id))
 .innerJoin(memberships,eq(staffProfiles.membershipId,memberships.id))
 .innerJoin(users,eq(memberships.userId,users.id))
 .innerJoin(staffLocations,and(eq(staffLocations.staffId,staffProfiles.id),eq(staffLocations.status,"ACTIVE")))
 .innerJoin(locations,and(eq(staffLocations.locationId,locations.id),eq(locations.status,"ACTIVE")))
 .innerJoin(tenants,and(eq(tenants.id,locations.tenantId),eq(tenants.status,"ACTIVE"),eq(tenants.tenantType,"BUSINESS")))
 .innerJoin(services,and(eq(staffServices.serviceId,services.id),eq(services.tenantId,tenants.id),eq(services.status,"ACTIVE")))
 .innerJoin(locationServices,and(eq(locationServices.locationId,locations.id),
   eq(locationServices.serviceId,services.id),eq(locationServices.isActive,true)))
 .where(and(eq(staffServices.isActive,true),eq(staffProfiles.status,"ACTIVE"),
   eq(staffProfiles.tenantId,tenants.id),eq(memberships.status,"ACTIVE"),eq(users.status,"ACTIVE")))
 .limit(300);
 const resolver=new ModuleEntitlementResolver(new DrizzleModuleRepository(),new DrizzleSubscriptionRepository());
 const ids=[...new Set(rows.map(x=>x.tenantId))];
 const enabled=new Set((await Promise.all(ids.map(async id=>({
  id,ok:await resolver.isModuleEnabled(id,"scheduling.appointments"),
 })))).filter(x=>x.ok).map(x=>x.id));
 return rows.filter(row=>enabled.has(row.tenantId));
}
