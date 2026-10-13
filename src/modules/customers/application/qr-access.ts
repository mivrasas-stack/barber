import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { membershipRoles, roles } from "@/infrastructure/database/schema/roles";
import { SESSION_COOKIE_NAME, validateSessionWithDb } from "@/infrastructure/auth/session";
import { ForbiddenError, UnauthenticatedError } from "@/shared/errors/app-error";

export async function requireQrManagement(req:NextRequest) {
 const token=req.cookies.get(SESSION_COOKIE_NAME)?.value;
 const session=token?await validateSessionWithDb(token):null;
 if(!session)throw new UnauthenticatedError();
 const rows=await db.select({tenantId:tenants.id,name:tenants.name,role:roles.name})
 .from(memberships).innerJoin(tenants,eq(memberships.tenantId,tenants.id))
 .innerJoin(membershipRoles,eq(membershipRoles.membershipId,memberships.id))
 .innerJoin(roles,eq(roles.id,membershipRoles.roleId))
 .where(and(eq(memberships.userId,session.userId),eq(memberships.status,"ACTIVE"),eq(tenants.status,"ACTIVE")));
 const selected=req.cookies.get("barber_active_workspace")?.value;
 const allowed=rows.filter(r=>["OWNER","MANAGER","EMPLOYEE"].includes(r.role));
 const workspace=selected?allowed.find(r=>r.tenantId===selected):allowed[0];
 if(!workspace)throw new ForbiddenError("No tienes acceso al directorio de esta barbería");
 return {tenantId:workspace.tenantId,tenantName:workspace.name,actorUserId:session.userId};
}
