import { describe, expect, it, vi, afterEach } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { isUnverifiedLaunchRoute, shouldBlockUnverifiedLaunchRoute } from "@/shared/config/launch-safety";

afterEach(() => vi.unstubAllEnvs());

const unsafe = [
 "/clientes", "/clientes/appointments", "/clientes/profile", "/clientes/services",
 "/barber/accounting", "/barber/appointments", "/barber/payments",
 "/barber/portfolio", "/barber/profile", "/barber/wait-room", "/barber/metrics",
 "/business/appointments", "/business/accounting", "/business/orders",
 "/business/security", "/business/roles", "/business/settings",
];
const allowed = [
 "/barber", "/business", "/barber/pos", "/barber/customers", "/barber/barberos",
 "/barber/inventory", "/barber/services", "/barber/affiliations",
 "/business/payments", "/business/products", "/business/customers",
 "/business/billing", "/business/barberos",
 "/admin/users", "/api/v1/customers/qr", "/qr-register", "/feature-unavailable",
];

async function signedToken(): Promise<string> {
 const secret = process.env.AUTH_SECRET || "development_secret_key_minimum_32_characters_for_jwt_session";
 return new SignJWT({
  userId:"e5103546-82a1-4995-bf85-b7ae50759499",
  sessionId:"85b9787f-bf1b-4d69-8d28-14ead4135edb",
  email:"qa-launch@example.test",name:"QA",isPlatformAdmin:false
 }).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("2h")
 .sign(new TextEncoder().encode(secret));
}
describe("Safe controlled release routes",()=>{
 it("classifies unfinished screens without blocking real POS/QR/customer directory",()=>{
  for(const path of unsafe){
   expect(isUnverifiedLaunchRoute(path),path).toBe(true);
   expect(shouldBlockUnverifiedLaunchRoute(path,true),path).toBe(true);
   expect(shouldBlockUnverifiedLaunchRoute(path,false),path).toBe(false);
  }
  for(const path of allowed)expect(isUnverifiedLaunchRoute(path),path).toBe(false);
  expect(isUnverifiedLaunchRoute("/barber/pos/")).toBe(false);
  expect(isUnverifiedLaunchRoute("/business/settings/private")).toBe(true);
 });
 it("routes authenticated users away from synthetic operational screens in production",async()=>{
  vi.stubEnv("NODE_ENV","production");
  vi.stubEnv("AUTH_SECRET","qa-production-middleware-signing-key-1234567890");
  const cookie="barber_session="+(await signedToken());
  for(const route of ["/clientes/appointments","/barber/accounting","/business/orders"]){
   const response=await middleware(new NextRequest("http://localhost:9002"+route,{headers:{cookie}}));
   expect(response.status,route).toBe(307);
   expect(new URL(response.headers.get("location")||"http://invalid").pathname,route).toBe("/feature-unavailable");
  }
  for(const route of ["/barber/pos","/business/payments","/barber/customers"]){
   const response=await middleware(new NextRequest("http://localhost:9002"+route,{headers:{cookie}}));
   expect(response.status,route).toBe(200);
   expect(response.headers.get("location")).toBeNull();
  }
 });
 it("still requires valid login before redirecting away from demo pages",async()=>{
  vi.stubEnv("NODE_ENV","production");
  const res=await middleware(new NextRequest("http://localhost:9002/clientes/appointments"));
  expect(res.status).toBe(307);
  expect(new URL(res.headers.get("location")||"http://invalid").pathname).toBe("/login");
 });
 it("production refuses all authenticated pages if JWT signing secret is absent",async()=>{
  vi.stubEnv("NODE_ENV","production");
  vi.stubEnv("AUTH_SECRET","");
  const cookie="barber_session="+(await new SignJWT({
   userId:"e5103546-82a1-4995-bf85-b7ae50759499",
   sessionId:"85b9787f-bf1b-4d69-8d28-14ead4135edb",
   email:"qa@example.test",name:"QA",isPlatformAdmin:true
  }).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("2h")
   .sign(new TextEncoder().encode("development_secret_key_minimum_32_characters_for_jwt_session")));
  const res=await middleware(new NextRequest("http://localhost:9002/admin",{headers:{cookie}}));
  expect(new URL(res.headers.get("location")||"http://invalid").pathname).toBe("/login");
 });
 it("retains QA access to test/demo pages in development mode",async()=>{
  vi.stubEnv("NODE_ENV","development");
  const cookie="barber_session="+(await signedToken());
  const res=await middleware(new NextRequest("http://localhost:9002/barber/accounting",{headers:{cookie}}));
  expect(res.status).toBe(200);
 });
});
