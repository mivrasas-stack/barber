import {beforeAll,describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {NextRequest} from "next/server";
import {and,eq} from "drizzle-orm";
import {db} from "@/infrastructure/database/client";
import {users} from "@/infrastructure/database/schema/users";
import {tenants} from "@/infrastructure/database/schema/tenants";
import {locations} from "@/infrastructure/database/schema/locations";
import {services,locationServices} from "@/infrastructure/database/schema/services";
import {staffProfiles,staffLocations,staffServices} from "@/infrastructure/database/schema/staff";
import {memberships} from "@/infrastructure/database/schema/memberships";
import {tenantSubscriptions,subscriptionPlans} from "@/infrastructure/database/schema/subscriptions";
import {appointments} from "@/infrastructure/database/schema/appointments";
import {customerRelationships} from "@/infrastructure/database/schema/professionals";
import {SESSION_COOKIE_NAME,createSession} from "@/infrastructure/auth/session";
import {GET as getPortal} from "@/app/api/v1/customers/me/route";
import {GET as getOptions} from "@/app/api/v1/customers/booking-options/route";
import {POST as createBooking} from "@/app/api/v1/customers/me/appointments/route";
import {GET as getDetail} from "@/app/api/v1/appointments/[id]/route";
import {middleware} from "@/middleware";

let customerA:string,customerB:string,tenantId:string,locationId:string,staffId:string,serviceId:string;
const suffix=randomUUID().slice(0,10);
const api=(url:string,method="GET",body?:object,cookie?:string)=>new NextRequest("http://localhost:9002"+url,{
 method,headers:{"Content-Type":"application/json",...(cookie?{cookie}:{} )},
 ...(body?{body:JSON.stringify(body)}:{}),
});
async function session(user:typeof users.$inferSelect) {
 return SESSION_COOKIE_NAME+"="+(await createSession({
  id:user.id,email:user.email,name:user.name,isPlatformAdmin:false
 })).token;
}
describe("Official /customers portal backed by PostgreSQL",()=>{
 beforeAll(async()=>{
  if(process.env.NODE_ENV==="production")throw Error("QA cannot run on production");
  const [plan]=await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code,"BUSINESS_BASIC")).limit(1);
  if(!plan)throw Error("Seeded BUSINESS_BASIC plan missing");
  const [tenant]=await db.insert(tenants).values({
   slug:"customer-portal-qa-"+suffix,name:"Customer Booking QA "+suffix,status:"ACTIVE",tenantType:"BUSINESS",
  }).returning();
  tenantId=tenant.id;
  const [location]=await db.insert(locations).values({
   tenantId,name:"Sede principal QA",slug:"principal",status:"ACTIVE",timezone:"America/Bogota",
  }).returning();
  locationId=location.id;
  const [staffUser,clientA,clientB]=await db.insert(users).values([
   {name:"QA Real Barber",email:"qa-staff-"+suffix+"@example.test",emailNormalized:"qa-staff-"+suffix+"@example.test",passwordHash:"qa"},
   {name:"QA Client A",email:"qa-client-a-"+suffix+"@example.test",emailNormalized:"qa-client-a-"+suffix+"@example.test",passwordHash:"qa"},
   {name:"QA Client B",email:"qa-client-b-"+suffix+"@example.test",emailNormalized:"qa-client-b-"+suffix+"@example.test",passwordHash:"qa"},
  ]).returning();
  customerA=await session(clientA);customerB=await session(clientB);
  const [member]=await db.insert(memberships).values({
   tenantId,userId:staffUser.id,status:"ACTIVE",
  }).returning();
  const [staff]=await db.insert(staffProfiles).values({
   tenantId,membershipId:member.id,displayName:"QA Real Barber",status:"ACTIVE",
  }).returning();
  staffId=staff.id;
  const [service]=await db.insert(services).values({
   tenantId,name:"Corte QA REAL",slug:"qa-real-"+suffix,
   status:"ACTIVE",durationMinutes:30,priceMinor:3500000,currency:"COP",
  }).returning();
  serviceId=service.id;
  await db.insert(staffLocations).values({staffId,locationId,status:"ACTIVE"});
  await db.insert(staffServices).values({staffId,serviceId,isActive:true});
  await db.insert(locationServices).values({locationId,serviceId,isActive:true});
  const now=new Date();
  await db.insert(tenantSubscriptions).values({
   tenantId,planId:plan.id,status:"ACTIVE",startsAt:now,
   currentPeriodStart:now,currentPeriodEnd:new Date(now.getTime()+90*86400000),
  });
 });
 it("requires authentication for all customer portal resources",async()=>{
  expect((await getPortal(api("/api/v1/customers/me"))).status).toBe(401);
  expect((await getOptions(api("/api/v1/customers/booking-options"))).status).toBe(401);
  const bad=await createBooking(api("/api/v1/customers/me/appointments","POST",{}));
  expect(bad.status).toBe(401);
  const site=await middleware(api("/customers/appointments"));
  expect(site.status).toBe(307);
  expect(new URL(site.headers.get("location")||"http://invalid").pathname).toBe("/login");
 });
 it("publishes genuinely configured, entitled options with no fake services",async()=>{
  const response=await getOptions(api("/api/v1/customers/booking-options","GET",undefined,customerA));
  expect(response.status).toBe(200);
  const data=(await response.json()).data;
  const selected=data.find((x:{tenantId:string;staffId:string;serviceId:string})=>
   x.tenantId===tenantId&&x.staffId===staffId&&x.serviceId===serviceId);
  expect(selected).toMatchObject({tenantId,locationId,staffId,serviceId,serviceName:"Corte QA REAL",priceMinor:3500000});
 });
 it("creates a real booking, links its authenticated owner, and never reveals it to another customer",async()=>{
  const reqBody={
   tenantId,locationId,staffId,serviceId,
   startsAt:new Date(Date.now()+48*3600000).toISOString(),
   idempotencyKey:randomUUID(),
  };
  const created=await createBooking(api("/api/v1/customers/me/appointments","POST",reqBody,customerA));
  expect(created.status).toBe(201);
  const response=await created.json();
  const id=response.data.id as string;
  expect(response.data.status).toBe("CONFIRMED");
  const [dbRow]=await db.select().from(appointments).where(eq(appointments.id,id));
  expect(dbRow.customerUserId).not.toBeNull();
  expect(dbRow.customerNameSnapshot).toBe("QA Client A");
  expect(dbRow.tenantId).toBe(tenantId);
  const own=await getPortal(api("/api/v1/customers/me","GET",undefined,customerA));
  const ownBody=(await own.json()).data;
  expect(ownBody.user.email).toContain("qa-client-a-");
  expect(ownBody.appointments.find((a:{id:string})=>a.id===id).services[0].name).toBe("Corte QA REAL");
  const other=await getPortal(api("/api/v1/customers/me","GET",undefined,customerB));
  expect((await other.json()).data.appointments.some((a:{id:string})=>a.id===id)).toBe(false);
  const ownerDetail=await getDetail(api("/api/v1/appointments/"+id,"GET",undefined,customerA),{params:Promise.resolve({id})});
  expect(ownerDetail.status).toBe(200);
  const otherDetail=await getDetail(api("/api/v1/appointments/"+id,"GET",undefined,customerB),{params:Promise.resolve({id})});
  expect(otherDetail.status).toBe(404);
  const anonymousDetail=await getDetail(api("/api/v1/appointments/"+id),{params:Promise.resolve({id})});
  expect(anonymousDetail.status).toBe(401);
  const relation=await db.select().from(customerRelationships)
   .where(and(eq(customerRelationships.tenantId,tenantId),eq(customerRelationships.customerUserId,dbRow.customerUserId!)));
  expect(relation).toHaveLength(1);
  const replay=await createBooking(api("/api/v1/customers/me/appointments","POST",reqBody,customerA));
  expect(replay.status).toBe(200);
  expect((await replay.json()).isIdempotentReplay).toBe(true);
 });
 it("rejects forged identity, unrelated staff, and stale dates",async()=>{
  const input={tenantId,locationId,staffId,serviceId,startsAt:new Date(Date.now()+48*3600000).toISOString(),idempotencyKey:randomUUID()};
  expect((await createBooking(api("/api/v1/customers/me/appointments","POST",
   {...input,customerUserId:randomUUID()},customerA))).status).toBe(400);
  expect((await createBooking(api("/api/v1/customers/me/appointments","POST",
   {...input,staffId:randomUUID()},customerA))).status).toBe(403);
  expect((await createBooking(api("/api/v1/customers/me/appointments","POST",
   {...input,startsAt:new Date().toISOString()},customerA))).status).toBe(400);
 });
});
