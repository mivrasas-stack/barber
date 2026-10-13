import {beforeAll,describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {and,eq} from "drizzle-orm";
import {NextRequest} from "next/server";
import {db} from "@/infrastructure/database/client";
import {users} from "@/infrastructure/database/schema/users";
import {tenants} from "@/infrastructure/database/schema/tenants";
import {locations} from "@/infrastructure/database/schema/locations";
import {memberships} from "@/infrastructure/database/schema/memberships";
import {membershipRoles,roles} from "@/infrastructure/database/schema/roles";
import {subscriptionPlans,tenantSubscriptions} from "@/infrastructure/database/schema/subscriptions";
import {staffProfiles} from "@/infrastructure/database/schema/staff";
import {services} from "@/infrastructure/database/schema/services";
import {appointments,appointmentServices} from "@/infrastructure/database/schema/appointments";
import {customerRelationships} from "@/infrastructure/database/schema/professionals";
import {productCategories,products,productVariants,inventoryPositions,orders,stockMovements} from "@/infrastructure/database/schema/commerce";
import {journalEntries} from "@/infrastructure/database/schema/finance";
import {customerFavorites,customerReviews} from "@/infrastructure/database/schema/customer-experience";
import {createSession,SESSION_COOKIE_NAME} from "@/infrastructure/auth/session";
import {getCustomerLoyalty,loyaltyFromCompletedCuts} from "@/modules/customers/application/loyalty";
import {GET as getLoyalty} from "@/app/api/v1/customers/me/loyalty/route";
import {GET as getProducts} from "@/app/api/v1/customers/me/products/route";
import {GET as getFavorites,POST as addFavorite,DELETE as removeFavorite} from "@/app/api/v1/customers/me/favorites/route";
import {GET as getReviews,POST as addReview} from "@/app/api/v1/customers/me/reviews/route";
import {GET as getWaiting,POST as orderWaiting} from "@/app/api/v1/customers/me/waiting-orders/route";
import {GET as lookupCash,POST as payCash} from "@/app/api/v1/pos/waiting-orders/route";
import {DrizzleFinanceRepository} from "@/modules/finance/infrastructure/drizzle-finance.repository";

const path="/api/v1/customers/me/";
const api=(method:string,url:string,body?:object,cookie?:string)=>new NextRequest("http://localhost:9002"+url,{
 method,headers:{"Content-Type":"application/json",...(cookie?{cookie}:{})},
 ...(body?{body:JSON.stringify(body)}:{}),
});
let clientId:string,tenantId:string,locationId:string,staffId:string,completedId:string,activeId:string;
let variantId:string,ownerCookie:string,clientCookie:string,otherCookie:string;
const suffix=randomUUID().slice(0,10);
let waitingCode:string;
describe("Premium customer modules /customers: verified PostgreSQL behavior",()=>{
 beforeAll(async()=>{
  if(process.env.NODE_ENV==="production")throw Error("Refusing to write fixtures in production");
  const [[plan],[role]]=await Promise.all([
   db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code,"BUSINESS_BASIC")).limit(1),
   db.select().from(roles).where(eq(roles.name,"OWNER")).limit(1),
  ]);
  if(!plan||!role)throw Error("Development seed for QA plan/roles missing");
  const [tenant]=await db.insert(tenants).values({
   slug:"exp-qa-"+suffix,name:"Experiencia QA "+suffix,tenantType:"BUSINESS",status:"ACTIVE",
  }).returning();tenantId=tenant.id;
  const [loc]=await db.insert(locations).values({
   tenantId,slug:"principal",name:"Local QA",status:"ACTIVE",timezone:"America/Bogota",
  }).returning();locationId=loc.id;
  const [owner,client,other]=await db.insert(users).values([
   {name:"QA Experience Owner",email:"qa-exp-owner-"+suffix+"@example.test",emailNormalized:"qa-exp-owner-"+suffix+"@example.test",passwordHash:"qa"},
   {name:"QA Experience Client",email:"qa-exp-client-"+suffix+"@example.test",emailNormalized:"qa-exp-client-"+suffix+"@example.test",passwordHash:"qa"},
   {name:"QA Experience Other",email:"qa-exp-other-"+suffix+"@example.test",emailNormalized:"qa-exp-other-"+suffix+"@example.test",passwordHash:"qa"},
  ]).returning();clientId=client.id;
  const [member]=await db.insert(memberships).values({tenantId,userId:owner.id,status:"ACTIVE"}).returning();
  await db.insert(membershipRoles).values({membershipId:member.id,roleId:role.id});
  const [staff]=await db.insert(staffProfiles).values({tenantId,membershipId:member.id,displayName:"QA Premium Barber",status:"ACTIVE"}).returning();staffId=staff.id;
  const [service]=await db.insert(services).values({tenantId,name:"Corte Premium QA",slug:"corte-"+suffix,status:"ACTIVE",durationMinutes:35,priceMinor:4500000,currency:"COP"}).returning();
  const past=new Date(Date.now()-4*86400000),start=new Date(Date.now()+30*60000);
  const [completed,active]=await db.insert(appointments).values([
   {tenantId,locationId,staffId,customerUserId:client.id,customerNameSnapshot:client.name,
    startsAt:past,endsAt:new Date(past.getTime()+35*60000),status:"COMPLETED",completedAt:new Date(past.getTime()+35*60000),source:"ONLINE"},
   {tenantId,locationId,staffId,customerUserId:client.id,customerNameSnapshot:client.name,
    startsAt:start,endsAt:new Date(start.getTime()+35*60000),status:"CONFIRMED",source:"ONLINE"},
  ]).returning();completedId=completed.id;activeId=active.id;
  await db.insert(appointmentServices).values({appointmentId:completed.id,serviceId:service.id,
   serviceNameSnapshot:service.name,durationMinutes:35,priceMinor:4500000,currency:"COP"});
  await db.insert(customerRelationships).values({tenantId,customerUserId:client.id,status:"ACTIVE"});
  const [category]=await db.insert(productCategories).values({tenantId,name:"Bebidas",slug:"bebidas"}).returning();
  const [product]=await db.insert(products).values({
   ownerTenantId:tenantId,categoryId:category.id,name:"Bebida QA",slug:"bebida-"+suffix,status:"ACTIVE",trackInventory:true,
  }).returning();
  const [variant]=await db.insert(productVariants).values({
   productId:product.id,sku:"QA-EXPERIENCE-"+suffix,name:"500 ml",priceMinor:490000n,status:"ACTIVE",currency:"COP",
  }).returning();variantId=variant.id;
  await db.insert(inventoryPositions).values({ownerTenantId:tenantId,locationId,productVariantId:variantId,onHand:8,reserved:0});
  const now=new Date();
  await db.insert(tenantSubscriptions).values({tenantId,planId:plan.id,status:"ACTIVE",startsAt:now,
   currentPeriodStart:now,currentPeriodEnd:new Date(now.getTime()+90*86400000)});
  await new DrizzleFinanceRepository().getOrCreateDefaultAccounts(tenantId,"COP");
  const cookies=await Promise.all([owner,client,other].map(async user=>
   SESSION_COOKIE_NAME+"="+(await createSession({id:user.id,email:user.email,name:user.name,isPlatformAdmin:false})).token));
  ownerCookie=cookies[0]+"; barber_active_workspace="+tenantId;
  clientCookie=cookies[1];otherCookie=cookies[2];
 });
 it("real loyalty awards only completed cuts and no fake VIP badges",async()=>{
  expect(loyaltyFromCompletedCuts(0)).toMatchObject({points:0,cuts:0});
  const response=await getLoyalty(api("GET",path+"loyalty",undefined,clientCookie));
  expect(response.status).toBe(200);
  const data=(await response.json()).data;
  expect(data.cuts).toBe(1);expect(data.points).toBe(100);
  expect(data.badges.find((b:{name:string})=>b.name==="Primer corte").unlocked).toBe(true);
  expect(data.badges.filter((b:{unlocked:boolean})=>b.unlocked)).toHaveLength(1);
  const other=await getLoyalty(api("GET",path+"loyalty",undefined,otherCookie));
  expect((await other.json()).data.points).toBe(0);
 });
 it("boutique/waiting product catalog uses tenant link, server price, and exact stock",async()=>{
  const result=await getProducts(api("GET",path+"products?waiting=true",undefined,clientCookie));
  expect(result.status).toBe(200);
  const products=(await result.json()).data;
  const found=products.find((p:{variantId:string})=>p.variantId===variantId);
  expect(found).toMatchObject({tenantId,locationId,productName:"Bebida QA",priceMinor:"490000",available:true,availableUnits:8});
  const other=await getProducts(api("GET",path+"products",undefined,otherCookie));
  expect((await other.json()).data.some((p:{variantId:string})=>p.variantId===variantId)).toBe(false);
 });
 it("favorites persist per customer and reject forge across barberies/staff",async()=>{
  expect((await getFavorites(api("GET",path+"favorites",undefined,otherCookie))).status).toBe(200);
  expect((await addFavorite(api("POST",path+"favorites",{tenantId,targetType:"TENANT",targetId:tenantId},clientCookie))).status).toBe(201);
  expect((await addFavorite(api("POST",path+"favorites",{tenantId,targetType:"STAFF",targetId:staffId},clientCookie))).status).toBe(201);
  expect((await addFavorite(api("POST",path+"favorites",{tenantId,targetType:"STAFF",targetId:randomUUID()},clientCookie))).status).toBe(400);
  expect((await addFavorite(api("POST",path+"favorites",{tenantId,targetType:"TENANT",targetId:tenantId},otherCookie))).status).toBe(403);
  const mine=await getFavorites(api("GET",path+"favorites",undefined,clientCookie));
  expect((await mine.json()).data).toHaveLength(2);
  const count=await db.select().from(customerFavorites).where(eq(customerFavorites.userId,clientId));
  expect(count).toHaveLength(2);
  expect((await removeFavorite(api("DELETE",path+"favorites",{tenantId,targetType:"STAFF",targetId:staffId},clientCookie))).status).toBe(200);
 });
 it("reviews require actual completed appointment; one per target; tenant isolation",async()=>{
  const body={appointmentId:completedId,targetType:"STAFF",rating:5,comment:"Excelente servicio y atención de mi barbero"};
  expect((await addReview(api("POST",path+"reviews",body,otherCookie))).status).toBe(403);
  expect((await addReview(api("POST",path+"reviews",{...body,appointmentId:activeId},clientCookie))).status).toBe(403);
  expect((await addReview(api("POST",path+"reviews",{...body,rating:8},clientCookie))).status).toBe(400);
  const created=await addReview(api("POST",path+"reviews",body,clientCookie));
  expect(created.status).toBe(201);
  expect((await addReview(api("POST",path+"reviews",body,clientCookie))).status).toBe(409);
  const mine=await getReviews(api("GET",path+"reviews",undefined,clientCookie));
  const data=(await mine.json()).data;
  expect(data.reviews.some((r:{comment:string})=>r.comment===body.comment)).toBe(true);
  const other=await getReviews(api("GET",path+"reviews",undefined,otherCookie));
  expect((await other.json()).data.reviews.some((r:{comment:string})=>r.comment===body.comment)).toBe(false);
 });
 it("waiting room order is real unpaid DRAFT; cashier validates code and cash; stock and journal post only once",async()=>{
  const requestId=randomUUID();
  const body={appointmentId:activeId,requestId,items:[{variantId,quantity:1}]};
  expect((await orderWaiting(api("POST",path+"waiting-orders",body,otherCookie))).status).toBe(403);
  const response=await orderWaiting(api("POST",path+"waiting-orders",body,clientCookie));
  expect(response.status).toBe(201);
  const created=(await response.json()).data;
  waitingCode=created.code;
  expect(created.status).toBe("DRAFT");expect(created.totalMinor).toBe("490000");
  const stored=await db.select().from(orders).where(eq(orders.orderNumber,waitingCode));
  expect(stored).toHaveLength(1);
  expect(stored[0].customerUserId).toBe(clientId);
  expect((await orderWaiting(api("POST",path+"waiting-orders",body,clientCookie))).status).toBe(200);
  expect((await lookupCash(api("GET","/api/v1/pos/waiting-orders?code="+waitingCode,undefined,clientCookie))).status).toBe(403);
  const query=await lookupCash(api("GET","/api/v1/pos/waiting-orders?code="+waitingCode,undefined,ownerCookie));
  expect(query.status).toBe(200);
  expect((await query.json()).data.totalMinor).toBe("490000");
  const tooLow=await payCash(api("POST","/api/v1/pos/waiting-orders",{code:waitingCode,amountReceivedMinor:"1"},ownerCookie));
  expect(tooLow.status).toBe(400);
  const [notPaid]=await db.select().from(orders).where(eq(orders.orderNumber,waitingCode));
  expect(notPaid.status).toBe("DRAFT");
  const paid=await payCash(api("POST","/api/v1/pos/waiting-orders",{code:waitingCode,amountReceivedMinor:"500000"},ownerCookie));
  if(paid.status!==200)console.log("WAITING_QA_PAYMENT_FAILURE",await paid.clone().json());
  expect(paid.status).toBe(200);
  expect((await paid.json()).data.status).toBe("COMPLETED");
  const positions=await db.select().from(inventoryPositions).where(and(eq(inventoryPositions.productVariantId,variantId),eq(inventoryPositions.locationId,locationId)));
  expect(positions[0].onHand).toBe(7);
  const movements=await db.select().from(stockMovements).where(and(eq(stockMovements.sourceType,"ORDER"),eq(stockMovements.sourceId,stored[0].id)));
  expect(movements).toHaveLength(1);
  const journal=await db.select().from(journalEntries).where(and(eq(journalEntries.sourceType,"ORDER"),eq(journalEntries.sourceId,stored[0].id)));
  expect(journal).toHaveLength(1);
  const replay=await payCash(api("POST","/api/v1/pos/waiting-orders",{code:waitingCode,amountReceivedMinor:"500000"},ownerCookie));
  expect((await replay.json()).data.status).toBe("COMPLETED");
  const otherOrders=await getWaiting(api("GET",path+"waiting-orders",undefined,otherCookie));
  expect((await otherOrders.json()).data.some((o:{orderNumber:string})=>o.orderNumber===waitingCode)).toBe(false);
 });
});
