import { db } from "@/infrastructure/database/client";
import { outboxEvents } from "@/infrastructure/database/schema";
import { SubscriptionRepository } from "../domain/subscription-repository.interface";

export interface ProcessSubscriptionLifecycleInput {
  asOf?: Date;
}

export interface ProcessSubscriptionLifecycleOutput {
  suspendedCount: number;
  cancelledCount: number;
  suspendedTenantIds: string[];
  cancelledTenantIds: string[];
}

export class ProcessSubscriptionLifecycleUseCase {
  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  async execute(input: ProcessSubscriptionLifecycleInput = {}): Promise<ProcessSubscriptionLifecycleOutput> {
    const asOf = input.asOf ?? new Date();
    const suspendedTenantIds: string[] = [];
    const cancelledTenantIds: string[] = [];

    // 1. Dunning & Suspension: Subscriptions whose grace period has ended
    const pastDueSubs = await this.subscriptionRepo.listPastDueSubscriptions(asOf);
    for (const sub of pastDueSubs) {
      if (
        (sub.status === "PAST_DUE" || sub.status === "GRACE_PERIOD") &&
        sub.graceEndsAt &&
        sub.graceEndsAt <= asOf
      ) {
        await this.subscriptionRepo.updateSubscription(sub.id, {
          status: "SUSPENDED",
          suspendedAt: asOf,
        });

        await this.subscriptionRepo.recordStatusHistory({
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          fromStatus: sub.status,
          toStatus: "SUSPENDED",
          reason: "Payment grace period expired without invoice settlement",
          source: "SYSTEM",
        });

        await db.insert(outboxEvents).values({
          tenantId: sub.tenantId,
          aggregateId: sub.id,
          eventType: "subscription.suspended.v1",
          payload: {
            subscriptionId: sub.id,
            tenantId: sub.tenantId,
            suspendedAt: asOf.toISOString(),
            reason: "GRACE_PERIOD_EXPIRED",
          },
        });

        suspendedTenantIds.push(sub.tenantId);
      }
    }

    // 2. Scheduled Cancellations: cancelAtPeriodEnd == true and currentPeriodEnd <= asOf
    const dueSubs = await this.subscriptionRepo.listSubscriptionsDueForBilling(asOf);
    for (const sub of dueSubs) {
      if (
        sub.cancelAtPeriodEnd &&
        sub.currentPeriodEnd &&
        sub.currentPeriodEnd <= asOf &&
        sub.status !== "CANCELLED"
      ) {
        await this.subscriptionRepo.updateSubscription(sub.id, {
          status: "CANCELLED",
        });

        await this.subscriptionRepo.recordStatusHistory({
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          fromStatus: sub.status,
          toStatus: "CANCELLED",
          reason: "Scheduled cancellation reached end of billing period",
          source: "TENANT",
        });

        await db.insert(outboxEvents).values({
          tenantId: sub.tenantId,
          aggregateId: sub.id,
          eventType: "subscription.cancelled.v1",
          payload: {
            subscriptionId: sub.id,
            tenantId: sub.tenantId,
            cancelledAt: asOf.toISOString(),
          },
        });

        cancelledTenantIds.push(sub.tenantId);
      }
    }

    return {
      suspendedCount: suspendedTenantIds.length,
      cancelledCount: cancelledTenantIds.length,
      suspendedTenantIds,
      cancelledTenantIds,
    };
  }
}
