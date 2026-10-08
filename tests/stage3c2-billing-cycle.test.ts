import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  tenants,
  subscriptionPlans,
  tenantSubscriptions,
  subscriptionInvoices,
  outboxEvents,
} from "@/infrastructure/database/schema";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { GenerateDueInvoicesUseCase } from "@/modules/subscriptions/application/generate-due-invoices.usecase";
import { ExpireTrialsUseCase } from "@/modules/subscriptions/application/expire-trials.usecase";
import { ProcessSubscriptionLifecycleUseCase } from "@/modules/subscriptions/application/process-subscription-lifecycle.usecase";
import { AttemptSubscriptionPaymentUseCase } from "@/modules/subscriptions/application/attempt-subscription-payment.usecase";
import { RunBillingCycleUseCase } from "@/modules/subscriptions/application/run-billing-cycle.usecase";

describe("Stage 3C.2 Billing Cycle, Dunning & Automatic Invoicing", () => {
  const subscriptionRepo = new DrizzleSubscriptionRepository();
  const paymentRepo = new DrizzlePaymentRepository();

  const generateInvoicesUseCase = new GenerateDueInvoicesUseCase(subscriptionRepo);
  const expireTrialsUseCase = new ExpireTrialsUseCase(subscriptionRepo);
  const lifecycleUseCase = new ProcessSubscriptionLifecycleUseCase(subscriptionRepo);
  const attemptPaymentUseCase = new AttemptSubscriptionPaymentUseCase(subscriptionRepo, paymentRepo);
  const runBillingCycleUseCase = new RunBillingCycleUseCase(subscriptionRepo);

  let proPlan: any;

  beforeAll(async () => {
    proPlan = await subscriptionRepo.findPlanByCode("SOLO_PRO");
  });

  it("1. Invoice Generation & Period Uniqueness: never duplicates an invoice for the same period", async () => {
    const tenantSlug = `billing-gen-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: tenantSlug,
        name: "Cycle Billing Shop",
        tenantType: "BUSINESS",
      })
      .returning();

    const pStart = new Date("2026-03-01T00:00:00Z");
    const pEnd = new Date("2026-04-01T00:00:00Z");

    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: proPlan.id,
      status: "ACTIVE",
      currentPeriodStart: pStart,
      currentPeriodEnd: pEnd,
    });

    // Run 1: generate due invoice as of 2026-04-02
    const run1 = await generateInvoicesUseCase.execute({
      asOf: new Date("2026-04-02T00:00:00Z"),
      tenantId: tenant.id,
    });

    expect(run1.generatedCount).toBe(1);
    const invoice1 = run1.invoices[0];
    expect(invoice1.periodStart).toEqual(pEnd);

    // Run 2: immediately rerun for the same asOf date
    const run2 = await generateInvoicesUseCase.execute({
      asOf: new Date("2026-04-02T00:00:00Z"),
      tenantId: tenant.id,
    });

    // Idempotent: 0 invoices generated, no duplicates
    expect(run2.generatedCount).toBe(0);

    const allInvoices = await subscriptionRepo.listInvoicesByTenant(tenant.id);
    expect(allInvoices.length).toBe(1);
  });

  it("2. Trial Expiration to Past-Due with Grace Period", async () => {
    const tenantSlug = `billing-trial-exp-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: tenantSlug,
        name: "Expiring Trial Shop",
        tenantType: "BUSINESS",
      })
      .returning();

    const trialEndsAt = new Date("2026-05-15T00:00:00Z");
    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: proPlan.id,
      status: "TRIALING",
      startsAt: new Date("2026-05-01T00:00:00Z"),
      trialEndsAt,
    });

    // Run trial expiration as of 2026-05-16 (past trial end)
    const result = await expireTrialsUseCase.execute({
      asOf: new Date("2026-05-16T00:00:00Z"),
      tenantId: tenant.id,
    });

    expect(result.expiredCount).toBe(1);

    const freshSub = await subscriptionRepo.findSubscriptionById(sub.id);
    expect(freshSub!.status).toBe("PAST_DUE");
    expect(freshSub!.pastDueAt).toBeDefined();
    expect(freshSub!.graceEndsAt).toBeDefined();
    expect(freshSub!.isOperational).toBe(true); // Still operational during past due / grace period

    // An opening invoice should have been created
    const invoices = await subscriptionRepo.listInvoicesByTenant(tenant.id);
    expect(invoices.length).toBe(1);
    expect(invoices[0].status).toBe("OPEN");
  });

  it("3. Dunning to Suspension: grace period expiration triggers automatic SUSPENDED status", async () => {
    const tenantSlug = `billing-suspend-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: tenantSlug,
        name: "Suspension Test Shop",
        tenantType: "BUSINESS",
      })
      .returning();

    const graceEndsAt = new Date("2026-06-05T00:00:00Z");
    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: proPlan.id,
      status: "PAST_DUE",
      pastDueAt: new Date("2026-06-01T00:00:00Z"),
      graceEndsAt,
    });

    // Process lifecycle before grace ends (e.g. June 4) -> no suspension
    await lifecycleUseCase.execute({ asOf: new Date("2026-06-04T00:00:00Z") });
    let freshSub = await subscriptionRepo.findSubscriptionById(sub.id);
    expect(freshSub!.status).toBe("PAST_DUE");
    expect(freshSub!.isOperational).toBe(true);

    // Process lifecycle after grace ends (e.g. June 6) -> SUSPENDED
    const suspendResult = await lifecycleUseCase.execute({ asOf: new Date("2026-06-06T00:00:00Z") });
    expect(suspendResult.suspendedTenantIds).toContain(tenant.id);

    freshSub = await subscriptionRepo.findSubscriptionById(sub.id);
    expect(freshSub!.status).toBe("SUSPENDED");
    expect(freshSub!.suspendedAt).toBeDefined();
    expect(freshSub!.isOperational).toBe(false); // Locked out from operational features
  });

  it("4. Payment Recovery: settling invoice immediately reactivates suspended subscription", async () => {
    const tenantSlug = `billing-recovery-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: tenantSlug,
        name: "Recovery Test Shop",
        tenantType: "BUSINESS",
      })
      .returning();

    const pStart = new Date("2026-07-01T00:00:00Z");
    const pEnd = new Date("2026-08-01T00:00:00Z");

    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: proPlan.id,
      status: "SUSPENDED",
      suspendedAt: new Date("2026-07-10T00:00:00Z"),
      currentPeriodStart: pStart,
      currentPeriodEnd: pEnd,
    });

    expect(sub.isOperational).toBe(false);

    // Create an open invoice for this subscription
    const invoice = await subscriptionRepo.createInvoice({
      tenantId: tenant.id,
      subscriptionId: sub.id,
      invoiceNumber: `INV-REC-${Date.now()}`,
      currency: "COP",
      subtotalMinor: 8900000n,
      totalMinor: 8900000n,
      periodStart: pStart,
      periodEnd: pEnd,
      dueAt: pStart,
      planCodeSnapshot: proPlan.code,
      planNameSnapshot: proPlan.name,
      lines: [
        {
          description: "Monthly subscription",
          quantity: 1,
          unitPriceMinor: 8900000n,
          amountMinor: 8900000n,
        },
      ],
    });

    // Pay the invoice using AttemptSubscriptionPaymentUseCase (TEST provider settles immediately)
    const payResult = await attemptPaymentUseCase.execute({
      invoiceId: invoice.id,
      collectorTenantId: tenant.id,
      providerType: "TEST",
    });

    expect(payResult.status).toBe("SUCCEEDED");

    // Verify invoice is PAID
    const freshInvoice = await subscriptionRepo.findInvoiceById(invoice.id);
    expect(freshInvoice!.status).toBe("PAID");
    expect(freshInvoice!.paidAt).toBeDefined();

    // Verify subscription is automatically REACTIVATED
    const freshSub = await subscriptionRepo.findSubscriptionById(sub.id);
    expect(freshSub!.status).toBe("ACTIVE");
    expect(freshSub!.isOperational).toBe(true);
    expect(freshSub!.suspendedAt).toBeNull();
    expect(freshSub!.pastDueAt).toBeNull();
    expect(freshSub!.graceEndsAt).toBeNull();
  });
});
