import {NextRequest} from "next/server";
import {and,eq} from "drizzle-orm";
import {db} from "@/infrastructure/database/client";
import {tenants} from "@/infrastructure/database/schema/tenants";
import {memberships} from "@/infrastructure/database/schema/memberships";
import {membershipRoles,roles} from "@/infrastructure/database/schema/roles";
import {SESSION_COOKIE_NAME,validateSessionWithDb} from "@/infrastructure/auth/session";
import {UnauthenticatedError,ForbiddenError} from "@/shared/errors/app-error";
import {ResolveWorkspacesUseCase} from "@/modules/tenancy/application/resolve-workspaces.usecase";

export async function requireStaffAdmin(req:NextRequest){
 const token=req.cookies.get(SESSION_COOKIE_NAME)?.value;
 const session=token?await validateSessionWithDb(token):null;
 if(!session)throw new UnauthenticatedError();

 let tenantId=req.cookies.get("barber_active_workspace")?.value;

 // Existing sessions created before the fix have no workspace cookie. A single
 // active workspace is unambiguous, but NEVER guess among several workspaces.
 if(!tenantId){
  const workspaces=await new ResolveWorkspacesUseCase().execute(session.userId);
  if(workspaces.length!==1){
   throw new ForbiddenError(workspaces.length===0
    ?"No tienes una barbería activa vinculada a tu cuenta."
    :"Selecciona tu barbería desde el selector de espacios de trabajo.");
  }
  tenantId=workspaces[0].id;
 }

 // The client-controlled workspace cookie is a SELECTOR, not authorization.
 // Every request must validate active membership and OWNER/MANAGER role in SQL.
 const rows=await db.select({role:roles.name}).from(memberships)
  .innerJoin(tenants,eq(memberships.tenantId,tenants.id))
  .innerJoin(membershipRoles,eq(membershipRoles.membershipId,memberships.id))
  .innerJoin(roles,eq(roles.id,membershipRoles.roleId))
  .where(and(eq(memberships.userId,session.userId),eq(memberships.tenantId,tenantId),
   eq(memberships.status,"ACTIVE"),eq(tenants.status,"ACTIVE"),eq(tenants.tenantType,"BUSINESS")));
 if(!rows.some(r=>["OWNER","MANAGER"].includes(r.role)))
  throw new ForbiddenError("Solo el propietario o gerente de esta barbería puede administrar barberos.");
 return {tenantId,actorUserId:session.userId};
}
