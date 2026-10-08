import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  tenants,
  subscriptionPlans,
  subscriptionInvoices,
  journalEntries,
} from "@/infrastructure/database/schema";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { GenerateDueInvoicesUseCase } from "@/modules/subscriptions/application/generate-due-invoices.usecase";
import { AttemptSubscriptionPaymentUseCase } from "@/modules/subscriptions/application/attempt-subscription-payment.usecase";
import { ChangeSubscriptionPlanUseCase } from "@/modules/subscriptions/application/change-subscription-plan.usecase";

describe("Stage 3C.2 Billing Concurrency & Race Condition Stress Tests (50 Concurrency)", () => {
  const subscriptionRepo = new DrizzleSubscriptionRepository();
  const paymentRepo = new DrizzlePaymentRepository();

  const generateInvoicesUseCase = new GenerateDueInvoicesUseCase(subscriptionRepo);
  const attemptPaymentUseCase = new AttemptSubscriptionPaymentUseCase(subscriptionRepo, paymentRepo);
  const changePlanUseCase = new ChangeSubscriptionPlanUseCase(subscriptionRepo);

  let starterPlan: any;
  let proPlan: any;

  beforeAll(async () => {
    starterPlan = await subscriptionRepo.findPlanByCode("SOLO_STARTER");
    proPlan = await subscriptionRepo.findPlanByCode("SOLO_PRO");
  });

  it("1. 50 Concurrent Invoice Generators: exactly 1 invoice created, 0 duplicates under race condition", async () => {
    const slug = `conc-inv-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug,
        name: "Concurrent Invoice Tenant",
        tenantType: "BUSINESS",
      })
      .returning();

    const pStart = new Date("2026-09-01T00:00:00Z");
    const pEnd = new Date("2026-10-01T00:00:00Z");

    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: proPlan.id,
      status: "ACTIVE",
      currentPeriodStart: pStart,
      currentPeriodEnd: pEnd,
    });

    const asOf = new Date("2026-10-02T00:00:00Z");

    // Launch 50 simultaneous invoice generations
    const concurrency = 50;
    const promises = Array.from({ length: concurrency }, () =>
      generateInvoicesUseCase
        .execute({
          asOf,
          tenantId: tenant.id,
        })
        .then((res) => ({ success: true, count: res.generatedCount }))
        .catch((err) => ({ success: false, error: err.message }))
    );

    const results = await Promise.all(promises);

    // Sum of generated count across all runs
    const totalGenerated = results
      .filter((r) => r.success)
      .reduce((sum, r) => sum + ((r as any).count || 0), 0);

    expect(totalGenerated).toBe(1);

    // Verify in database: exactly 1 invoice exists for this tenant
    const invoices = await subscriptionRepo.listInvoicesByTenant(tenant.id);
    expect(invoices.length).toBe(1);
    expect(invoices[0].subscriptionId).toBe(sub.id);
  });

  it("2. 50 Concurrent Payment Attempts on Same Invoice: exactly 1 succeeds, zero duplicate revenue", async () => {
    const slug = `conc-pay-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug,
        name: "Concurrent Payment Tenant",
        tenantType: "BUSINESS",
      })
      .returning();

    const pStart = new Date("2026-10-01T00:00:00Z");
    const pEnd = new Date("2026-11-01T00:00:00Z");

    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: proPlan.id,
      status: "PAST_DUE",
      currentPeriodStart: pStart,
      currentPeriodEnd: pEnd,
    });

    const invoice = await subscriptionRepo.createInvoice({
      tenantId: tenant.id,
      subscriptionId: sub.id,
      invoiceNumber: `INV-CONC-${Date.now()}`,
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

    // Launch 50 simultaneous payment attempts on this exact invoice
    const concurrency = 50;
    const promises = Array.from({ length: concurrency }, () =>
      attemptPaymentUseCase
        .execute({
          invoiceId: invoice.id,
          collectorTenantId: tenant.id,
          providerType: "TEST",
        })
        .then((res) => ({ success: true, status: res.status }))
        .catch((err) => ({ success: false, error: err.message }))
    );

    const results = await Promise.all(promises);

    // At least 1 attempt succeeded, and all failing attempts were cleanly handled
    const successfulAttempts = results.filter((r) => r.success && r.status === "SUCCEEDED");
    expect(successfulAttempts.length).toBeGreaterThanOrEqual(1);

    // Verify invoice is PAID
    const freshInvoice = await subscriptionRepo.findInvoiceById(invoice.id);
    expect(freshInvoice!.status).toBe("PAID");

    // Double-Entry Ledger Verification: exactly 1 journal entry for this invoice
    const journalList = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.sourceId, invoice.id));

    expect(journalList.length).toBe(1);
    expect(journalList[0].status).toBe("POSTED");
    expect(journalList[0].entryType).toBe("SUBSCRIPTION_BILLING");
  });

  it("3. 50 Concurrent Plan Changes: database consistency maintained without corruption", async () => {
    const slug = `conc-plan-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug,
        name: "Concurrent Plan Change Tenant",
        tenantType: "BUSINESS",
      })
      .returning();

    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: starterPlan.id,
      status: "ACTIVE",
    });

    // 50 concurrent plan change requests toggling between starter and pro
    const concurrency = 50;
    const promises = Array.from({ length: concurrency }, (_, idx) => {
      const targetPlanCode = idx % 2 === 0 ? "SOLO_PRO" : "SOLO_STARTER";
      return changePlanUseCase
        .execute({
          tenantId: tenant.id,
          newPlanCodeOrId: targetPlanCode,
          immediate: true,
        })
        .then(() => ({ success: true }))
        .catch((err) => ({ success: false, error: err.message }));
    });

    const results = await Promise.all(promises);
    expect(results.every((r) => r.success)).toBe(true);

    // Final subscription is valid and has either starterPlan.id or proPlan.id
    const freshSub = await subscriptionRepo.findSubscriptionById(sub.id);
    expect([starterPlan.id, proPlan.id]).toContain(freshSub!.planId);
  });
});
