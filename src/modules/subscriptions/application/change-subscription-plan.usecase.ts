import { db } from "@/infrastructure/database/client";
import { outboxEvents } from "@/infrastructure/database/schema";
import { SubscriptionRepository } from "../domain/subscription-repository.interface";
import {
  SubscriptionNotFoundError,
  PlanNotFoundError,
  PlanChangeNotAllowedError,
} from "../domain/subscription-errors";

export interface ChangeSubscriptionPlanInput {
  tenantId: string;
  newPlanCodeOrId: string;
  immediate?: boolean;
  actorUserId?: string;
}

export interface ChangeSubscriptionPlanOutput {
  subscriptionId: string;
  tenantId: string;
  currentPlanId: string;
  pendingPlanId?: string | null;
  pendingPlanEffectiveAt?: Date | null;
  effectiveImmediately: boolean;
}

export class ChangeSubscriptionPlanUseCase {
  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  async execute(input: ChangeSubscriptionPlanInput): Promise<ChangeSubscriptionPlanOutput> {
    const sub = await this.subscriptionRepo.findSubscriptionByTenant(input.tenantId);
    if (!sub) {
      throw new SubscriptionNotFoundError(`Subscription for tenant ${input.tenantId} not found`);
    }

    if (sub.status === "CANCELLED") {
      throw new PlanChangeNotAllowedError("Cannot change plan for a cancelled subscription");
    }

    let plan = await this.subscriptionRepo.findPlanById(input.newPlanCodeOrId);
    if (!plan) {
      plan = await this.subscriptionRepo.findPlanByCode(input.newPlanCodeOrId);
    }
    if (!plan) {
      throw new PlanNotFoundError(`Plan ${input.newPlanCodeOrId} not found`);
    }

    if (plan.id === sub.planId && !sub.pendingPlanId) {
      return {
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        currentPlanId: sub.planId,
        pendingPlanId: null,
        pendingPlanEffectiveAt: null,
        effectiveImmediately: false,
      };
    }

    const currentPlan = await this.subscriptionRepo.findPlanById(sub.planId);
    const isUpgrade = currentPlan ? (plan.priceMinor ?? 0) > (currentPlan.priceMinor ?? 0) : true;
    const isTrial = sub.status === "TRIALING";

    // Immediate change if requested, if in trial, or if upgrading
    const shouldBeImmediate = input.immediate ?? (isTrial || isUpgrade);

    if (shouldBeImmediate) {
      await this.subscriptionRepo.updateSubscription(sub.id, {
        planId: plan.id,
        pendingPlanId: null,
        pendingPlanEffectiveAt: null,
      });

      await this.subscriptionRepo.recordStatusHistory({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        fromStatus: sub.status,
        toStatus: sub.status,
        reason: `Plan changed immediately from ${currentPlan?.code ?? "N/A"} to ${plan.code}`,
        source: "TENANT",
        actorUserId: input.actorUserId,
        metadata: {
          previousPlanId: sub.planId,
          newPlanId: plan.id,
          effectiveImmediately: true,
        },
      });

      await db.insert(outboxEvents).values({
        tenantId: sub.tenantId,
        aggregateId: sub.id,
        eventType: "subscription.plan_changed.v1",
        payload: {
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          previousPlanId: sub.planId,
          newPlanId: plan.id,
          planCode: plan.code,
          effectiveImmediately: true,
        },
      });

      return {
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        currentPlanId: plan.id,
        pendingPlanId: null,
        pendingPlanEffectiveAt: null,
        effectiveImmediately: true,
      };
    } else {
      // Scheduled change at period end
      const effectiveAt = sub.currentPeriodEnd ?? new Date();

      await this.subscriptionRepo.updateSubscription(sub.id, {
        pendingPlanId: plan.id,
        pendingPlanEffectiveAt: effectiveAt,
      });

      await this.subscriptionRepo.recordStatusHistory({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        fromStatus: sub.status,
        toStatus: sub.status,
        reason: `Plan downgrade to ${plan.code} scheduled for ${effectiveAt.toISOString()}`,
        source: "TENANT",
        actorUserId: input.actorUserId,
        metadata: {
          previousPlanId: sub.planId,
          pendingPlanId: plan.id,
          effectiveAt: effectiveAt.toISOString(),
          effectiveImmediately: false,
        },
      });

      await db.insert(outboxEvents).values({
        tenantId: sub.tenantId,
        aggregateId: sub.id,
        eventType: "subscription.plan_change_scheduled.v1",
        payload: {
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          pendingPlanId: plan.id,
          effectiveAt: effectiveAt.toISOString(),
        },
      });

      return {
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        currentPlanId: sub.planId,
        pendingPlanId: plan.id,
        pendingPlanEffectiveAt: effectiveAt,
        effectiveImmediately: false,
      };
    }
  }
}
