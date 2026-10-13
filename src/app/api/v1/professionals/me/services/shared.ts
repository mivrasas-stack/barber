import { z } from "zod";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { DrizzleAuthorizationRepository } from "@/modules/authorization/infrastructure/drizzle-authorization.repository";
import { ForbiddenError, NotFoundError } from "@/shared/errors/app-error";

export const serviceSchema = z.object({
  name:z.string().trim().min(1).max(255),
  description:z.string().max(5000).optional(),
  duration:z.number().int().min(1).max(1440),
  price:z.number().int().min(0).max(100000000),
});
export async function resolveProfessionalTenant(userId:string,write=false) {
 const repo=new DrizzleProfessionalRepository();
 const profile=await repo.findByUserId(userId);
 if(!profile)throw new NotFoundError("Professional profile");
 const workspace=await repo.findWorkspaceByProfileId(profile.id);
 if(!workspace||workspace.status!=="ACTIVE")throw new ForbiddenError("Active professional workspace required");
 const auth=await new DrizzleAuthorizationRepository().getAuthorizationContext(userId,workspace.tenantId);
 if(!auth||auth.activeTenantId!==workspace.tenantId)throw new ForbiddenError("Active membership required");
 if(write&&!auth.isPlatformAdmin&&!auth.hasRole("OWNER")&&!auth.hasRole("MANAGER")&&!auth.hasPermission("services.manage")){
  throw new ForbiddenError("Service management permission required");
 }
 return workspace.tenantId;
}
