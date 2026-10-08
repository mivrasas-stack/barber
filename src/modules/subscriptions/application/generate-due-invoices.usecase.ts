import { db } from "@/infrastructure/database/client";
import { outboxEvents } from "@/infrastructure/database/schema";
import { SubscriptionRepository } from "../domain/subscription-repository.interface";
import { SubscriptionInvoice } from "../domain/subscription-invoice";

export interface GenerateDueInvoicesInput {
  asOf?: Date;
  tenantId?: string;
}

export interface GenerateDueInvoicesOutput {
  generatedCount: number;
  invoices: SubscriptionInvoice[];
}

export class GenerateDueInvoicesUseCase {
  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  async execute(input: GenerateDueInvoicesInput = {}): Promise<GenerateDueInvoicesOutput> {
    const asOf = input.asOf ?? new Date();
    const generated: SubscriptionInvoice[] = [];

    const subscriptions = input.tenantId
      ? await (async () => {
          const sub = await this.subscriptionRepo.findSubscriptionByTenant(input.tenantId!);
          return sub ? [sub] : [];
        })()
      : await this.subscriptionRepo.listSubscriptionsDueForBilling(asOf);

    for (const sub of subscriptions) {
      // Must not be cancelled
      if (sub.status === "CANCELLED") continue;

      const plan = await this.subscriptionRepo.findPlanById(sub.planId);
      if (!plan) continue;

      // Skip free plans (price 0)
      if ((plan.priceMinor ?? 0) <= 0) continue;

      // Determine billing period
      const periodStart = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : new Date(sub.startsAt);
      const periodEnd = new Date(periodStart);
      if (plan.billingPeriod === "YEARLY") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Check idempotency: invoice for this exact period already generated
      const existing = await this.subscriptionRepo.findInvoiceBySubscriptionAndPeriod(
        sub.id,
        periodStart,
        periodEnd
      );
      if (existing) {
        continue;
      }

      const dueAt = new Date(periodStart);
      const invoiceNumber = `INV-${periodStart.getFullYear()}${String(periodStart.getMonth() + 1).padStart(2, "0")}-${sub.tenantId.slice(0, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const amountMinor = BigInt(plan.priceMinor ?? 0);

      const invoice = await this.subscriptionRepo.createInvoice({
        tenantId: sub.tenantId,
        subscriptionId: sub.id,
        invoiceNumber,
        currency: plan.currency,
        subtotalMinor: amountMinor,
        totalMinor: amountMinor,
        periodStart,
        periodEnd,
        dueAt,
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

      // Emit outbox event
      await db.insert(outboxEvents).values({
        tenantId: sub.tenantId,
        aggregateId: invoice.id,
        eventType: "subscription.invoice.generated.v1",
        payload: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          tenantId: sub.tenantId,
          subscriptionId: sub.id,
          totalMinor: invoice.totalMinor.toString(),
          currency: invoice.currency,
          dueAt: invoice.dueAt.toISOString(),
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
        },
      });

      generated.push(invoice);
    }

    return {
      generatedCount: generated.length,
      invoices: generated,
    };
  }
}
