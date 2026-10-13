import {beforeAll,describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {eq,and} from "drizzle-orm";
import {NextRequest} from "next/server";
import {db} from "@/infrastructure/database/client";
import {users,tenants,locations,orders,stockMovements,inventoryPositions,journalEntries, memberships, membershipRoles, roles, subscriptionPlans, tenantSubscriptions} from "@/infrastructure/database/schema";
import {DrizzleFinanceRepository} from "@/modules/finance/infrastructure/drizzle-finance.repository";
import {SESSION_COOKIE_NAME,createSession} from "@/infrastructure/auth/session";
import {CreateProductUseCase} from "@/modules/commerce/application/create-product.usecase";
import {DrizzleProductRepository} from "@/modules/commerce/infrastructure/drizzle-product.repository";
import {ReceiveStockUseCase} from "@/modules/inventory/application/receive-stock.usecase";
import {DrizzleInventoryRepository} from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import {GET as getCatalog} from "@/app/api/v1/pos/catalog/route";
import {POST as postSale} from "@/app/api/v1/pos/sale/route";
let ownerCookie:string,tenantId:string,locationId:string,userId:string,variantId:string;
const req=(method:string,path:string,body?:object,cookie?:string)=>{
 return new NextRequest("http://localhost"+path,{method,headers:{"Content-Type":"application/json",
  ...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
};
const path="/api/v1/pos/sale";
const body=(key:string,quantity=1,received="3500000")=>({
 checkoutKey:key,locationId,amountReceivedMinor:received,
 items:[{type:"PRODUCT",id:variantId,quantity}],
 customerName:"QA Real POS",
});
describe("P0 real POS HTTP, stock, journal and idempotency",()=>{
 beforeAll(async()=>{
  if(process.env.NODE_ENV==="production")throw new Error("Never run QA financialization in production");
  const suffix=randomUUID().slice(0,11);
  // A dedicated, entitled QA workspace: never modify the seed barber's commercial subscription.
  const [plan]=await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code,"BUSINESS_BASIC")).limit(1);
  const [ownerRole]=await db.select().from(roles).where(eq(roles.name,"OWNER")).limit(1);
  if(!plan||!ownerRole)throw Error("Development plans/roles not seeded");
  const [tenant]=await db.insert(tenants).values({
    slug:"p0-pos-qa-"+suffix,name:"P0 POS QA workspace",tenantType:"BUSINESS",status:"ACTIVE"
  }).returning();
  const [loc]=await db.insert(locations).values({tenantId:tenant.id,slug:"principal",name:"P0 Test Register"}).returning();
  const email="p0-pos-qa-"+suffix+"@example.test";
  const [owner]=await db.insert(users).values({email,emailNormalized:email,name:"P0 POS Test Owner",passwordHash:"qa",status:"ACTIVE"}).returning();
  const [member]=await db.insert(memberships).values({tenantId:tenant.id,userId:owner.id,status:"ACTIVE"}).returning();
  await db.insert(membershipRoles).values({membershipId:member.id,roleId:ownerRole.id});
  const now=new Date();
  await db.insert(tenantSubscriptions).values({
    tenantId:tenant.id,planId:plan.id,status:"ACTIVE",startsAt:now,
    currentPeriodStart:now,currentPeriodEnd:new Date(now.getTime()+86400000),
  });
  await new DrizzleFinanceRepository().getOrCreateDefaultAccounts(tenant.id,"COP");
  tenantId=tenant.id;locationId=loc.id;userId=owner.id;
  ownerCookie=SESSION_COOKIE_NAME+"="+(await createSession({id:owner.id,email:owner.email,
   name:owner.name,isPlatformAdmin:false})).token+
   "; barber_active_workspace="+tenant.id;
  const prod=await new CreateProductUseCase(new DrizzleProductRepository()).execute({
   ownerTenantId:tenant.id,name:"P0 POS QA Pomade "+suffix,
   variants:[{sku:"P0-POS-"+suffix,name:"75ml",priceMinor:3500000n,costMinor:1100000n}],
  });
  variantId=prod.variants[0].id;
  await new ReceiveStockUseCase(new DrizzleInventoryRepository()).execute({
   ownerTenantId:tenant.id,locationId:loc.id,productVariantId:variantId,
   quantity:3,unitCostMinor:1100000n,actorUserId:owner.id,
  });
 });

 it("requires session and workspace, catalog offers real server prices",async()=>{
  expect((await getCatalog(req("GET","/api/v1/pos/catalog"))).status).toBe(401);
  expect((await postSale(req("POST",path,body(randomUUID())))).status).toBe(401);
  const catalog=await getCatalog(req("GET","/api/v1/pos/catalog",undefined,ownerCookie));
  if(catalog.status!==200) console.log("P0_CATALOG_AUTH_DIAGNOSTIC",JSON.stringify(await catalog.clone().json()));
  expect(catalog.status).toBe(200);
  const items=(await catalog.json()).data.items;
  const selected=items.find((x:{id:string})=>x.id===variantId);
  expect(selected.priceMinor).toBe("3500000");
  expect(selected.stock).toBe(3);
 });

 it("creates a completed paid sale exactly once, with ledger and stock movements",async()=>{
  const id=randomUUID(),sale=body(id);
  const first=await postSale(req("POST",path,sale,ownerCookie));
  expect(first.status).toBe(200);
  expect((await first.json()).data.status).toBe("COMPLETED");
  const replay=await postSale(req("POST",path,sale,ownerCookie));
  expect(replay.status).toBe(200);
  expect((await replay.json()).data.id).toBe(id);
  const [order]=await db.select().from(orders).where(eq(orders.id,id));
  expect(order.status).toBe("COMPLETED");
  expect(order.grandTotalMinor).toBe(3500000n);
  const movements=await db.select().from(stockMovements).where(and(eq(stockMovements.sourceType,"ORDER"),eq(stockMovements.sourceId,id)));
  expect(movements).toHaveLength(1);
  const positions=await db.select().from(inventoryPositions).where(and(eq(inventoryPositions.productVariantId,variantId),eq(inventoryPositions.locationId,locationId)));
  expect(positions[0].onHand).toBe(2);
  const journal=await db.select().from(journalEntries).where(and(eq(journalEntries.sourceType,"ORDER"),eq(journalEntries.sourceId,id)));
  expect(journal).toHaveLength(1);
  const tampered=await postSale(req("POST",path,body(id,1,"4000000"),ownerCookie));
  expect(tampered.status).toBe(409);
 });

 it("rejects client prices, wrong location, and insufficient cash",async()=>{
  const key=randomUUID();
  expect((await postSale(req("POST",path,{...body(key),items:[{...body(key).items[0],unitPriceMinor:"1"}]},ownerCookie))).status).toBe(400);
  expect((await postSale(req("POST",path,{...body(randomUUID()),locationId:randomUUID()},ownerCookie))).status).not.toBe(200);
  const tooLittle=await postSale(req("POST",path,body(randomUUID(),1,"100"),ownerCookie));
  expect(tooLittle.status).toBe(400);
 });
});
