import {NextRequest} from "next/server";
import {and,eq} from "drizzle-orm";
import {db} from "@/infrastructure/database/client";
import {tenants} from "@/infrastructure/database/schema/tenants";
import {memberships} from "@/infrastructure/database/schema/memberships";
import {membershipRoles,roles} from "@/infrastructure/database/schema/roles";
import {SESSION_COOKIE_NAME,validateSessionWithDb} from "@/infrastructure/auth/session";
import {UnauthenticatedError,ForbiddenError} from "@/shared/errors/app-error";
export async function requireStaffAdmin(req:NextRequest){
 const token=req.cookies.get(SESSION_COOKIE_NAME)?.value;
 const session=token?await validateSessionWithDb(token):null;
 if(!session)throw new UnauthenticatedError();
 const tenantId=req.cookies.get("barber_active_workspace")?.value;
 if(!tenantId)throw new ForbiddenError("Selecciona la barbería activa");
 const rows=await db.select({role:roles.name}).from(memberships)
 .innerJoin(tenants,eq(memberships.tenantId,tenants.id))
 .innerJoin(membershipRoles,eq(membershipRoles.membershipId,memberships.id))
 .innerJoin(roles,eq(roles.id,membershipRoles.roleId))
 .where(and(eq(memberships.userId,session.userId),eq(memberships.tenantId,tenantId),
 eq(memberships.status,"ACTIVE"),eq(tenants.status,"ACTIVE"),eq(tenants.tenantType,"BUSINESS")));
 if(!rows.some(r=>["OWNER","MANAGER"].includes(r.role)))
  throw new ForbiddenError("Sólo el propietario o gerente puede administrar barberos");
 return {tenantId,actorUserId:session.userId};
}
