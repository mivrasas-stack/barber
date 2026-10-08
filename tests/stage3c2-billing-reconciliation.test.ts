import { describe, it, expect, beforeAll } from "vitest";
import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  tenants,
  subscriptionPlans,
  subscriptionInvoices,
  journalEntries,
  journalLines,
  financialAccounts,
} from "@/infrastructure/database/schema";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { AttemptSubscriptionPaymentUseCase } from "@/modules/subscriptions/application/attempt-subscription-payment.usecase";
import { STANDARD_ACCOUNT_CODES } from "@/modules/finance/domain/financial-account";

describe("Stage 3C.2 Billing Financial Reconciliation & Double-Entry Ledger Invariants", () => {
  const subscriptionRepo = new DrizzleSubscriptionRepository();
  const paymentRepo = new DrizzlePaymentRepository();
  const attemptPaymentUseCase = new AttemptSubscriptionPaymentUseCase(subscriptionRepo, paymentRepo);

  let proPlan: any;

  beforeAll(async () => {
    proPlan = await subscriptionRepo.findPlanByCode("SOLO_PRO");
  });

  it("1. Invoice-to-Payment Mathematical Equality: invoice total strictly equals payment amount", async () => {
    const slug = `rec-eq-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug,
        name: "Reconciliation Tenant A",
        tenantType: "BUSINESS",
      })
      .returning();

    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: proPlan.id,
      status: "ACTIVE",
    });

    const expectedAmount = 8900000n; // 89,000 COP

    const invoice = await subscriptionRepo.createInvoice({
      tenantId: tenant.id,
      subscriptionId: sub.id,
      invoiceNumber: `INV-REC-EQ-${Date.now()}`,
      currency: "COP",
      subtotalMinor: expectedAmount,
      totalMinor: expectedAmount,
      periodStart: new Date(),
      periodEnd: new Date(),
      dueAt: new Date(),
      planCodeSnapshot: proPlan.code,
      planNameSnapshot: proPlan.name,
      lines: [
        {
          description: "Monthly subscription fee",
          quantity: 1,
          unitPriceMinor: expectedAmount,
          amountMinor: expectedAmount,
        },
      ],
    });

    const payResult = await attemptPaymentUseCase.execute({
      invoiceId: invoice.id,
      collectorTenantId: tenant.id,
      providerType: "TEST",
    });

    expect(payResult.status).toBe("SUCCEEDED");
    expect(BigInt(payResult.amountMinor)).toBe(invoice.totalMinor);
  });

  it("2. Double-Entry Balance Invariant: SUM(DEBIT) === SUM(CREDIT) for all subscription journal entries", async () => {
    // Query all posted SUBSCRIPTION_BILLING journal entries
    const entries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.entryType, "SUBSCRIPTION_BILLING"),
          eq(journalEntries.status, "POSTED")
        )
      );

    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      const lines = await db
        .select()
        .from(journalLines)
        .where(eq(journalLines.journalEntryId, entry.id));

      let totalDebit = 0n;
      let totalCredit = 0n;

      for (const line of lines) {
        if (line.direction === "DEBIT") {
          totalDebit += BigInt(line.amountMinor);
        } else if (line.direction === "CREDIT") {
          totalCredit += BigInt(line.amountMinor);
        }
      }

      // Mathematical invariant: exact equality
      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBeGreaterThan(0n);
    }
  });

  it("3. Platform Revenue Isolation: SaaS revenue posts strictly to 4060 and never contaminates shop revenue", async () => {
    const slug = `rec-iso-${Date.now()}`;
    const [shopTenant] = await db
      .insert(tenants)
      .values({
        slug,
        name: "Isolation Barbershop",
        tenantType: "BUSINESS",
      })
      .returning();

    const sub = await subscriptionRepo.createSubscription({
      tenantId: shopTenant.id,
      planId: proPlan.id,
      status: "ACTIVE",
    });

    const invoice = await subscriptionRepo.createInvoice({
      tenantId: shopTenant.id,
      subscriptionId: sub.id,
      invoiceNumber: `INV-ISO-${Date.now()}`,
      currency: "COP",
      subtotalMinor: 8900000n,
      totalMinor: 8900000n,
      periodStart: new Date(),
      periodEnd: new Date(),
      dueAt: new Date(),
      planCodeSnapshot: proPlan.code,
      planNameSnapshot: proPlan.name,
      lines: [
        {
          description: "Monthly subscription fee",
          quantity: 1,
          unitPriceMinor: 8900000n,
          amountMinor: 8900000n,
        },
      ],
    });

    await attemptPaymentUseCase.execute({
      invoiceId: invoice.id,
      collectorTenantId: shopTenant.id,
      providerType: "TEST",
    });

    // Check lines for this journal entry
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.sourceId, invoice.id))
      .limit(1);

    expect(entry).toBeDefined();

    const linesWithAccounts = await db
      .select({
        direction: journalLines.direction,
        amountMinor: journalLines.amountMinor,
        accountCode: financialAccounts.accountCode,
        accountName: financialAccounts.accountName,
        accountType: financialAccounts.accountType,
      })
      .from(journalLines)
      .innerJoin(financialAccounts, eq(journalLines.financialAccountId, financialAccounts.id))
      .where(eq(journalLines.journalEntryId, entry.id));

    // Must have exactly 2 lines: DEBIT 1060 and CREDIT 4060
    expect(linesWithAccounts.length).toBe(2);

    const debitLine = linesWithAccounts.find((l) => l.direction === "DEBIT");
    const creditLine = linesWithAccounts.find((l) => l.direction === "CREDIT");

    expect(debitLine?.accountCode).toBe(STANDARD_ACCOUNT_CODES.PAYMENT_PROVIDER_CLEARING);
    expect(creditLine?.accountCode).toBe(STANDARD_ACCOUNT_CODES.SAAS_SUBSCRIPTION_REVENUE);
    expect(creditLine?.accountType).toBe("REVENUE");

    // Zero contamination: No lines debit or credit 4010 (Service Revenue) or 4020 (Product Sales Revenue)
    expect(linesWithAccounts.some((l) => l.accountCode === STANDARD_ACCOUNT_CODES.SERVICE_REVENUE)).toBe(false);
    expect(linesWithAccounts.some((l) => l.accountCode === STANDARD_ACCOUNT_CODES.PRODUCT_SALES_REVENUE)).toBe(false);
  });
});
