import {beforeAll,describe,expect,it} from "vitest";
import {randomUUID,randomBytes} from "node:crypto";
import {eq,and} from "drizzle-orm";
import {NextRequest} from "next/server";
import {db} from "@/infrastructure/database/client";
import {tenants} from "@/infrastructure/database/schema/tenants";
import {users} from "@/infrastructure/database/schema/users";
import {memberships} from "@/infrastructure/database/schema/memberships";
import {roles,membershipRoles} from "@/infrastructure/database/schema/roles";
import {customerIntakes} from "@/infrastructure/database/schema/customer-intake";
import {customerRelationships} from "@/infrastructure/database/schema/professionals";
import {createSession,SESSION_COOKIE_NAME} from "@/infrastructure/auth/session";
import {signCustomerQr,validateCustomerQr} from "@/modules/customers/domain/signed-qr";
import {GET as getQr} from "@/app/api/v1/customers/qr/route";
import {GET as getIntakes,POST as postIntakes} from "@/app/api/v1/customers/intakes/route";

const suffix=()=>randomUUID().slice(0,8);
const makePhone=()=> "3"+(randomBytes(5).readUIntBE(0,5)%1000000000).toString().padStart(9,"0");
let aId:string,bId:string,ownerA:string,ownerB:string,clientId:string;
let cookieA:string,cookieB:string,cookieClient:string;
const api=(path:string, method="GET",data?:object,cookie?:string)=>
 new NextRequest("http://localhost"+path,{method,
  headers:{"Content-Type":"application/json",...(cookie?{cookie}:{} )},
  ...(data?{body:JSON.stringify(data)}:{})});
const context=(tenantId:string, cookie:string)=>cookie+"; barber_active_workspace="+tenantId;
const first=(tenantId:string)=>signCustomerQr(tenantId);
const payload=(tenantId:string,phone:string)=>({
 token:first(tenantId),name:"QA QR Customer",phone,email:"qa-qr@example.test",consent:true
});

describe("P0 QR signed per-tenant intake",()=>{
 beforeAll(async()=>{
  if(process.env.NODE_ENV==="production") throw new Error("Never execute in production");
  const s=suffix();
  const created=await db.insert(tenants).values([
   {slug:"p0-qr-a-"+s,name:"QA Barber A",tenantType:"BUSINESS"},
   {slug:"p0-qr-b-"+s,name:"QA Barber B",tenantType:"BUSINESS"},
  ]).returning();
  aId=created[0].id;bId=created[1].id;
  const [a,b,client]=await db.insert(users).values([
   {email:"p0-qr-owner-a-"+s+"@example.test",emailNormalized:"p0-qr-owner-a-"+s+"@example.test",name:"QA Owner A",passwordHash:"qa"},
   {email:"p0-qr-owner-b-"+s+"@example.test",emailNormalized:"p0-qr-owner-b-"+s+"@example.test",name:"QA Owner B",passwordHash:"qa"},
   {email:"p0-qr-client-"+s+"@example.test",emailNormalized:"p0-qr-client-"+s+"@example.test",name:"QA Verified Client",passwordHash:"qa"},
  ]).returning();
  ownerA=a.id;ownerB=b.id;clientId=client.id;
  const [role]=await db.select().from(roles).where(eq(roles.name,"OWNER")).limit(1);
  if(!role)throw Error("Seed OWNER role missing");
  const ms=await db.insert(memberships).values([{tenantId:aId,userId:a.id},{tenantId:bId,userId:b.id}]).returning();
  await db.insert(membershipRoles).values(ms.map(m=>({membershipId:m.id,roleId:role.id})));
  cookieA=SESSION_COOKIE_NAME+"="+(await createSession({id:a.id,email:a.email,name:a.name,isPlatformAdmin:false})).token;
  cookieB=SESSION_COOKIE_NAME+"="+(await createSession({id:b.id,email:b.email,name:b.name,isPlatformAdmin:false})).token;
  cookieClient=SESSION_COOKIE_NAME+"="+(await createSession({id:client.id,email:client.email,name:client.name,isPlatformAdmin:false})).token;
 });

 it("rejects unsigned and tampered token; generates distinct signed tenant URLs",async()=>{
  expect(validateCustomerQr(first(aId))).toBe(aId);
  expect(validateCustomerQr(first(bId))).toBe(bId);
  expect(validateCustomerQr(first(aId).replace(aId,bId))).toBeNull();
  expect((await getQr(api("/api/v1/customers/qr"))).status).toBe(401);
  const a=await getQr(api("/api/v1/customers/qr","GET",undefined,context(aId,cookieA)));
  expect(a.status).toBe(200);
  expect((await a.json()).data.url).toContain(encodeURIComponent(first(aId)));
  const noAccess=await getQr(api("/api/v1/customers/qr","GET",undefined,context(bId,cookieA)));
  expect(noAccess.status).toBe(403);
  expect((await getQr(api("/api/v1/customers/qr?token="+first(aId)))).status).toBe(200);
  expect((await getQr(api("/api/v1/customers/qr?token=invalid"))).status).toBe(400);
 });

 it("persists an unauthenticated QR intake only under barber A and deduplicates scans",async()=>{
  const phone=makePhone(),body=payload(aId,phone);
  expect((await postIntakes(api("/api/v1/customers/intakes","POST",body))).status).toBe(201);
  expect((await postIntakes(api("/api/v1/customers/intakes","POST",body))).status).toBe(201);
  const a=await db.select().from(customerIntakes).where(and(eq(customerIntakes.tenantId,aId),eq(customerIntakes.phoneNormalized,phone)));
  const b=await db.select().from(customerIntakes).where(and(eq(customerIntakes.tenantId,bId),eq(customerIntakes.phoneNormalized,phone)));
  expect(a).toHaveLength(1);expect(b).toHaveLength(0);
  expect(a[0].status).toBe("UNVERIFIED");expect(a[0].customerUserId).toBeNull();
  const listA=await getIntakes(api("/api/v1/customers/intakes","GET",undefined,context(aId,cookieA)));
  const listB=await getIntakes(api("/api/v1/customers/intakes","GET",undefined,context(bId,cookieB)));
  expect((await listA.json()).data.some((x:{id:string})=>x.id===a[0].id)).toBe(true);
  expect((await listB.json()).data.some((x:{id:string})=>x.id===a[0].id)).toBe(false);
  expect((await getIntakes(api("/api/v1/customers/intakes"))).status).toBe(401);
 });

 it("verified signed-in customer creates a relationship in exactly barber B",async()=>{
  const phone=makePhone();
  const response=await postIntakes(api("/api/v1/customers/intakes","POST",payload(bId,phone),cookieClient));
  expect(response.status).toBe(201);
  expect((await response.json()).data.status).toBe("LINKED");
  const rows=await db.select().from(customerRelationships).where(eq(customerRelationships.customerUserId,clientId));
  expect(rows.filter(x=>x.tenantId===bId)).toHaveLength(1);
  expect(rows.filter(x=>x.tenantId===aId)).toHaveLength(0);
  const second=await postIntakes(api("/api/v1/customers/intakes","POST",payload(bId,phone),cookieA));
  expect(second.status).toBe(409);
 });

 it("rejects invalid payload, missing consent, and forged tenant",async()=>{
  expect((await postIntakes(api("/api/v1/customers/intakes","POST",{...payload(aId,makePhone()),consent:false}))).status).toBe(400);
  expect((await postIntakes(api("/api/v1/customers/intakes","POST",{...payload(aId,makePhone()),token:first(aId).replace(aId,bId)}))).status).toBe(400);
 });
});
