import { and, eq, sql, count, isNull } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { users } from "@/infrastructure/database/schema/users";
import { sessions } from "@/infrastructure/database/schema/sessions";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { subscriptionPlans, tenantSubscriptions, subscriptionStatusHistory, subscriptionInvoices } from "@/infrastructure/database/schema/subscriptions";
import { modules, tenantModuleOverrides } from "@/infrastructure/database/schema/modules";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { PasswordHasher } from "@/modules/identity/infrastructure/password-hasher";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors/app-error";
import type { EditGlobalUserInput, AccessChangeInput, ModuleOverrideInput } from "../domain/global-users.schema";
import { resolveAdminGrant } from "./global-users-create";
import { randomBytes } from "node:crypto";

export function assertLastAdminProtected(
  targetIsAdmin:boolean,
  requestedStatus:EditGlobalUserInput["status"],
  requestedAdmin:EditGlobalUserInput["isPlatformAdmin"],
  activeAdminCount:number
) {
  if(targetIsAdmin && (requestedAdmin===false || (requestedStatus!==undefined && requestedStatus!=="ACTIVE")) && activeAdminCount<=1) {
    throw new ConflictError("No se puede desactivar al último administrador activo.");
  }
}
export async function editGlobalUser(id:string,input:EditGlobalUserInput,actorId:string) {
 return db.transaction(async tx=>{
  // Serialize changes to the pool of platform admins, including concurrent demotions.
  await tx.execute(sql`select pg_advisory_xact_lock(98451654)`);
  const [before]=await tx.select().from(users).where(eq(users.id,id)).for("update").limit(1);
  if(!before)throw new NotFoundError("Usuario");
  if(before.isPlatformAdmin && (input.isPlatformAdmin===false || (input.status && input.status!=="ACTIVE"))) {
    const [remaining]=await tx.select({n:count()}).from(users).where(and(eq(users.isPlatformAdmin,true),eq(users.status,"ACTIVE")));
    assertLastAdminProtected(before.isPlatformAdmin,input.status,input.isPlatformAdmin,remaining.n);
  }
  if(input.email && input.email.toLowerCase()!==before.emailNormalized){
    const [duplicate]=await tx.select({id:users.id}).from(users).where(eq(users.emailNormalized,input.email.toLowerCase())).limit(1);
    if(duplicate)throw new ConflictError("El correo está en uso");
  }
  const update:Partial<typeof users.$inferInsert>={updatedAt:new Date()};
  if(input.name!==undefined)update.name=input.name;
  if(input.email!==undefined){update.email=input.email;update.emailNormalized=input.email.toLowerCase();}
  if(input.status!==undefined)update.status=input.status;
  if(input.isPlatformAdmin!==undefined)update.isPlatformAdmin=input.isPlatformAdmin;
  const [after]=await tx.update(users).set(update).where(eq(users.id,id)).returning({
    id:users.id,name:users.name,email:users.email,status:users.status,isPlatformAdmin:users.isPlatformAdmin,
  });
  if((input.status && input.status!=="ACTIVE")||(input.isPlatformAdmin!==undefined && input.isPlatformAdmin!==before.isPlatformAdmin)||input.email!==undefined){
    await tx.update(sessions).set({revokedAt:new Date()}).where(and(eq(sessions.userId,id),isNull(sessions.revokedAt)));
  }
  await tx.insert(auditLogs).values({actorUserId:actorId,action:"PLATFORM_USER_UPDATED",entityType:"USER",entityId:id,
    metadata:{changedFields:Object.keys(input),oldStatus:before.status,newStatus:after.status,
      previousIsPlatformAdmin:before.isPlatformAdmin,isPlatformAdmin:after.isPlatformAdmin}});
  return after;
 });
}
export async function resetGlobalUserPassword(id:string,actorUserId:string) {
 const password=randomBytes(24).toString("base64url");
 const hash=await PasswordHasher.hash(password);
 const account=await db.transaction(async tx=>{
  const [user]=await tx.select({id:users.id,email:users.email}).from(users).where(eq(users.id,id)).for("update").limit(1);
  if(!user)throw new NotFoundError("Usuario");
  await tx.update(users).set({passwordHash:hash,updatedAt:new Date()}).where(eq(users.id,id));
  await tx.update(sessions).set({revokedAt:new Date()}).where(and(eq(sessions.userId,id),isNull(sessions.revokedAt)));
  await tx.insert(auditLogs).values({actorUserId,action:"PLATFORM_USER_CREDENTIAL_RESET",
    entityType:"USER",entityId:id,metadata:{sessionsRevoked:true}});
  return user;
 });
 return {email:account.email,temporaryPassword:password};
}
export async function changeGlobalUserAccess(id:string,input:AccessChangeInput,actorUserId:string) {
 return db.transaction(async tx=>{
  const [member]=await tx.select({id:memberships.id,tenantType:tenants.tenantType})
  .from(memberships).innerJoin(tenants,eq(memberships.tenantId,tenants.id))
  .where(and(eq(memberships.tenantId,input.tenantId),eq(memberships.userId,id))).limit(1);
  if(!member || !["BUSINESS","SOLO_PROFESSIONAL"].includes(member.tenantType))throw new ValidationError("Usuario no es miembro de ese workspace");
  const [subscription]=await tx.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId,input.tenantId)).for("update").limit(1);
  if(!subscription)throw new NotFoundError("Suscripción");
  const [unresolved]=await tx.select({id:subscriptionInvoices.id}).from(subscriptionInvoices)
    .where(and(eq(subscriptionInvoices.subscriptionId,subscription.id),eq(subscriptionInvoices.status,"OPEN"))).limit(1);
  if(unresolved)throw new ConflictError("Existen facturas pendientes; resuélvelas antes de cambiar el plan o conceder acceso manual.");
  let planId=subscription.planId;
  if(input.planCode) {
    const [plan]=await tx.select().from(subscriptionPlans).where(eq(subscriptionPlans.code,input.planCode)).limit(1);
    const audience=member.tenantType;
    if(!plan || plan.status!=="ACTIVE" || (plan.audience!==audience && plan.audience!=="ALL")){
      throw new ValidationError("El plan no corresponde al tipo de negocio");
    }
    planId=plan.id;
  }
  const window=input.grant?resolveAdminGrant(input.grant):null;
  const changes:Partial<typeof tenantSubscriptions.$inferInsert>={planId,updatedAt:new Date()};
  if(window) {
    changes.status="TRIALING";changes.startsAt=window.startsAt;changes.trialEndsAt=window.endsAt;
    changes.currentPeriodStart=window.startsAt;changes.currentPeriodEnd=window.endsAt;
    changes.cancelAtPeriodEnd=true;changes.pastDueAt=null;changes.graceEndsAt=null;changes.suspendedAt=null;
  }
  const [after]=await tx.update(tenantSubscriptions).set(changes).where(eq(tenantSubscriptions.id,subscription.id)).returning({
    id:tenantSubscriptions.id,planId:tenantSubscriptions.planId,status:tenantSubscriptions.status,
    currentPeriodEnd:tenantSubscriptions.currentPeriodEnd,cancelAtPeriodEnd:tenantSubscriptions.cancelAtPeriodEnd,
  });
  await tx.insert(subscriptionStatusHistory).values({
    tenantId:input.tenantId,subscriptionId:subscription.id,
    fromStatus:subscription.status,toStatus:after.status,
    source:"ADMIN_OVERRIDE",actorUserId,reason:"Plan/acceso modificado por administrador de plataforma",
    metadata:{planCode:input.planCode??null,grant:input.grant??null,accessEndsAt:window?.endsAt.toISOString()??null},
  });
  await tx.insert(auditLogs).values({tenantId:input.tenantId,actorUserId,action:"PLATFORM_USER_ACCESS_CHANGED",
    entityType:"USER",entityId:id,metadata:{subscriptionId:subscription.id,planCode:input.planCode??null,
      accessEndsAt:window?.endsAt.toISOString()??null}});
  return after;
 });
}
export async function setGlobalUserModule(id:string,input:ModuleOverrideInput,actorUserId:string) {
 return db.transaction(async tx=>{
  const [membership]=await tx.select({id:memberships.id,tenantType:tenants.tenantType})
    .from(memberships).innerJoin(tenants,eq(memberships.tenantId,tenants.id))
    .where(and(eq(memberships.userId,id),eq(memberships.tenantId,input.tenantId))).limit(1);
  if(!membership || membership.tenantType!=="SOLO_PROFESSIONAL") {
    throw new ValidationError("Los módulos individuales sólo se administran para profesionales independientes");
  }
  const [mod]=await tx.select().from(modules).where(eq(modules.code,input.moduleCode)).limit(1);
  if(!mod || mod.status!=="AVAILABLE")throw new ValidationError("Módulo no disponible");
  if(input.state==="INHERIT"){
    await tx.delete(tenantModuleOverrides).where(and(eq(tenantModuleOverrides.tenantId,input.tenantId),eq(tenantModuleOverrides.moduleId,mod.id)));
  } else {
    await tx.insert(tenantModuleOverrides).values({
      tenantId:input.tenantId,moduleId:mod.id,state:input.state,reason:input.reason,createdByUserId:actorUserId,
    }).onConflictDoUpdate({
      target:[tenantModuleOverrides.tenantId,tenantModuleOverrides.moduleId],
      set:{state:input.state,reason:input.reason,createdByUserId:actorUserId,updatedAt:new Date()},
    });
  }
  await tx.insert(auditLogs).values({tenantId:input.tenantId,actorUserId,
    action:"PLATFORM_USER_MODULE_OVERRIDE",entityType:"USER",entityId:id,
    metadata:{moduleCode:input.moduleCode,state:input.state,reason:input.reason}});
  return {moduleCode:input.moduleCode,state:input.state};
 });
}
