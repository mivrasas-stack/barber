import { eq, and, desc } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  subscriptionPlans,
  tenantSubscriptions,
  SubscriptionPlanRow,
  TenantSubscriptionRow,
} from "@/infrastructure/database/schema/subscriptions";
import { SubscriptionPlan } from "../domain/subscription-plan";
import { TenantSubscription, SubscriptionStatus } from "../domain/tenant-subscription";
import {
  SubscriptionRepository,
  CreateSubscriptionPlanInput,
  CreateTenantSubscriptionInput,
} from "../domain/subscription-repository.interface";
import { NotFoundError } from "@/shared/errors/app-error";

export class DrizzleSubscriptionRepository implements SubscriptionRepository {
  private toPlanDomain(row: SubscriptionPlanRow): SubscriptionPlan {
    return new SubscriptionPlan({
      id: row.id,
      code: row.code,
      name: row.name,
      audience: row.audience as any,
      description: row.description,
      status: row.status as any,
      billingPeriod: row.billingPeriod as any,
      priceMinor: row.priceMinor,
      currency: row.currency,
      trialDays: row.trialDays,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toSubscriptionDomain(row: TenantSubscriptionRow): TenantSubscription {
    return new TenantSubscription({
      id: row.id,
      tenantId: row.tenantId,
      planId: row.planId,
      status: row.status as SubscriptionStatus,
      startsAt: row.startsAt,
      trialEndsAt: row.trialEndsAt,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findPlanByCode(code: string): Promise<SubscriptionPlan | null> {
    const rows = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.code, code))
      .limit(1);
    if (!rows[0]) return null;
    return this.toPlanDomain(rows[0]);
  }

  async findPlanById(id: string): Promise<SubscriptionPlan | null> {
    const rows = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id))
      .limit(1);
    if (!rows[0]) return null;
    return this.toPlanDomain(rows[0]);
  }

  async listPlans(audience?: "BUSINESS" | "SOLO_PROFESSIONAL" | "ALL"): Promise<SubscriptionPlan[]> {
    if (audience && audience !== "ALL") {
      const rows = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.audience, audience));
      return rows.map((r) => this.toPlanDomain(r));
    }
    const rows = await db.select().from(subscriptionPlans);
    return rows.map((r) => this.toPlanDomain(r));
  }

  async createPlan(input: CreateSubscriptionPlanInput): Promise<SubscriptionPlan> {
    const [row] = await db
      .insert(subscriptionPlans)
      .values({
        code: input.code,
        name: input.name,
        audience: input.audience,
        description: input.description,
        billingPeriod: input.billingPeriod ?? "MONTHLY",
        priceMinor: input.priceMinor,
        currency: input.currency ?? "COP",
        trialDays: input.trialDays ?? 14,
      })
      .returning();
    return this.toPlanDomain(row);
  }

  async findSubscriptionByTenant(tenantId: string): Promise<TenantSubscription | null> {
    const rows = await db
      .select()
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .orderBy(desc(tenantSubscriptions.createdAt))
      .limit(1);
    if (!rows[0]) return null;
    return this.toSubscriptionDomain(rows[0]);
  }

  async createSubscription(input: CreateTenantSubscriptionInput): Promise<TenantSubscription> {
    const now = new Date();
    const trialDays = input.trialDays ?? 14;
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const [row] = await db
      .insert(tenantSubscriptions)
      .values({
        tenantId: input.tenantId,
        planId: input.planId,
        status: input.status ?? "TRIALING",
        startsAt: now,
        trialEndsAt,
      })
      .returning();
    return this.toSubscriptionDomain(row);
  }

  async updateSubscriptionStatus(
    tenantId: string,
    status: SubscriptionStatus
  ): Promise<TenantSubscription> {
    const [row] = await db
      .update(tenantSubscriptions)
      .set({ status, updatedAt: new Date() })
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .returning();
    if (!row) throw new NotFoundError("Tenant subscription not found");
    return this.toSubscriptionDomain(row);
  }

  async changeSubscriptionPlan(
    tenantId: string,
    newPlanId: string
  ): Promise<TenantSubscription> {
    const [row] = await db
      .update(tenantSubscriptions)
      .set({ planId: newPlanId, updatedAt: new Date() })
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .returning();
    if (!row) throw new NotFoundError("Tenant subscription not found");
    return this.toSubscriptionDomain(row);
  }
}
