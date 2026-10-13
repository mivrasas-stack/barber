import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, validateSessionWithDb } from "@/infrastructure/auth/session";

/** Database-backed enforcement for customer/portal pages, including revoked sessions. */
export async function requireActiveUser() {
 const cookieStore = await cookies();
 const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
 const session = token ? await validateSessionWithDb(token) : null;
 if (!session) redirect("/login?error=session_expired");
 return session;
}
