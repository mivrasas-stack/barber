import { db } from "@/infrastructure/database/client";
import { outboxEvents } from "@/infrastructure/database/schema";
import { SubscriptionRepository } from "../domain/subscription-repository.interface";
import {
  SubscriptionNotFoundError,
  TrialAlreadyExpiredError,
} from "../domain/subscription-errors";

export class AdminSubscriptionActionsUseCase {
  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  async extendTrial(
    tenantId: string,
    additionalDays: number,
    actorUserId?: string
  ): Promise<{ subscriptionId: string; newTrialEndsAt: Date }> {
    const sub = await this.subscriptionRepo.findSubscriptionByTenant(tenantId);
    if (!sub) {
      throw new SubscriptionNotFoundError(`Subscription for tenant ${tenantId} not found`);
    }

    if (sub.status !== "TRIALING" && sub.status !== "PAST_DUE") {
      throw new TrialAlreadyExpiredError("Can only extend trial for trialing or past-due subscriptions");
    }

    const baseDate = sub.trialEndsAt && sub.trialEndsAt > new Date() ? sub.trialEndsAt : new Date();
    const newTrialEndsAt = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    await this.subscriptionRepo.updateSubscription(sub.id, {
      status: "TRIALING",
      trialEndsAt: newTrialEndsAt,
      pastDueAt: null,
      graceEndsAt: null,
    });

    await this.subscriptionRepo.recordStatusHistory({
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      fromStatus: sub.status,
      toStatus: "TRIALING",
      reason: `Platform admin extended trial by ${additionalDays} days until ${newTrialEndsAt.toISOString()}`,
      source: "ADMIN",
      actorUserId,
    });

    await db.insert(outboxEvents).values({
      tenantId: sub.tenantId,
      aggregateId: sub.id,
      eventType: "subscription.trial_extended.v1",
      payload: {
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        additionalDays,
        newTrialEndsAt: newTrialEndsAt.toISOString(),
      },
    });

    return {
      subscriptionId: sub.id,
      newTrialEndsAt,
    };
  }

  async suspendSubscription(
    tenantId: string,
    reason = "Platform administrator manual suspension",
    actorUserId?: string
  ): Promise<{ subscriptionId: string; status: string }> {
    const sub = await this.subscriptionRepo.findSubscriptionByTenant(tenantId);
    if (!sub) {
      throw new SubscriptionNotFoundError(`Subscription for tenant ${tenantId} not found`);
    }

    const now = new Date();
    await this.subscriptionRepo.updateSubscription(sub.id, {
      status: "SUSPENDED",
      suspendedAt: now,
    });

    await this.subscriptionRepo.recordStatusHistory({
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      fromStatus: sub.status,
      toStatus: "SUSPENDED",
      reason,
      source: "ADMIN",
      actorUserId,
    });

    await db.insert(outboxEvents).values({
      tenantId: sub.tenantId,
      aggregateId: sub.id,
      eventType: "subscription.suspended.v1",
      payload: {
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        reason,
        suspendedAt: now.toISOString(),
      },
    });

    return {
      subscriptionId: sub.id,
      status: "SUSPENDED",
    };
  }

  async reactivateSubscription(
    tenantId: string,
    reason = "Platform administrator manual reactivation",
    actorUserId?: string
  ): Promise<{ subscriptionId: string; status: string }> {
    const sub = await this.subscriptionRepo.findSubscriptionByTenant(tenantId);
    if (!sub) {
      throw new SubscriptionNotFoundError(`Subscription for tenant ${tenantId} not found`);
    }

    await this.subscriptionRepo.updateSubscription(sub.id, {
      status: "ACTIVE",
      pastDueAt: null,
      graceEndsAt: null,
      suspendedAt: null,
    });

    await this.subscriptionRepo.recordStatusHistory({
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      fromStatus: sub.status,
      toStatus: "ACTIVE",
      reason,
      source: "ADMIN",
      actorUserId,
    });

    await db.insert(outboxEvents).values({
      tenantId: sub.tenantId,
      aggregateId: sub.id,
      eventType: "subscription.reactivated.v1",
      payload: {
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        reason,
      },
    });

    return {
      subscriptionId: sub.id,
      status: "ACTIVE",
    };
  }
}
