import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {describe,it,expect,beforeAll} from "vitest";
import {NextRequest} from "next/server";
import {eq} from "drizzle-orm";
import {db} from "@/infrastructure/database/client";
import {users} from "@/infrastructure/database/schema/users";
import {createSession,SESSION_COOKIE_NAME} from "@/infrastructure/auth/session";
import {GET as getMe} from "@/app/api/auth/me/route";
import {GET as getCustomersMe} from "@/app/api/v1/customers/me/route";
import {GET as getWorkspaces} from "@/app/api/v1/workspaces/route";
import {GET as getLoyalty} from "@/app/api/v1/customers/me/loyalty/route";
import {isUnverifiedLaunchRoute,shouldBlockUnverifiedLaunchRoute} from "@/shared/config/launch-safety";
const root=process.cwd();
const source=(path:string)=>readFileSync(root+"/src/"+path,"utf8");
const id=randomUUID().slice(0,12);
const sessionReq=(path:string,cookie?:string)=>new NextRequest("http://localhost:9002"+path,{
 headers:cookie?{cookie}:{},
});
let accountA:string,accountB:string,tokenA:string,tokenB:string;
describe("No synthetic account information for newly registered users",()=>{
 beforeAll(async()=>{
  if(process.env.NODE_ENV==="production")throw Error("Do not run fixtures on production DB");
  const [a,b]=await db.insert(users).values([
   {name:"QA Brand New Person Alpha "+id,email:"qa-empty-alpha-"+id+"@example.test",
    emailNormalized:"qa-empty-alpha-"+id+"@example.test",passwordHash:"qa"},
   {name:"QA Brand New Person Beta "+id,email:"qa-empty-beta-"+id+"@example.test",
    emailNormalized:"qa-empty-beta-"+id+"@example.test",passwordHash:"qa"},
  ]).returning();
  accountA=a.id;accountB=b.id;
  tokenA=SESSION_COOKIE_NAME+"="+(await createSession({
   id:accountA,email:a.email,name:a.name,isPlatformAdmin:false,
  })).token;
  tokenB=SESSION_COOKIE_NAME+"="+(await createSession({
   id:accountB,email:b.email,name:b.name,isPlatformAdmin:false,
  })).token;
 });
 it("user identities and authorized workspaces come from the current PostgreSQL session",async()=>{
  const a=await getMe(sessionReq("/api/auth/me",tokenA));
  const b=await getMe(sessionReq("/api/auth/me",tokenB));
  expect(a.status).toBe(200);expect(b.status).toBe(200);
  const bodyA=await a.json(),bodyB=await b.json();
  expect(bodyA.user).toMatchObject({id:accountA,name:"QA Brand New Person Alpha "+id});
  expect(bodyB.user).toMatchObject({id:accountB,name:"QA Brand New Person Beta "+id});
  expect(bodyA.user.id).not.toBe(bodyB.user.id);
  expect(bodyA.memberships).toEqual([]);
  expect(bodyB.memberships).toEqual([]);
  const w=await getWorkspaces(sessionReq("/api/v1/workspaces",tokenA));
  expect(w.status).toBe(200);
  expect((await w.json()).workspaces).toEqual([]);
 });
 it("new clients see empty appointments, barber relationships and loyalty, not demo people",async()=>{
  const [a,b,p]=await Promise.all([
   getCustomersMe(sessionReq("/api/v1/customers/me",tokenA)),
   getCustomersMe(sessionReq("/api/v1/customers/me",tokenB)),
   getLoyalty(sessionReq("/api/v1/customers/me/loyalty",tokenA)),
  ]);
  expect(a.status).toBe(200);expect(b.status).toBe(200);expect(p.status).toBe(200);
  const aa=await a.json(),bb=await b.json();
  expect(aa.data.user.id).toBe(accountA);expect(bb.data.user.id).toBe(accountB);
  expect(aa.data.appointments).toEqual([]);expect(bb.data.appointments).toEqual([]);
  expect(aa.data.relationships).toEqual([]);expect(bb.data.relationships).toEqual([]);
  expect((await p.json()).data).toMatchObject({points:0,cuts:0});
  expect(JSON.stringify(aa)).not.toMatch(/Carlos Mendoza|The Royal Barber|Santiago Gómez/);
 });
 it("live homes cannot import old demo dashboards or arrays of synthetic identities",()=>{
  for(const path of [
   "app/business/page.tsx","app/barber/page.tsx","app/portal/page.tsx",
   "app/business/business-shell.tsx","app/barber/barber-shell.tsx",
   "app/professional/page.tsx","app/directorio/page.tsx","app/barbers/[id]/page.tsx",
  ]){
   const text=source(path);
   expect(text,path).not.toMatch(/dummyBarbers|DemoBusinessDashboard|DemoBarberDashboard|DemoPortalPage|The Royal Barber|Carlos Mendoza|Santiago Gómez/);
  }
  const rootPage=source("app/page.tsx");
  expect(rootPage).not.toMatch(/<TopBarbershops|<Testimonials|<Products|<Portfolio|<Pricing/);
 });
 it("unfinished demo modules are blocked in ALL environments",()=>{
  const denied=[
   "/business/appointments","/business/accounting","/business/settings",
   "/barber/profile","/barber/appointments","/barber/wait-room",
   "/professional/appointments","/professional/customers","/professional/pos",
   "/admin/audit","/admin/metrics","/admin/subscriptions","/admin/tenants",
  ];
  for(const route of denied){
   expect(isUnverifiedLaunchRoute(route),route).toBe(true);
   expect(shouldBlockUnverifiedLaunchRoute(route,false),route).toBe(true);
   expect(shouldBlockUnverifiedLaunchRoute(route,true),route).toBe(true);
  }
  for(const route of ["/business/barberos","/barber/pos","/customers","/customers/profile","/admin/users"])
   expect(isUnverifiedLaunchRoute(route),route).toBe(false);
 });
});
