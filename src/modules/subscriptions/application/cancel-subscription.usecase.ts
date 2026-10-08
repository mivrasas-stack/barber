import { db } from "@/infrastructure/database/client";
import { outboxEvents } from "@/infrastructure/database/schema";
import { SubscriptionRepository } from "../domain/subscription-repository.interface";
import {
  SubscriptionNotFoundError,
  SubscriptionAlreadyCancelledError,
} from "../domain/subscription-errors";

export interface CancelSubscriptionInput {
  tenantId: string;
  reason?: string;
  actorUserId?: string;
}

export interface CancelSubscriptionOutput {
  subscriptionId: string;
  tenantId: string;
  cancelAtPeriodEnd: boolean;
  effectiveCancellationDate?: Date | null;
}

export class CancelSubscriptionUseCase {
  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  async execute(input: CancelSubscriptionInput): Promise<CancelSubscriptionOutput> {
    const sub = await this.subscriptionRepo.findSubscriptionByTenant(input.tenantId);
    if (!sub) {
      throw new SubscriptionNotFoundError(`Subscription for tenant ${input.tenantId} not found`);
    }

    if (sub.status === "CANCELLED") {
      throw new SubscriptionAlreadyCancelledError("Subscription is already cancelled");
    }

    await this.subscriptionRepo.updateSubscription(sub.id, {
      cancelAtPeriodEnd: true,
    });

    await this.subscriptionRepo.recordStatusHistory({
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      fromStatus: sub.status,
      toStatus: sub.status,
      reason: input.reason ?? "Tenant requested cancellation at period end",
      source: "TENANT",
      actorUserId: input.actorUserId,
    });

    await db.insert(outboxEvents).values({
      tenantId: sub.tenantId,
      aggregateId: sub.id,
      eventType: "subscription.cancel_scheduled.v1",
      payload: {
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        cancelAtPeriodEnd: true,
        effectiveDate: sub.currentPeriodEnd?.toISOString() ?? null,
      },
    });

    return {
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      cancelAtPeriodEnd: true,
      effectiveCancellationDate: sub.currentPeriodEnd,
    };
  }
}
