import { NextRequest } from "next/server";
import { asc,eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { subscriptionPlans } from "@/infrastructure/database/schema/subscriptions";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { requirePlatformAdmin,noStore,globalUsersError } from "@/modules/platform-admin/application/global-users-http";
export async function GET(req:NextRequest) {
 try {
  await requirePlatformAdmin(req);
  const [plans,workspaces]=await Promise.all([
   db.select({code:subscriptionPlans.code,name:subscriptionPlans.name,audience:subscriptionPlans.audience,priceMinor:subscriptionPlans.priceMinor,currency:subscriptionPlans.currency})
    .from(subscriptionPlans).where(eq(subscriptionPlans.status,"ACTIVE")).orderBy(asc(subscriptionPlans.name)),
   db.select({id:tenants.id,name:tenants.name,type:tenants.tenantType})
    .from(tenants).where(eq(tenants.status,"ACTIVE")).orderBy(asc(tenants.name)).limit(500),
  ]);
  return noStore({data:{plans,workspaces}});
 }catch(e){return globalUsersError(e);}
}
