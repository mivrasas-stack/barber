import { and, count, eq, ilike, inArray, or, sql, desc } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { users } from "@/infrastructure/database/schema/users";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { membershipRoles, roles } from "@/infrastructure/database/schema/roles";
import { professionalProfiles, professionalWorkspaces, customerRelationships } from "@/infrastructure/database/schema/professionals";
import { tenantSubscriptions, subscriptionPlans, subscriptionStatusHistory } from "@/infrastructure/database/schema/subscriptions";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { NotFoundError } from "@/shared/errors/app-error";
import { ModuleEntitlementResolver } from "@/modules/modules/application/module-entitlement-resolver";
import { DrizzleModuleRepository } from "@/modules/modules/infrastructure/drizzle-module.repository";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import type { GlobalUserListInput } from "../domain/global-users.schema";

// Explicit qualification is mandatory in correlated subqueries; selecting
// a Drizzle column can otherwise render an ambiguous bare "id" reference.
const uid=sql.raw('"users"."id"');
const platformAdmin=sql.raw('"users"."is_platform_admin"');
const kindExpression=sql<string>`CASE
  WHEN ${platformAdmin} THEN 'PLATFORM_ADMIN'
  WHEN EXISTS (SELECT 1 FROM professional_profiles pp WHERE pp.user_id = ${uid}) THEN 'SOLO'
  WHEN EXISTS (SELECT 1 FROM memberships mm JOIN tenants tt ON tt.id=mm.tenant_id JOIN membership_roles mr ON mr.membership_id=mm.id JOIN roles rr ON rr.id=mr.role_id WHERE mm.user_id=${uid} AND tt.tenant_type='BUSINESS' AND rr.name='OWNER') THEN 'BUSINESS'
  WHEN EXISTS (SELECT 1 FROM memberships mm JOIN membership_roles mr ON mr.membership_id=mm.id JOIN roles rr ON rr.id=mr.role_id WHERE mm.user_id=${uid} AND rr.name IN ('EMPLOYEE','MANAGER')) THEN 'EMPLOYEE'
  ELSE 'CUSTOMER'
END`;
export async function listGlobalUsers(input:GlobalUserListInput) {
  const terms=[];
  if(input.q) terms.push(or(ilike(users.name,`%${input.q}%`),ilike(users.emailNormalized,`%${input.q}%`))!);
  if(input.status !== "ALL") terms.push(eq(users.status,input.status));
  if(input.kind!=="ALL") terms.push(sql`${kindExpression} = ${input.kind}`);
  const where=terms.length?and(...terms):undefined;
  const [total]=await db.select({value:count()}).from(users).where(where);
  const rows=await db.select({
    id:users.id,name:users.name,email:users.email,status:users.status,
    kind:kindExpression,isPlatformAdmin:users.isPlatformAdmin,
    createdAt:users.createdAt,lastLoginAt:users.lastLoginAt,emailVerifiedAt:users.emailVerifiedAt,
  }).from(users).where(where).orderBy(desc(users.createdAt)).limit(input.pageSize).offset((input.page-1)*input.pageSize);
  const ids=rows.map(x=>x.id);
  const members=ids.length?await db.select({
    userId:memberships.userId,tenantId:tenants.id,tenantName:tenants.name,tenantType:tenants.tenantType,
    membershipStatus:memberships.status
  }).from(memberships).innerJoin(tenants,eq(memberships.tenantId,tenants.id))
  .where(inArray(memberships.userId,ids)):[];
  const tenantIds=[...new Set(members.map(x=>x.tenantId))];
  const subs=tenantIds.length?await db.select({
    tenantId:tenantSubscriptions.tenantId,status:tenantSubscriptions.status,
    trialEndsAt:tenantSubscriptions.trialEndsAt,currentPeriodEnd:tenantSubscriptions.currentPeriodEnd,
    cancelAtPeriodEnd:tenantSubscriptions.cancelAtPeriodEnd,planCode:subscriptionPlans.code,planName:subscriptionPlans.name,
  }).from(tenantSubscriptions).innerJoin(subscriptionPlans,eq(tenantSubscriptions.planId,subscriptionPlans.id))
  .where(inArray(tenantSubscriptions.tenantId,tenantIds)):[];
  return {total:total.value,page:input.page,pageSize:input.pageSize,items:rows.map(user=>({
    ...user,workspaces:members.filter(m=>m.userId===user.id).map(m=>({...m,subscription:subs.find(s=>s.tenantId===m.tenantId)??null}))
  }))};
}
export async function getGlobalUserDetail(userId:string) {
  const [user]=await db.select({
    id:users.id,name:users.name,email:users.email,status:users.status,isPlatformAdmin:users.isPlatformAdmin,
    lastLoginAt:users.lastLoginAt,createdAt:users.createdAt,emailVerifiedAt:users.emailVerifiedAt,
  }).from(users).where(eq(users.id,userId)).limit(1);
  if(!user)throw new NotFoundError("Usuario");
  const memberRows=await db.select({
    tenantId:tenants.id,tenantName:tenants.name,tenantType:tenants.tenantType,
    tenantStatus:tenants.status,membershipId:memberships.id,membershipStatus:memberships.status,
  }).from(memberships).innerJoin(tenants,eq(memberships.tenantId,tenants.id))
  .where(eq(memberships.userId,userId));
  const relationships=await db.select({
    tenantId:customerRelationships.tenantId,tenantName:tenants.name,status:customerRelationships.status,
    firstSeenAt:customerRelationships.firstSeenAt,lastSeenAt:customerRelationships.lastSeenAt,
  }).from(customerRelationships).innerJoin(tenants,eq(customerRelationships.tenantId,tenants.id))
  .where(eq(customerRelationships.customerUserId,userId));
  const profiles=await db.select({
    slug:professionalProfiles.professionalSlug,displayName:professionalProfiles.displayName,
    tenantId:professionalWorkspaces.tenantId
  }).from(professionalProfiles).leftJoin(professionalWorkspaces,eq(professionalWorkspaces.professionalProfileId,professionalProfiles.id))
  .where(eq(professionalProfiles.userId,userId));
  const roleRows=memberRows.length?await db.select({
    membershipId:membershipRoles.membershipId,roleName:roles.name,
  }).from(membershipRoles).innerJoin(roles,eq(membershipRoles.roleId,roles.id))
  .where(inArray(membershipRoles.membershipId,memberRows.map(x=>x.membershipId))):[];
  const subs=memberRows.length?await db.select({
    id:tenantSubscriptions.id,tenantId:tenantSubscriptions.tenantId,status:tenantSubscriptions.status,
    trialEndsAt:tenantSubscriptions.trialEndsAt,startsAt:tenantSubscriptions.startsAt,
    currentPeriodEnd:tenantSubscriptions.currentPeriodEnd,cancelAtPeriodEnd:tenantSubscriptions.cancelAtPeriodEnd,
    planCode:subscriptionPlans.code,planName:subscriptionPlans.name,
  }).from(tenantSubscriptions).innerJoin(subscriptionPlans,eq(tenantSubscriptions.planId,subscriptionPlans.id))
  .where(inArray(tenantSubscriptions.tenantId,memberRows.map(x=>x.tenantId))):[];
  const resolver=new ModuleEntitlementResolver(new DrizzleModuleRepository(),new DrizzleSubscriptionRepository());
  const workspaces=await Promise.all(memberRows.map(async m=>{
    const effective=await resolver.resolveEffectiveModules(m.tenantId);
    return {...m,roles:roleRows.filter(r=>r.membershipId===m.membershipId).map(r=>r.roleName),
      subscription:subs.find(s=>s.tenantId===m.tenantId)??null,
      modules:effective.map(x=>({code:x.module.code,name:x.module.name,enabled:x.isEnabled,source:x.source,reason:x.reason}))};
  }));
  const events=await db.select({action:auditLogs.action,metadata:auditLogs.metadata,createdAt:auditLogs.createdAt,actorUserId:auditLogs.actorUserId})
    .from(auditLogs).where(and(eq(auditLogs.entityType,"USER"),eq(auditLogs.entityId,userId)))
    .orderBy(desc(auditLogs.createdAt)).limit(50);
  const statuses= subs.length?await db.select({subscriptionId:subscriptionStatusHistory.subscriptionId,toStatus:subscriptionStatusHistory.toStatus,createdAt:subscriptionStatusHistory.createdAt,reason:subscriptionStatusHistory.reason})
    .from(subscriptionStatusHistory).where(inArray(subscriptionStatusHistory.subscriptionId,subs.map(s=>s.id))).orderBy(desc(subscriptionStatusHistory.createdAt)).limit(30):[];
  return {user,workspaces,relationships,profiles,events,statuses};
}
