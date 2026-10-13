import {beforeAll,describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {eq,and} from "drizzle-orm";
import {NextRequest} from "next/server";
import {db} from "@/infrastructure/database/client";
import {users} from "@/infrastructure/database/schema/users";
import {tenants} from "@/infrastructure/database/schema/tenants";
import {memberships} from "@/infrastructure/database/schema/memberships";
import {membershipRoles,roles} from "@/infrastructure/database/schema/roles";
import {staffProfiles} from "@/infrastructure/database/schema/staff";
import {SESSION_COOKIE_NAME,createSession} from "@/infrastructure/auth/session";
import {PasswordHasher} from "@/modules/identity/infrastructure/password-hasher";
import {GET as list,POST as register} from "@/app/api/v1/staff/route";
import {PATCH as changeStatus} from "@/app/api/v1/staff/[id]/route";
let tenantId:string,otherId:string,ownerCookie:string,staffCookie:string;
const suffix=()=>randomUUID().slice(0,10);
const api=(method:string,body?:object,cookie?:string,path="/api/v1/staff")=>
 new NextRequest("http://localhost"+path,{method,
  headers:{"Content-Type":"application/json",...(cookie?{cookie}:{} )},...(body?{body:JSON.stringify(body)}:{})});
const target=(cookie:string,tenant:string)=>cookie+"; barber_active_workspace="+tenant;
describe("P0 staff provisioning and isolation",()=>{
 beforeAll(async()=>{
  if(process.env.NODE_ENV==="production")throw new Error("QA test cannot run in production");
  const s=suffix();
  const [t1,t2]=await db.insert(tenants).values([
   {slug:"p0-staff-a-"+s,name:"QA Staff Tenant A",tenantType:"BUSINESS"},
   {slug:"p0-staff-b-"+s,name:"QA Staff Tenant B",tenantType:"BUSINESS"},
  ]).returning(); tenantId=t1.id;otherId=t2.id;
  const [owner,employee]=await db.insert(users).values([
   {email:"staff-p0-owner-"+s+"@example.test",emailNormalized:"staff-p0-owner-"+s+"@example.test",name:"QA OWNER",passwordHash:"qa"},
   {email:"staff-p0-employee-"+s+"@example.test",emailNormalized:"staff-p0-employee-"+s+"@example.test",name:"QA EMPLOYEE",passwordHash:"qa"},
  ]).returning();
  const [ownerRole]=await db.select().from(roles).where(eq(roles.name,"OWNER")).limit(1);
  const [employeeRole]=await db.select().from(roles).where(eq(roles.name,"EMPLOYEE")).limit(1);
  const members=await db.insert(memberships).values([
   {tenantId,userId:owner.id},{tenantId,userId:employee.id}
  ]).returning();
  await db.insert(membershipRoles).values([
   {membershipId:members[0].id,roleId:ownerRole.id},
   {membershipId:members[1].id,roleId:employeeRole.id}
  ]);
  ownerCookie=SESSION_COOKIE_NAME+"="+(await createSession({
   id:owner.id,email:owner.email,name:owner.name,isPlatformAdmin:false,
  })).token;
  staffCookie=SESSION_COOKIE_NAME+"="+(await createSession({
   id:employee.id,email:employee.email,name:employee.name,isPlatformAdmin:false,
  })).token;
 });
 it("rejects anonymous access, employee creation and tenant substitution",async()=>{
  expect((await list(api("GET"))).status).toBe(401);
  expect((await register(api("POST",{name:"QA Barber",email:"qa-unauth-"+suffix()+"@example.test"}))).status).toBe(401);
  expect((await register(api("POST",{name:"QA Barber",email:"qa-employee-"+suffix()+"@example.test"},target(staffCookie,tenantId)))).status).toBe(403);
  expect((await list(api("GET",undefined,target(ownerCookie,otherId)))).status).toBe(403);
 });
 it("creates a real account, hashed password, scoped staff membership, and one-time credentials",async()=>{
  const email="p0-staff-new-"+suffix()+"@example.test";
  const resp=await register(api("POST",{name:"QA Scissors Barber",email},target(ownerCookie,tenantId)));
  expect(resp.status).toBe(201);
  expect(resp.headers.get("cache-control")).toContain("no-store");
  const data=await resp.json();
  expect(data.credentials.email).toBe(email);
  expect(data.credentials.temporaryPassword).toMatch(/^[A-Za-z0-9_-]{32}$/);
  const [user]=await db.select().from(users).where(eq(users.emailNormalized,email));
  expect(user.passwordHash).not.toBe(data.credentials.temporaryPassword);
  expect(await PasswordHasher.compare(data.credentials.temporaryPassword,user.passwordHash!)).toBe(true);
  const [membership]=await db.select().from(memberships).where(and(eq(memberships.userId,user.id),eq(memberships.tenantId,tenantId)));
  expect(membership.status).toBe("ACTIVE");
  const [profile]=await db.select().from(staffProfiles).where(eq(staffProfiles.membershipId,membership.id));
  expect(profile.displayName).toBe("QA Scissors Barber");
  const other=await db.select().from(memberships).where(and(eq(memberships.userId,user.id),eq(memberships.tenantId,otherId)));
  expect(other).toHaveLength(0);
  const repeat=await register(api("POST",{name:"QA Scissors Barber",email},target(ownerCookie,tenantId)));
  expect(repeat.status).toBe(409);
  expect((await repeat.json()).credentials).toBeUndefined();
  const suspended=await changeStatus(api("PATCH",{status:"SUSPENDED"},target(ownerCookie,tenantId),"/api/v1/staff/"+profile.id),{params:Promise.resolve({id:profile.id})});
  expect(suspended.status).toBe(200);
  const [after]=await db.select().from(memberships).where(eq(memberships.id,membership.id));
  expect(after.status).toBe("SUSPENDED");
 });
});
