import { SubscriptionRepository } from "../domain/subscription-repository.interface";
import { TenantSubscription } from "../domain/tenant-subscription";
import { SubscriptionPlan } from "../domain/subscription-plan";
import { SubscriptionInvoice } from "../domain/subscription-invoice";

export interface SubscriptionStatusSummary {
  subscription: TenantSubscription | null;
  plan: SubscriptionPlan | null;
  pendingPlan: SubscriptionPlan | null;
  isOperational: boolean;
  warnings: {
    isTrialing: boolean;
    trialDaysRemaining?: number | null;
    isPastDue: boolean;
    isGracePeriod: boolean;
    graceHoursRemaining?: number | null;
    isSuspended: boolean;
    cancelAtPeriodEnd: boolean;
    pendingPlanChange?: {
      planName: string;
      effectiveAt?: Date | null;
    } | null;
  };
  latestInvoices: SubscriptionInvoice[];
}

export class GetSubscriptionStatusUseCase {
  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  async execute(tenantId: string): Promise<SubscriptionStatusSummary> {
    const sub = await this.subscriptionRepo.findSubscriptionByTenant(tenantId);
    if (!sub) {
      return {
        subscription: null,
        plan: null,
        pendingPlan: null,
        isOperational: false,
        warnings: {
          isTrialing: false,
          isPastDue: false,
          isGracePeriod: false,
          isSuspended: false,
          cancelAtPeriodEnd: false,
        },
        latestInvoices: [],
      };
    }

    const [plan, pendingPlan, invoices] = await Promise.all([
      this.subscriptionRepo.findPlanById(sub.planId),
      sub.pendingPlanId ? this.subscriptionRepo.findPlanById(sub.pendingPlanId) : Promise.resolve(null),
      this.subscriptionRepo.listInvoicesByTenant(tenantId),
    ]);

    const now = new Date();
    let trialDaysRemaining: number | null = null;
    if (sub.status === "TRIALING" && sub.trialEndsAt) {
      const diffMs = sub.trialEndsAt.getTime() - now.getTime();
      trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    }

    let graceHoursRemaining: number | null = null;
    if ((sub.status === "PAST_DUE" || sub.status === "GRACE_PERIOD") && sub.graceEndsAt) {
      const diffMs = sub.graceEndsAt.getTime() - now.getTime();
      graceHoursRemaining = Math.max(0, Math.ceil(diffMs / (60 * 60 * 1000)));
    }

    return {
      subscription: sub,
      plan,
      pendingPlan,
      isOperational: sub.isOperational,
      warnings: {
        isTrialing: sub.status === "TRIALING",
        trialDaysRemaining,
        isPastDue: sub.status === "PAST_DUE",
        isGracePeriod: sub.status === "GRACE_PERIOD",
        graceHoursRemaining,
        isSuspended: sub.status === "SUSPENDED",
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        pendingPlanChange: pendingPlan
          ? {
              planName: pendingPlan.name,
              effectiveAt: sub.pendingPlanEffectiveAt,
            }
          : null,
      },
      latestInvoices: invoices.slice(0, 10),
    };
  }
}
