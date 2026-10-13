import {describe,expect,it} from "vitest";
import {randomUUID} from "node:crypto";
import {NextRequest} from "next/server";
import {db} from "@/infrastructure/database/client";
import {users} from "@/infrastructure/database/schema/users";
import {createSession,validateSessionWithDb,SESSION_COOKIE_NAME} from "@/infrastructure/auth/session";
import {POST} from "@/app/api/auth/logout/route";

describe("Launch P0: logout revokes actual database sessions",()=>{
 it("revokes signed token and expires actual HttpOnly session cookie",async()=>{
  if(process.env.NODE_ENV==="production")throw Error("QA fixture forbidden in production");
  const id=randomUUID().slice(0,10),email="qa-logout-"+id+"@example.test";
  const [user]=await db.insert(users).values({
   email,emailNormalized:email,name:"QA logout",passwordHash:"qa"
  }).returning();
  const {token}=await createSession({id:user.id,name:user.name,email:user.email,isPlatformAdmin:false});
  expect(await validateSessionWithDb(token)).not.toBeNull();
  const response=await POST(new NextRequest("http://localhost:9002/api/auth/logout",{
   method:"POST",headers:{cookie:SESSION_COOKIE_NAME+"="+token}
  }));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("set-cookie")).toContain("barber_session=");
  expect(response.headers.get("set-cookie")).toMatch(/httponly/i);
  expect(await validateSessionWithDb(token)).toBeNull();
 });
 it("logout without session does not error and clears cookie",async()=>{
  const response=await POST(new NextRequest("http://localhost:9002/api/auth/logout",{method:"POST"}));
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain("barber_session=");
 });
});
