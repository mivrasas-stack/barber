import {beforeAll,describe,expect,it} from "vitest";
import {NextRequest} from "next/server";
import {randomUUID} from "node:crypto";
import {eq} from "drizzle-orm";
import {db} from "@/infrastructure/database/client";
import {users} from "@/infrastructure/database/schema/users";
import {tenants} from "@/infrastructure/database/schema/tenants";
import {tenantSubscriptions,subscriptionInvoices} from "@/infrastructure/database/schema/subscriptions";
import {createSession,SESSION_COOKIE_NAME,validateSessionWithDb} from "@/infrastructure/auth/session";
import {PasswordHasher} from "@/modules/identity/infrastructure/password-hasher";
import {GET as listUsers,POST as createUser} from "@/app/api/v1/admin/users/route";
import {GET as detailUser,PATCH as editUser,DELETE as archiveUser} from "@/app/api/v1/admin/users/[id]/route";
import {PATCH as updateAccess} from "@/app/api/v1/admin/users/[id]/access/route";
import {PUT as updateModule} from "@/app/api/v1/admin/users/[id]/modules/route";
import {POST as resetPassword} from "@/app/api/v1/admin/users/[id]/credentials/route";
import {GET as options} from "@/app/api/v1/admin/users/options/route";
import {resolveAdminGrant} from "@/modules/platform-admin/application/global-users-create";
import {assertLastAdminProtected} from "@/modules/platform-admin/application/global-users-mutate";

const suffix=()=>randomUUID().slice(0,10);
let adminCookie="",normalCookie="";
function request(url:string,method="GET",body?:unknown,cookie?:string) {
 return new NextRequest("http://localhost"+url,{
  method,headers:{"Content-Type":"application/json",...(cookie?{cookie}:{})},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
 });
}
const routeCtx=(id:string)=>({params:Promise.resolve({id})});
const createPayload=(kind:string)=>{
 const unique=suffix();
 const base={kind,name:"QA Global "+unique,email:`qa-global-${unique}@example.test`};
 if(kind==="SOLO")return {...base,displayName:"QA Solo "+unique,slug:"qa-solo-"+unique,planCode:"SOLO_PRO",grant:{duration:"MONTH"}};
 if(kind==="BUSINESS")return {...base,businessName:"QA Business "+unique,slug:"qa-business-"+unique,planCode:"BUSINESS_BASIC",grant:{duration:"SIX_MONTHS"}};
 return base;
};

describe("Centro Global de Usuarios - seguridad y persistencia",()=>{
 beforeAll(async()=>{
  if(process.env.NODE_ENV==="production")throw new Error("Forbidden QA on production");
  const tag=suffix();
  const [admin,normal]=await db.insert(users).values([
    {email:`qa-global-admin-${tag}@example.test`,emailNormalized:`qa-global-admin-${tag}@example.test`,name:"Admin QA",isPlatformAdmin:true,passwordHash:"qa"},
    {email:`qa-global-member-${tag}@example.test`,emailNormalized:`qa-global-member-${tag}@example.test`,name:"User QA",passwordHash:"qa"},
  ]).returning();
  adminCookie=`${SESSION_COOKIE_NAME}=${(await createSession({id:admin.id,email:admin.email,name:admin.name,isPlatformAdmin:true})).token}`;
  normalCookie=`${SESSION_COOKIE_NAME}=${(await createSession({id:normal.id,email:normal.email,name:normal.name,isPlatformAdmin:false})).token}`;
 });

 it("denies public and non-admin listing / creation / edits",async()=>{
  expect((await listUsers(request("/api/v1/admin/users"))).status).toBe(401);
  expect((await listUsers(request("/api/v1/admin/users","GET",undefined,normalCookie))).status).toBe(403);
  expect((await createUser(request("/api/v1/admin/users","POST",createPayload("CUSTOMER"),normalCookie))).status).toBe(403);
  const id=randomUUID();
  expect((await editUser(request("/api/v1/admin/users/"+id,"PATCH",{status:"DISABLED"},normalCookie),routeCtx(id))).status).toBe(403);
  expect((await options(request("/api/v1/admin/users/options","GET",undefined,normalCookie))).status).toBe(403);
 });

 it("lists with safe pagination, real admin filter and no hashes",async()=>{
  const res=await listUsers(request("/api/v1/admin/users?page=1&pageSize=5&kind=PLATFORM_ADMIN","GET",undefined,adminCookie));
  expect(res.status).toBe(200);
  const json=await res.json();
  expect(json.data.items.length).toBeLessThanOrEqual(5);
  expect(json.data.items.every((x:{isPlatformAdmin:boolean})=>x.isPlatformAdmin)).toBe(true);
  expect(JSON.stringify(json)).not.toContain("passwordHash");
  expect(res.headers.get("cache-control")).toContain("no-store");
  const choices=await options(request("/api/v1/admin/users/options","GET",undefined,adminCookie));
  expect(choices.status).toBe(200);
  expect((await choices.json()).data.plans.some((p:{code:string})=>p.code==="SOLO_PRO")).toBe(true);
 });

 it("creates a customer without SaaS subscription, securely and once",async()=>{
  const payload=createPayload("CUSTOMER");
  const r=await createUser(request("/api/v1/admin/users","POST",payload,adminCookie));
  expect(r.status).toBe(201);
  const json=await r.json();
  expect(json.credentials.email).toBe(payload.email);
  expect(json.credentials.temporaryPassword).toMatch(/^[A-Za-z0-9_-]{32}$/);
  const [user]=await db.select().from(users).where(eq(users.id,json.data.id));
  expect(await PasswordHasher.compare(json.credentials.temporaryPassword,user.passwordHash!)).toBe(true);
  const again=await createUser(request("/api/v1/admin/users","POST",payload,adminCookie));
  expect(again.status).toBe(409);
  const detail=await detailUser(request("/api/v1/admin/users/"+user.id,"GET",undefined,adminCookie),routeCtx(user.id));
  expect(detail.status).toBe(200);
  expect((await detail.json()).data.workspaces).toHaveLength(0);
 });

 it("can create a real business with 6 months access and OWNER membership",async()=>{
  const payload=createPayload("BUSINESS");
  const r=await createUser(request("/api/v1/admin/users","POST",payload,adminCookie));
  expect(r.status).toBe(201);
  const created=(await r.json()).data;
  const [business]=await db.select().from(tenants).where(eq(tenants.id,created.tenantId));
  expect(business.tenantType).toBe("BUSINESS");
  const [subscription]=await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId,business.id));
  expect(subscription.cancelAtPeriodEnd).toBe(true);
  expect(subscription.status).toBe("TRIALING");
  expect(subscription.currentPeriodEnd?.toISOString()).toBe(created.accessEndsAt);
  const detail=await detailUser(request("/api/v1/admin/users/"+created.id,"GET",undefined,adminCookie),routeCtx(created.id));
  expect(detail.status).toBe(200);
  expect((await detail.json()).data.workspaces.some((w:{roles:string[]})=>w.roles.includes("OWNER"))).toBe(true);
  const invoices=await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.tenantId,business.id));
  expect(invoices).toHaveLength(0);
 });

 it("creates and manages an independent with effective modules",async()=>{
  const payload=createPayload("SOLO");
  const r=await createUser(request("/api/v1/admin/users","POST",payload,adminCookie));
  expect(r.status).toBe(201);
  const created=(await r.json()).data;
  const detail=await detailUser(request("/api/v1/admin/users/"+created.id,"GET",undefined,adminCookie),routeCtx(created.id));
  expect(detail.status).toBe(200);
  const info=(await detail.json()).data;
  const ws=info.workspaces.find((w:{tenantType:string})=>w.tenantType==="SOLO_PROFESSIONAL");
  expect(ws).toBeTruthy();expect(ws.modules.length).toBeGreaterThan(0);
  const mod=ws.modules.find((x:{enabled:boolean})=>x.enabled);
  if(mod){
   const change=await updateModule(request("/api/v1/admin/users/"+created.id+"/modules","PUT",{tenantId:ws.tenantId,moduleCode:mod.code,state:"FORCE_DISABLED",reason:"QA admin test"},adminCookie),routeCtx(created.id));
   expect(change.status).toBe(200);
   const again=await detailUser(request("/api/v1/admin/users/"+created.id,"GET",undefined,adminCookie),routeCtx(created.id));
   const after=(await again.json()).data.workspaces.find((w:{tenantId:string})=>w.tenantId===ws.tenantId);
   expect(after.modules.find((x:{code:string})=>x.code===mod.code).enabled).toBe(false);
  }
  const until=await updateAccess(request("/api/v1/admin/users/"+created.id+"/access","PATCH",{tenantId:ws.tenantId,grant:{duration:"YEAR"}},adminCookie),routeCtx(created.id));
  expect(until.status).toBe(200);
  const businessModule=await updateModule(request("/api/v1/admin/users/"+created.id+"/modules","PUT",{tenantId:randomUUID(),moduleCode:"scheduling.calendar",state:"FORCE_ENABLED",reason:"QA test"},adminCookie),routeCtx(created.id));
  expect(businessModule.status).toBe(400);
 });

 it("prevents arbitrary credential/identity fields and invalid roles",async()=>{
  const base=createPayload("CUSTOMER");
  const r=await createUser(request("/api/v1/admin/users","POST",{...base,isPlatformAdmin:true,password:"guessed"},adminCookie));
  expect(r.status).toBe(400);
  const r2=await createUser(request("/api/v1/admin/users","POST",{...createPayload("SOLO"),planCode:"BUSINESS_BASIC"},adminCookie));
  expect([400,404]).toContain(r2.status);
 });

 it("revokes sessions on deactivation and never physically deletes users",async()=>{
  const r=await createUser(request("/api/v1/admin/users","POST",createPayload("CUSTOMER"),adminCookie));
  const created=(await r.json()).data;
  const [account]=await db.select().from(users).where(eq(users.id,created.id));
  const issued=await createSession({id:account.id,email:account.email,name:account.name,isPlatformAdmin:false});
  expect(await validateSessionWithDb(issued.token)).toBeTruthy();
  const archived=await archiveUser(request("/api/v1/admin/users/"+account.id,"DELETE",undefined,adminCookie),routeCtx(account.id));
  expect(archived.status).toBe(200);
  const [stillThere]=await db.select().from(users).where(eq(users.id,account.id));
  expect(stillThere.status).toBe("DISABLED");
  expect(await validateSessionWithDb(issued.token)).toBeNull();
 });

 it("resets credentials server-side with no plaintext persistence",async()=>{
  const r=await createUser(request("/api/v1/admin/users","POST",createPayload("CUSTOMER"),adminCookie));
  const id=(await r.json()).data.id as string;
  expect((await resetPassword(request("/api/v1/admin/users/"+id+"/credentials","POST",undefined,normalCookie),routeCtx(id))).status).toBe(403);
  const changed=await resetPassword(request("/api/v1/admin/users/"+id+"/credentials","POST",undefined,adminCookie),routeCtx(id));
  expect(changed.status).toBe(200);
  const credential=(await changed.json()).credentials;
  const [user]=await db.select().from(users).where(eq(users.id,id));
  expect(await PasswordHasher.compare(credential.temporaryPassword,user.passwordHash!)).toBe(true);
 });

 it("protects the final active platform administrator",()=>{
  expect(()=>assertLastAdminProtected(true,"DISABLED",undefined,1)).toThrow("último administrador");
  expect(()=>assertLastAdminProtected(true,undefined,false,1)).toThrow("último administrador");
  expect(()=>assertLastAdminProtected(true,"SUSPENDED",undefined,2)).not.toThrow();
  expect(()=>assertLastAdminProtected(false,"DISABLED",false,0)).not.toThrow();
 });

 it("twelve concurrent duplicate registrations produce one account",async()=>{
  const payload=createPayload("CUSTOMER");
  const responses=await Promise.all(Array.from({length:12},()=>createUser(request("/api/v1/admin/users","POST",payload,adminCookie))));
  expect(responses.filter(r=>r.status===201)).toHaveLength(1);
  expect(responses.filter(r=>r.status===409)).toHaveLength(11);
  const matching=await db.select({id:users.id}).from(users).where(eq(users.emailNormalized,payload.email));
  expect(matching).toHaveLength(1);
 });

 it("handles calendar edge cases and invalid custom ranges",()=>{
  expect(resolveAdminGrant({duration:"SIX_MONTHS"},new Date("2026-08-31T12:00:00Z")).endsAt.toISOString()).toBe("2027-02-28T12:00:00.000Z");
  expect(()=>resolveAdminGrant({duration:"CUSTOM",endsAt:"2020-01-01T00:00:00.000Z"})).toThrow();
 });
});
