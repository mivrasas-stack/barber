import { db } from "@/infrastructure/database/client";
import { outboxEvents } from "@/infrastructure/database/schema";
import { SubscriptionRepository } from "../domain/subscription-repository.interface";
import {
  SubscriptionNotFoundError,
  InvalidSubscriptionTransitionError,
} from "../domain/subscription-errors";

export interface ResumeSubscriptionInput {
  tenantId: string;
  actorUserId?: string;
}

export interface ResumeSubscriptionOutput {
  subscriptionId: string;
  tenantId: string;
  cancelAtPeriodEnd: boolean;
  status: string;
}

export class ResumeSubscriptionUseCase {
  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  async execute(input: ResumeSubscriptionInput): Promise<ResumeSubscriptionOutput> {
    const sub = await this.subscriptionRepo.findSubscriptionByTenant(input.tenantId);
    if (!sub) {
      throw new SubscriptionNotFoundError(`Subscription for tenant ${input.tenantId} not found`);
    }

    if (sub.status === "CANCELLED") {
      throw new InvalidSubscriptionTransitionError(
        "Cannot resume a fully cancelled subscription. A new subscription must be created."
      );
    }

    await this.subscriptionRepo.updateSubscription(sub.id, {
      cancelAtPeriodEnd: false,
    });

    await this.subscriptionRepo.recordStatusHistory({
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      fromStatus: sub.status,
      toStatus: sub.status,
      reason: "Tenant resumed subscription, revoking pending cancellation",
      source: "TENANT",
      actorUserId: input.actorUserId,
    });

    await db.insert(outboxEvents).values({
      tenantId: sub.tenantId,
      aggregateId: sub.id,
      eventType: "subscription.resumed.v1",
      payload: {
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        cancelAtPeriodEnd: false,
      },
    });

    return {
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      cancelAtPeriodEnd: false,
      status: sub.status,
    };
  }
}
