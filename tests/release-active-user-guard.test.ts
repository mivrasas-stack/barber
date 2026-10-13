import {describe,it,expect,vi,afterEach} from "vitest";
import {randomUUID} from "node:crypto";
import {eq} from "drizzle-orm";
import {cookies} from "next/headers";
import {db} from "@/infrastructure/database/client";
import {users} from "@/infrastructure/database/schema/users";
import {createSession,revokeSession} from "@/infrastructure/auth/session";
import {requireActiveUser} from "@/infrastructure/auth/require-active-user";

vi.mock("next/headers",()=>({cookies:vi.fn()}));
vi.mock("next/navigation",()=>({
 redirect:vi.fn((url:string)=>{throw new Error("REDIRECT:"+url);})
}));
afterEach(()=>vi.resetAllMocks());

describe("Revoked sessions cannot render server-backed portals",()=>{
 it("allows an active user and rejects that very JWT after DB revocation",async()=>{
  if(process.env.NODE_ENV==="production")throw Error("Do not create QA users in production");
  const suffix=randomUUID().slice(0,12),email="qa-server-guard-"+suffix+"@example.test";
  const [account]=await db.insert(users).values({
   name:"QA Portal User",email,emailNormalized:email,passwordHash:"qa"
  }).returning();
  const {token}=await createSession({id:account.id,email:account.email,name:account.name,isPlatformAdmin:false});
  vi.mocked(cookies).mockResolvedValue({get:()=>({value:token})} as unknown as Awaited<ReturnType<typeof cookies>>);
  expect((await requireActiveUser()).userId).toBe(account.id);
  await revokeSession(token);
  await expect(requireActiveUser()).rejects.toThrow("REDIRECT:/login?error=session_expired");
 });
 it("rejects missing cookie",async()=>{
  vi.mocked(cookies).mockResolvedValue({get:()=>undefined} as unknown as Awaited<ReturnType<typeof cookies>>);
  await expect(requireActiveUser()).rejects.toThrow("REDIRECT:/login?error=session_expired");
 });
});
