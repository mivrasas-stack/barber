import { db } from "@/infrastructure/database/client";
import { users } from "@/infrastructure/database/schema/users";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { roles, membershipRoles } from "@/infrastructure/database/schema/roles";
import { staffProfiles } from "@/infrastructure/database/schema/staff";
import {
  professionalProfiles,
  professionalWorkspaces,
} from "@/infrastructure/database/schema/professionals";
import {
  subscriptionPlans,
  tenantSubscriptions,
} from "@/infrastructure/database/schema/subscriptions";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { outboxEvents } from "@/infrastructure/database/schema/outbox";
import { PasswordHasher } from "@/modules/identity/infrastructure/password-hasher";
import { User } from "@/modules/identity/domain/user";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors/app-error";
import { eq, and, isNull } from "drizzle-orm";

export interface ProvisionProfessionalInput {
  userId?: string;
  email?: string;
  name?: string;
  password?: string;
  displayName: string;
  professionalSlug: string;
  workspaceName?: string;
  workspaceSlug?: string;
  planCode?: string;
  bio?: string;
  phonePublic?: string;
  instagram?: string;
  tiktok?: string;
  yearsExperience?: number;
  actorUserId?: string | null;
}

export class ProvisionProfessionalUseCase {
  async execute(input: ProvisionProfessionalInput) {
    // Public self-registration cannot claim an existing account by email.
    // Internal flows may supply a trusted userId after authenticating the caller.
    if (!input.userId && (!input.email || !input.password || input.password.length < 8)) {
      throw new ValidationError("A valid email and password (minimum 8 characters) are required");
    }
    const slug = input.professionalSlug.toLowerCase().trim();
    const wsSlug = (input.workspaceSlug || slug).toLowerCase().trim();
    const displayName = input.displayName.trim();
    const workspaceName = (input.workspaceName || `${displayName} Studio`).trim();
    const planCode = input.planCode || "SOLO_PRO";

    return await db.transaction(async (tx) => {
      // 1. Resolve or Create User
      let targetUserId: string;
      let targetUserEmail: string;

      if (input.userId) {
        const [existingUser] = await tx
          .select()
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1);
        if (!existingUser) throw new NotFoundError("User not found");
        targetUserId = existingUser.id;
        targetUserEmail = existingUser.email;
      } else if (input.email) {
        const normalized = User.normalizeEmail(input.email);
        const [existing] = await tx
          .select()
          .from(users)
          .where(eq(users.emailNormalized, normalized))
          .limit(1);

        if (existing) {
          // Never provision a workspace for an existing account based solely on email.
          throw new ConflictError("This email is already registered. Sign in to continue.");
        } else {
          const passwordHash = await PasswordHasher.hash(input.password!);
          const [newUser] = await tx
            .insert(users)
            .values({
              email: input.email.trim(),
              emailNormalized: normalized,
              name: input.name?.trim() || displayName,
              passwordHash,
              isPlatformAdmin: false,
              status: "ACTIVE",
            })
            .returning();
          targetUserId = newUser.id;
          targetUserEmail = newUser.email;
        }
      } else {
        throw new ValidationError("Either userId or email must be provided");
      }

      // Check if user already has a professional profile
      const [existingProf] = await tx
        .select()
        .from(professionalProfiles)
        .where(eq(professionalProfiles.userId, targetUserId))
        .limit(1);
      if (existingProf) {
        throw new ConflictError("User already has a professional profile");
      }

      // Check slug uniqueness
      const [slugTaken] = await tx
        .select()
        .from(professionalProfiles)
        .where(eq(professionalProfiles.professionalSlug, slug))
        .limit(1);
      if (slugTaken) {
        throw new ConflictError(`Slug '${slug}' is already taken by another professional`);
      }

      // 2. Create Professional Profile
      const [profile] = await tx
        .insert(professionalProfiles)
        .values({
          userId: targetUserId,
          professionalSlug: slug,
          displayName,
          bio: input.bio,
          phonePublic: input.phonePublic,
          instagram: input.instagram,
          tiktok: input.tiktok,
          yearsExperience: input.yearsExperience,
          bookingEnabled: true,
          profileVisibility: "PUBLIC",
        })
        .returning();

      // 3. Create SOLO_PROFESSIONAL Tenant
      const [existingTenantSlug] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.slug, wsSlug))
        .limit(1);

      const finalWsSlug = existingTenantSlug ? `${wsSlug}-${Date.now().toString().slice(-4)}` : wsSlug;

      const [tenant] = await tx
        .insert(tenants)
        .values({
          slug: finalWsSlug,
          name: workspaceName,
          tenantType: "SOLO_PROFESSIONAL",
          status: "ACTIVE",
          defaultCurrency: "COP",
          defaultTimezone: "America/Bogota",
        })
        .returning();

      // 4. Create Professional Workspace Link
      const [workspace] = await tx
        .insert(professionalWorkspaces)
        .values({
          professionalProfileId: profile.id,
          tenantId: tenant.id,
          status: "ACTIVE",
        })
        .returning();

      // 5. Create Owner Membership on the Solo Tenant
      const [membership] = await tx
        .insert(memberships)
        .values({
          tenantId: tenant.id,
          userId: targetUserId,
          status: "ACTIVE",
        })
        .returning();

      // 6. Assign OWNER Role
      const [ownerRole] = await tx
        .select()
        .from(roles)
        .where(and(eq(roles.name, "OWNER"), isNull(roles.tenantId)))
        .limit(1);

      if (ownerRole) {
        await tx.insert(membershipRoles).values({
          membershipId: membership.id,
          roleId: ownerRole.id,
        });
      }

      // 7. Create Operational Staff Profile for this professional in their Solo Tenant
      const [staff] = await tx
        .insert(staffProfiles)
        .values({
          tenantId: tenant.id,
          membershipId: membership.id,
          professionalProfileId: profile.id,
          displayName,
          bio: input.bio,
          status: "ACTIVE",
        })
        .returning();

      // 8. Create Subscription (strictly sourced from subscription_plans in DB)
      const [plan] = await tx
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.code, planCode))
        .limit(1);

      if (!plan) {
        throw new NotFoundError(`Subscription plan '${planCode}' not found`);
      }

      const subPlanId = plan.id;
      const trialDays = plan.trialDays; // Sourced strictly from subscription_plans table

      const now = new Date();
      const trialEndsAt = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;
      const initialStatus = trialDays > 0 ? "TRIALING" : "ACTIVE";

      const [subscription] = await tx
        .insert(tenantSubscriptions)
        .values({
          tenantId: tenant.id,
          planId: subPlanId,
          status: initialStatus,
          startsAt: now,
          trialEndsAt,
        })
        .returning();

      // 9. Audit Log
      await tx.insert(auditLogs).values({
        tenantId: tenant.id,
        actorUserId: input.actorUserId ?? targetUserId,
        action: "PROFESSIONAL_PROVISIONED",
        entityType: "PROFESSIONAL",
        entityId: profile.id,
        metadata: {
          profileId: profile.id,
          slug: profile.professionalSlug,
          workspaceId: tenant.id,
          planCode,
        },
      });

      // 10. Outbox Event
      await tx.insert(outboxEvents).values({
        eventType: "professional.created.v1",
        tenantId: tenant.id,
        aggregateId: profile.id,
        payload: {
          profileId: profile.id,
          userId: targetUserId,
          slug: profile.professionalSlug,
          displayName: profile.displayName,
          workspaceTenantId: tenant.id,
          planCode,
        },
        status: "PENDING",
      });

      return {
        user: { id: targetUserId, email: targetUserEmail },
        profile,
        tenant,
        workspace,
        membership: {
          ...membership,
          role: "OWNER",
        },
        staff,
        subscription,
      };
    });
  }
}
