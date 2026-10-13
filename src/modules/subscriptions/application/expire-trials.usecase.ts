import { db } from "@/infrastructure/database/client";
import { outboxEvents } from "@/infrastructure/database/schema";
import { SubscriptionRepository } from "../domain/subscription-repository.interface";
import { DEFAULT_BILLING_POLICY } from "../domain/billing-policy";

export interface ExpireTrialsInput {
  asOf?: Date;
  tenantId?: string;
}

export interface ExpireTrialsOutput {
  expiredCount: number;
  tenantIds: string[];
}

export class ExpireTrialsUseCase {
  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  async execute(input: ExpireTrialsInput = {}): Promise<ExpireTrialsOutput> {
    const asOf = input.asOf ?? new Date();
    const expiredTenants: string[] = [];

    const candidates = input.tenantId
      ? await (async () => {
          const sub = await this.subscriptionRepo.findSubscriptionByTenant(input.tenantId!);
          return sub && sub.status === "TRIALING" && sub.trialEndsAt && sub.trialEndsAt <= asOf ? [sub] : [];
        })()
      : await this.subscriptionRepo.listTrialsExpiring(asOf);

    for (const sub of candidates) {
      // Administratively granted fixed access must end without generating
      // a paid invoice or extending the account through the payment grace period.
      if (sub.cancelAtPeriodEnd && sub.currentPeriodEnd && sub.currentPeriodEnd <= asOf) {
        await this.subscriptionRepo.updateSubscription(sub.id, {
          status: "CANCELLED",
        });
        await this.subscriptionRepo.recordStatusHistory({
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          fromStatus: "TRIALING",
          toStatus: "CANCELLED",
          reason: "One-time platform administrator access grant expired",
          source: "SYSTEM",
        });
        await db.insert(outboxEvents).values({
          tenantId: sub.tenantId,
          aggregateId: sub.id,
          eventType: "subscription.cancelled.v1",
          payload: {
            subscriptionId: sub.id,
            tenantId: sub.tenantId,
            cancelledAt: asOf.toISOString(),
            reason: "ADMIN_ACCESS_GRANT_EXPIRED",
          },
        });
        expiredTenants.push(sub.tenantId);
        continue;
      }

      const plan = await this.subscriptionRepo.findPlanById(sub.planId);
      if (!plan) continue;

      if ((plan.priceMinor ?? 0) <= 0) {
        // Free plan automatically converts to ACTIVE
        const periodStart = sub.trialEndsAt ?? asOf;
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await this.subscriptionRepo.updateSubscription(sub.id, {
          status: "ACTIVE",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        });

        await this.subscriptionRepo.recordStatusHistory({
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          fromStatus: "TRIALING",
          toStatus: "ACTIVE",
          reason: "Trial completed successfully for free tier",
          source: "SYSTEM",
        });

        expiredTenants.push(sub.tenantId);
        continue;
      }

      // Paid plan: generate invoice and transition to PAST_DUE with grace period
      const periodStart = sub.trialEndsAt ? new Date(sub.trialEndsAt) : new Date(asOf);
      const periodEnd = new Date(periodStart);
      if (plan.billingPeriod === "YEARLY") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const existingInvoice = await this.subscriptionRepo.findInvoiceBySubscriptionAndPeriod(
        sub.id,
        periodStart,
        periodEnd
      );

      let invoiceId = existingInvoice?.id;
      if (!existingInvoice) {
        const invoiceNumber = `INV-${periodStart.getFullYear()}${String(periodStart.getMonth() + 1).padStart(2, "0")}-${sub.tenantId.slice(0, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const amountMinor = BigInt(plan.priceMinor ?? 0);

        const createdInvoice = await this.subscriptionRepo.createInvoice({
          tenantId: sub.tenantId,
          subscriptionId: sub.id,
          invoiceNumber,
          currency: plan.currency,
          subtotalMinor: amountMinor,
          totalMinor: amountMinor,
          periodStart,
          periodEnd,
          dueAt: periodStart,
          planCodeSnapshot: plan.code,
          planNameSnapshot: plan.name,
          billingPeriodSnapshot: plan.billingPeriod,
          lines: [
            {
              description: `Barber Paradise SaaS: ${plan.name} (${plan.billingPeriod})`,
              quantity: 1,
              unitPriceMinor: amountMinor,
              amountMinor: amountMinor,
              lineType: "PLAN_CHARGE",
            },
          ],
        });
        invoiceId = createdInvoice.id;
      }

      const graceEndsAt = new Date(
        asOf.getTime() + DEFAULT_BILLING_POLICY.gracePeriodDays * 24 * 60 * 60 * 1000
      );

      await this.subscriptionRepo.updateSubscription(sub.id, {
        status: "PAST_DUE",
        pastDueAt: asOf,
        graceEndsAt,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      });

      await this.subscriptionRepo.recordStatusHistory({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        fromStatus: "TRIALING",
        toStatus: "PAST_DUE",
        reason: "Trial period expired; awaiting first subscription invoice payment",
        source: "SYSTEM",
      });

      await db.insert(outboxEvents).values({
        tenantId: sub.tenantId,
        aggregateId: sub.id,
        eventType: "subscription.trial_expired.v1",
        payload: {
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          planId: plan.id,
          planCode: plan.code,
          invoiceId,
          graceEndsAt: graceEndsAt.toISOString(),
        },
      });

      expiredTenants.push(sub.tenantId);
    }

    return {
      expiredCount: expiredTenants.length,
      tenantIds: expiredTenants,
    };
  }
}
