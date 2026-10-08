import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  tenants,
  subscriptionPlans,
  tenantSubscriptions,
  subscriptionInvoices,
} from "@/infrastructure/database/schema";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { ChangeSubscriptionPlanUseCase } from "@/modules/subscriptions/application/change-subscription-plan.usecase";
import { CancelSubscriptionUseCase } from "@/modules/subscriptions/application/cancel-subscription.usecase";
import { ResumeSubscriptionUseCase } from "@/modules/subscriptions/application/resume-subscription.usecase";
import { GenerateDueInvoicesUseCase } from "@/modules/subscriptions/application/generate-due-invoices.usecase";

describe("Stage 3C.2 Subscription Domain, Trials & Plan Management", () => {
  const subscriptionRepo = new DrizzleSubscriptionRepository();
  const changePlanUseCase = new ChangeSubscriptionPlanUseCase(subscriptionRepo);
  const cancelUseCase = new CancelSubscriptionUseCase(subscriptionRepo);
  const resumeUseCase = new ResumeSubscriptionUseCase(subscriptionRepo);
  const generateInvoicesUseCase = new GenerateDueInvoicesUseCase(subscriptionRepo);

  let starterPlan: any;
  let proPlan: any;
  let scalePlan: any;

  beforeAll(async () => {
    starterPlan = await subscriptionRepo.findPlanByCode("SOLO_STARTER");
    proPlan = await subscriptionRepo.findPlanByCode("SOLO_PRO");
    scalePlan = await subscriptionRepo.findPlanByCode("BUSINESS_SCALE");
  });

  it("1. Trial Lifecycle: enforces configured trial duration and supports zero-day trials", async () => {
    // 1A. Standard 14-day trial
    const tenantA = `sub-trial-${Date.now()}-1`;
    const [t1] = await db
      .insert(tenants)
      .values({
        slug: tenantA,
        name: "Trial Barber Shop A",
        tenantType: "BUSINESS",
      })
      .returning();

    const sub1 = await subscriptionRepo.createSubscription({
      tenantId: t1.id,
      planId: starterPlan.id,
      trialDays: 14,
    });

    expect(sub1.status).toBe("TRIALING");
    expect(sub1.trialEndsAt).toBeDefined();
    const expectedTrialEnd = new Date(sub1.startsAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    expect(Math.abs(sub1.trialEndsAt!.getTime() - expectedTrialEnd.getTime())).toBeLessThan(5000);

    // 1B. Zero-day trial (immediate payment required / zero trial)
    const tenantB = `sub-trial-${Date.now()}-2`;
    const [t2] = await db
      .insert(tenants)
      .values({
        slug: tenantB,
        name: "Zero Trial Shop B",
        tenantType: "BUSINESS",
      })
      .returning();

    const sub2 = await subscriptionRepo.createSubscription({
      tenantId: t2.id,
      planId: proPlan.id,
      trialDays: 0,
    });

    expect(sub2.trialEndsAt).toBeNull();
    // Zero-day trial is immediately due for billing
    const dueSubs = await subscriptionRepo.listSubscriptionsDueForBilling(new Date());
    const foundDue = dueSubs.find((s) => s.id === sub2.id);
    expect(foundDue).toBeDefined();
  });

  it("2. Plan Snapshot Immutability: changing plan price does NOT alter existing invoices", async () => {
    const tenantSlug = `sub-snap-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: tenantSlug,
        name: "Snapshot Test Shop",
        tenantType: "BUSINESS",
      })
      .returning();

    // Create custom test plan
    const testPlan = await subscriptionRepo.createPlan({
      code: `SNAP_PLAN_${Date.now()}`,
      name: "Snapshot Plan Initial",
      audience: "BUSINESS",
      billingPeriod: "MONTHLY",
      priceMinor: 5000000, // 50,000 COP
      currency: "COP",
      trialDays: 0,
    });

    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: testPlan.id,
      trialDays: 0,
      currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
    });

    // Generate invoice for this period
    const res = await generateInvoicesUseCase.execute({
      asOf: new Date("2026-02-02T00:00:00Z"),
      tenantId: tenant.id,
    });

    expect(res.generatedCount).toBe(1);
    const invoice = res.invoices[0];
    expect(invoice.totalMinor).toBe(5000000n);
    expect(invoice.planCodeSnapshot).toBe(testPlan.code);
    expect(invoice.planNameSnapshot).toBe("Snapshot Plan Initial");

    // Now mutate plan price in database (e.g. Price Increase to 80,000 COP)
    await subscriptionRepo.updatePlanPrice(testPlan.id, 8000000);

    // Verify invoice remains strictly unchanged (immutability)
    const freshInvoice = await subscriptionRepo.findInvoiceById(invoice.id);
    expect(freshInvoice).not.toBeNull();
    expect(freshInvoice!.totalMinor).toBe(5000000n);
    expect(freshInvoice!.planNameSnapshot).toBe("Snapshot Plan Initial");
    expect(freshInvoice!.lines[0].amountMinor).toBe(5000000n);
  });

  it("3. Plan Changes: immediate upgrade and scheduled downgrade at period end", async () => {
    const tenantSlug = `sub-change-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: tenantSlug,
        name: "Plan Change Shop",
        tenantType: "BUSINESS",
      })
      .returning();

    const periodEnd = new Date("2026-11-01T00:00:00Z");
    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: starterPlan.id,
      status: "ACTIVE",
      startsAt: new Date("2026-10-01T00:00:00Z"),
      currentPeriodStart: new Date("2026-10-01T00:00:00Z"),
      currentPeriodEnd: periodEnd,
    });

    // 3A. Upgrade to BUSINESS_SCALE (immediate upgrade)
    const upgradeRes = await changePlanUseCase.execute({
      tenantId: tenant.id,
      newPlanCodeOrId: scalePlan.code,
      immediate: true,
    });

    expect(upgradeRes.effectiveImmediately).toBe(true);
    expect(upgradeRes.currentPlanId).toBe(scalePlan.id);
    expect(upgradeRes.pendingPlanId).toBeNull();

    const freshSub = await subscriptionRepo.findSubscriptionById(sub.id);
    expect(freshSub!.planId).toBe(scalePlan.id);

    // 3B. Downgrade from BUSINESS_SCALE to SOLO_STARTER (scheduled at period end)
    const downgradeRes = await changePlanUseCase.execute({
      tenantId: tenant.id,
      newPlanCodeOrId: starterPlan.code,
      immediate: false,
    });

    expect(downgradeRes.effectiveImmediately).toBe(false);
    expect(downgradeRes.currentPlanId).toBe(scalePlan.id); // Stays on Scale until period end
    expect(downgradeRes.pendingPlanId).toBe(starterPlan.id);
    expect(downgradeRes.pendingPlanEffectiveAt).toEqual(periodEnd);

    const subWithPending = await subscriptionRepo.findSubscriptionById(sub.id);
    expect(subWithPending!.planId).toBe(scalePlan.id);
    expect(subWithPending!.pendingPlanId).toBe(starterPlan.id);
  });

  it("4. Subscription Cancellation: schedules cancellation at period end and allows resumption", async () => {
    const tenantSlug = `sub-cancel-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: tenantSlug,
        name: "Cancel Test Shop",
        tenantType: "BUSINESS",
      })
      .returning();

    const periodEnd = new Date("2026-12-01T00:00:00Z");
    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: starterPlan.id,
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
    });

    // Schedule cancellation
    const cancelRes = await cancelUseCase.execute({
      tenantId: tenant.id,
      reason: "Moving abroad",
    });

    expect(cancelRes.cancelAtPeriodEnd).toBe(true);
    expect(cancelRes.effectiveCancellationDate).toEqual(periodEnd);

    let current = await subscriptionRepo.findSubscriptionById(sub.id);
    expect(current!.cancelAtPeriodEnd).toBe(true);
    expect(current!.status).toBe("ACTIVE"); // Stays active until period end

    // Resume cancellation
    const resumeRes = await resumeUseCase.execute({
      tenantId: tenant.id,
    });

    expect(resumeRes.cancelAtPeriodEnd).toBe(false);
    expect(resumeRes.status).toBe("ACTIVE");

    current = await subscriptionRepo.findSubscriptionById(sub.id);
    expect(current!.cancelAtPeriodEnd).toBe(false);
  });
});
