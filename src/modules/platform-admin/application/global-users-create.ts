import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { users } from "@/infrastructure/database/schema/users";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { roles, membershipRoles } from "@/infrastructure/database/schema/roles";
import { customerRelationships } from "@/infrastructure/database/schema/professionals";
import { staffProfiles } from "@/infrastructure/database/schema/staff";
import { locations } from "@/infrastructure/database/schema/locations";
import { subscriptionPlans, tenantSubscriptions, subscriptionStatusHistory } from "@/infrastructure/database/schema/subscriptions";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { sessions } from "@/infrastructure/database/schema/sessions";
import { PasswordHasher } from "@/modules/identity/infrastructure/password-hasher";
import { ProvisionProfessionalUseCase } from "@/modules/professionals/application/provision-professional.usecase";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors/app-error";
import { calculateAdminAccessEnd } from "@/modules/professionals/domain/admin-access-duration";
import type { AccessGrant, CreateGlobalUserInput } from "../domain/global-users.schema";

function addMonthsClamped(at: Date, months: number): Date {
  const date = new Date(at);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  date.setUTCDate(Math.min(day,last));
  return date;
}
export function resolveAdminGrant(grant: AccessGrant, now = new Date()) {
  const start = grant.duration === "CUSTOM" && grant.startsAt ? new Date(grant.startsAt) : now;
  if (!Number.isFinite(start.getTime()) || start.getTime() > now.getTime() + 60_000) {
    throw new ValidationError("La fecha de inicio no puede estar en el futuro");
  }
  const end = grant.duration === "CUSTOM" ? new Date(grant.endsAt)
    : grant.duration === "SIX_MONTHS" ? addMonthsClamped(start,6)
    : calculateAdminAccessEnd(start,grant.duration);
  if(!Number.isFinite(end.getTime()) || end <= now || end <= start
    || end.getTime() - now.getTime() > 5*366*86400000) {
    throw new ValidationError("La fecha de vencimiento debe ser futura y no superar cinco años");
  }
  return {startsAt:start,endsAt:end};
}
async function ensurePlan(tx: any, code: string, audience: "BUSINESS"|"SOLO_PROFESSIONAL") {
  const [plan] = await tx.select().from(subscriptionPlans).where(eq(subscriptionPlans.code,code)).limit(1);
  if(!plan || plan.status !== "ACTIVE" || (plan.audience !== audience && plan.audience !== "ALL")) {
    throw new ValidationError("Plan no válido para el tipo de cuenta");
  }
  return plan as typeof subscriptionPlans.$inferSelect;
}
export async function createGlobalUser(input: CreateGlobalUserInput,actorUserId:string) {
  const temporaryPassword = randomBytes(24).toString("base64url");
  const normalized = input.email.toLowerCase().trim();
  if(input.kind === "SOLO") {
    const [plan]=await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code,input.planCode)).limit(1);
    if(!plan||plan.status!=="ACTIVE"||(plan.audience!=="SOLO_PROFESSIONAL"&&plan.audience!=="ALL")) {
      throw new ValidationError("El plan no corresponde a un profesional independiente");
    }
    const {endsAt} = resolveAdminGrant(input.grant);
    // Uses the domain's existing atomic professional / membership provisioning.
    const data = await new ProvisionProfessionalUseCase().execute({
      email:input.email,name:input.name,password:temporaryPassword,
      displayName:input.displayName,professionalSlug:input.slug,
      planCode:input.planCode,actorUserId,adminAccessEndsAt:endsAt,
    });
    return {id:data.user.id,email:data.user.email,temporaryPassword,tenantId:data.tenant.id,accessEndsAt:endsAt.toISOString()};
  }
  const result=await db.transaction(async tx=>{
    const found=await tx.select({id:users.id}).from(users).where(eq(users.emailNormalized,normalized)).limit(1);
    if(found.length) throw new ConflictError("El correo ya está registrado; se debe invitar o vincular de manera autenticada.");
    const passwordHash=await PasswordHasher.hash(temporaryPassword);
    const [account]=await tx.insert(users).values({
      name:input.name,email:input.email,emailNormalized:normalized,passwordHash,
      isPlatformAdmin:input.kind === "PLATFORM_ADMIN",status:"ACTIVE",
    }).returning({id:users.id,email:users.email});
    let tenantId:string | null = null;
    let endsAt:Date | null=null;
    if(input.kind === "CUSTOMER" && input.tenantId) {
      const [tenant]=await tx.select().from(tenants).where(eq(tenants.id,input.tenantId)).limit(1);
      if(!tenant || tenant.status!=="ACTIVE")throw new ValidationError("Barbería seleccionada no disponible");
      await tx.insert(customerRelationships).values({tenantId:tenant.id,customerUserId:account.id});
      tenantId=tenant.id;
    }
    if(input.kind === "EMPLOYEE"){
      const [tenant]=await tx.select().from(tenants).where(eq(tenants.id,input.tenantId)).limit(1);
      if(!tenant || tenant.tenantType !== "BUSINESS" || tenant.status!=="ACTIVE")throw new ValidationError("Barbería seleccionada no disponible");
      const [role]=await tx.select().from(roles).where(and(eq(roles.name,"EMPLOYEE"),isNull(roles.tenantId))).limit(1);
      if(!role)throw new NotFoundError("Plantilla de rol EMPLOYEE");
      const [membership]=await tx.insert(memberships).values({tenantId:tenant.id,userId:account.id}).returning();
      await tx.insert(membershipRoles).values({membershipId:membership.id,roleId:role.id});
      await tx.insert(staffProfiles).values({tenantId:tenant.id,membershipId:membership.id,displayName:input.name});
      tenantId=tenant.id;
    }
    if(input.kind === "BUSINESS") {
      const plan=await ensurePlan(tx,input.planCode,"BUSINESS");
      const window=resolveAdminGrant(input.grant);
      const [tenant]=await tx.insert(tenants).values({
        name:input.businessName,slug:input.slug,tenantType:"BUSINESS",
        status:"ACTIVE",defaultCurrency:"COP",defaultTimezone:"America/Bogota",
      }).returning();
      tenantId=tenant.id;
      const [membership]=await tx.insert(memberships).values({tenantId:tenant.id,userId:account.id}).returning();
      const [ownerRole]=await tx.select().from(roles).where(and(eq(roles.name,"OWNER"),isNull(roles.tenantId))).limit(1);
      if(!ownerRole)throw new NotFoundError("Plantilla de rol OWNER");
      await tx.insert(membershipRoles).values({membershipId:membership.id,roleId:ownerRole.id});
      await tx.insert(locations).values({tenantId:tenant.id,slug:"principal",name:"Sede principal",timezone:"America/Bogota",currency:"COP"});
      const [subscription]=await tx.insert(tenantSubscriptions).values({
        tenantId:tenant.id,planId:plan.id,status:"TRIALING",startsAt:window.startsAt,
        trialEndsAt:window.endsAt,currentPeriodStart:window.startsAt,
        currentPeriodEnd:window.endsAt,cancelAtPeriodEnd:true,
      }).returning();
      await tx.insert(subscriptionStatusHistory).values({
        subscriptionId:subscription.id,tenantId:tenant.id,toStatus:"TRIALING",
        source:"ADMIN_OVERRIDE",actorUserId,reason:"Concesión administrativa de acceso sin cobro automático",
        metadata:{duration:input.grant.duration,accessEndsAt:window.endsAt.toISOString(),planCode:plan.code},
      });
      endsAt=window.endsAt;
    }
    await tx.insert(auditLogs).values({
      actorUserId,tenantId,action:"PLATFORM_USER_CREATED",
      entityType:"USER",entityId:account.id,
      metadata:{kind:input.kind,tenantId,accessEndsAt:endsAt?.toISOString() ?? null},
    });
    return {id:account.id,email:account.email,tenantId,accessEndsAt:endsAt?.toISOString()??null};
  });
  return {...result,temporaryPassword};
}
