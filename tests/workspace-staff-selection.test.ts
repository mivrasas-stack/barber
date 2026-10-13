import {beforeAll,describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {NextRequest} from "next/server";
import {and,eq} from "drizzle-orm";
import {db} from "@/infrastructure/database/client";
import {users} from "@/infrastructure/database/schema/users";
import {tenants} from "@/infrastructure/database/schema/tenants";
import {memberships} from "@/infrastructure/database/schema/memberships";
import {roles,membershipRoles} from "@/infrastructure/database/schema/roles";
import {staffProfiles} from "@/infrastructure/database/schema/staff";
import {SESSION_COOKIE_NAME,createSession} from "@/infrastructure/auth/session";
import {PasswordHasher} from "@/modules/identity/infrastructure/password-hasher";
import {GET as workspaces} from "@/app/api/v1/workspaces/route";
import {POST as switchWorkspace} from "@/app/api/v1/workspaces/switch/route";
import {GET as listStaff,POST as addStaff} from "@/app/api/v1/staff/route";
import {POST as login} from "@/app/api/auth/login/route";

const suffix=randomUUID().slice(0,12);
let a:string,b:string,c:string,singleCookie:string,multiCookie:string,employeeCookie:string,guestCookie:string;
let loginEmail:string,password:string;
const req=(url:string,method="GET",cookie?:string,body?:object)=>new NextRequest("http://localhost:9002"+url,{
 method,headers:{...(cookie?{cookie}:{}),...(body?{"Content-Type":"application/json"}:{})},
 ...(body?{body:JSON.stringify(body)}:{}),
});
const session=async(user:typeof users.$inferSelect)=>{
 const {token}=await createSession({id:user.id,email:user.email,name:user.name,isPlatformAdmin:false});
 return SESSION_COOKIE_NAME+"="+token;
};
const named=(cookie:string,id:string)=>cookie+"; barber_active_workspace="+id;
describe("Staff creation works from active barber shop selection",()=>{
 beforeAll(async()=>{
  if(process.env.NODE_ENV==="production")throw new Error("Never run local QA against production");
  const [ownerRole]=await db.select().from(roles).where(eq(roles.name,"OWNER")).limit(1);
  const [employeeRole]=await db.select().from(roles).where(eq(roles.name,"EMPLOYEE")).limit(1);
  if(!ownerRole||!employeeRole)throw Error("QA fixture roles unavailable");
  const [tenantA,tenantB,tenantC]=await db.insert(tenants).values([
   {slug:"ws-staff-a-"+suffix,name:"QA Unica Barbería "+suffix,tenantType:"BUSINESS",status:"ACTIVE"},
   {slug:"ws-staff-b-"+suffix,name:"QA Segunda Barbería "+suffix,tenantType:"BUSINESS",status:"ACTIVE"},
   {slug:"ws-staff-c-"+suffix,name:"QA Sin Acceso "+suffix,tenantType:"BUSINESS",status:"SUSPENDED"},
  ]).returning();
  a=tenantA.id;b=tenantB.id;c=tenantC.id;
  password="QA-Staff-"+suffix+"-secure";
  loginEmail="ws-login-owner-"+suffix+"@example.test";
  const [single,multi,employee,guest]=await db.insert(users).values([
   {name:"QA Solo Owner",email:loginEmail,emailNormalized:loginEmail,passwordHash:await PasswordHasher.hash(password)},
   {name:"QA Multi Owner",email:"ws-multi-"+suffix+"@example.test",emailNormalized:"ws-multi-"+suffix+"@example.test",passwordHash:"qa"},
   {name:"QA Employee",email:"ws-employee-"+suffix+"@example.test",emailNormalized:"ws-employee-"+suffix+"@example.test",passwordHash:"qa"},
   {name:"QA Stranger",email:"ws-stranger-"+suffix+"@example.test",emailNormalized:"ws-stranger-"+suffix+"@example.test",passwordHash:"qa"},
  ]).returning();
  const membershipsCreated=await db.insert(memberships).values([
   {tenantId:a,userId:single.id,status:"ACTIVE"},
   {tenantId:a,userId:multi.id,status:"ACTIVE"},
   {tenantId:b,userId:multi.id,status:"ACTIVE"},
   {tenantId:c,userId:multi.id,status:"ACTIVE"},
   {tenantId:a,userId:employee.id,status:"ACTIVE"},
  ]).returning();
  await db.insert(membershipRoles).values(membershipsCreated.map((m,i)=>({
   membershipId:m.id,roleId:i===4?employeeRole.id:ownerRole.id,
  })));
  [singleCookie,multiCookie,employeeCookie,guestCookie]=await Promise.all(
   [single,multi,employee,guest].map(session));
 });
 it("returns real workspace names and heals a single-shop missing/invalid cookie",async()=>{
  const response=await workspaces(req("/api/v1/workspaces","GET",singleCookie));
  expect(response.status).toBe(200);
  const body=await response.json();
  expect(body.workspaces).toHaveLength(1);
  expect(body.workspaces[0]).toMatchObject({id:a,name:"QA Unica Barbería "+suffix,type:"BUSINESS",role:"OWNER"});
  expect(body.activeWorkspaceId).toBe(a);
  expect(response.cookies.get("barber_active_workspace")?.value).toBe(a);
  expect(response.cookies.get("barber_active_workspace")?.httpOnly).toBe(true);
  const invalid=await workspaces(req("/api/v1/workspaces","GET",named(singleCookie,b)));
  expect((await invalid.json()).activeWorkspaceId).toBe(a);
  expect(invalid.cookies.get("barber_active_workspace")?.value).toBe(a);
 });
 it("lets a legitimate owner list and create staff even with older session missing selection",async()=>{
  const listed=await listStaff(req("/api/v1/staff","GET",singleCookie));
  expect(listed.status).toBe(200);
  const email="ws-new-staff-"+suffix+"@example.test";
  const created=await addStaff(req("/api/v1/staff","POST",singleCookie,{name:"QA Nuevo Barbero",email}));
  expect(created.status).toBe(201);
  const data=await created.json();
  expect(data.credentials.email).toBe(email);
  expect(data.credentials.temporaryPassword.length).toBeGreaterThan(20);
  const [user]=await db.select().from(users).where(eq(users.emailNormalized,email));
  const [membership]=await db.select().from(memberships).where(and(eq(memberships.userId,user.id),eq(memberships.tenantId,a)));
  expect(membership.status).toBe("ACTIVE");
  const [staff]=await db.select().from(staffProfiles).where(eq(staffProfiles.membershipId,membership.id));
  expect(staff.displayName).toBe("QA Nuevo Barbero");
  expect(await PasswordHasher.compare(data.credentials.temporaryPassword,user.passwordHash!)).toBe(true);
 });
 it("creates the workspace cookie on real login",async()=>{
  const response=await login(req("/api/auth/login","POST",undefined,{email:loginEmail,password}));
  expect(response.status).toBe(200);
  const body=await response.json();
  expect(body.activeTenantId).toBe(a);
  expect(response.cookies.get("barber_active_workspace")?.value).toBe(a);
  expect(response.cookies.get("barber_active_workspace")?.httpOnly).toBe(true);
  expect(response.cookies.get(SESSION_COOKIE_NAME)?.httpOnly).toBe(true);
 });
 it("requires an explicit workspace selection for multiple shops and switches securely",async()=>{
  const r=await workspaces(req("/api/v1/workspaces","GET",multiCookie));
  expect(r.status).toBe(200);
  const data=await r.json();
  expect(data.workspaces).toHaveLength(2);
  expect(data.activeWorkspaceId).toBeNull();
  const without=await listStaff(req("/api/v1/staff","GET",multiCookie));
  expect(without.status).toBe(403);
  expect((await without.json()).error).toMatch(/Selecciona tu barbería/);
  const wrongKey=await switchWorkspace(req("/api/v1/workspaces/switch","POST",multiCookie,{targetTenantId:b}));
  expect(wrongKey.status).toBe(400);
  const unauthorized=await switchWorkspace(req("/api/v1/workspaces/switch","POST",multiCookie,{workspaceId:c}));
  expect(unauthorized.status).toBe(403);
  const changed=await switchWorkspace(req("/api/v1/workspaces/switch","POST",multiCookie,{workspaceId:b}));
  expect(changed.status).toBe(200);
  expect(changed.cookies.get("barber_active_workspace")?.value).toBe(b);
  expect(changed.cookies.get("barber_active_workspace")?.httpOnly).toBe(true);
  const refreshed=await workspaces(req("/api/v1/workspaces","GET",named(multiCookie,b)));
  expect((await refreshed.json()).activeWorkspaceId).toBe(b);
  const email="ws-selected-"+suffix+"@example.test";
  const created=await addStaff(req("/api/v1/staff","POST",named(multiCookie,b),{name:"QA Seleccionado",email}));
  expect(created.status).toBe(201);
  const [account]=await db.select().from(users).where(eq(users.emailNormalized,email));
  const ownerTenant=await db.select().from(memberships).where(and(eq(memberships.userId,account.id),eq(memberships.tenantId,b)));
  const otherTenant=await db.select().from(memberships).where(and(eq(memberships.userId,account.id),eq(memberships.tenantId,a)));
  expect(ownerTenant).toHaveLength(1);
  expect(otherTenant).toHaveLength(0);
 });
 it("does not allow employees or strangers to provision employees by bypassing the selector",async()=>{
  expect((await addStaff(req("/api/v1/staff","POST",employeeCookie,{name:"QA Blocked",email:"ws-block-emp-"+suffix+"@example.test"}))).status).toBe(403);
  expect((await addStaff(req("/api/v1/staff","POST",guestCookie,{name:"QA Blocked",email:"ws-block-guest-"+suffix+"@example.test"}))).status).toBe(403);
  expect((await switchWorkspace(req("/api/v1/workspaces/switch","POST",guestCookie,{workspaceId:a}))).status).toBe(403);
  expect((await listStaff(req("/api/v1/staff","GET",named(singleCookie,b)))).status).toBe(403);
 });
});
