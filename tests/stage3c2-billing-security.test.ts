import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  tenants,
  users,
  roles,
  memberships,
  membershipRoles,
} from "@/infrastructure/database/schema";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { AdminSubscriptionActionsUseCase } from "@/modules/subscriptions/application/admin-subscription-actions.usecase";
import { AttemptSubscriptionPaymentUseCase } from "@/modules/subscriptions/application/attempt-subscription-payment.usecase";

describe("Stage 3C.2 Billing Security, Multi-Tenant Isolation & Role Boundaries", () => {
  const subscriptionRepo = new DrizzleSubscriptionRepository();
  const paymentRepo = new DrizzlePaymentRepository();
  const adminActions = new AdminSubscriptionActionsUseCase(subscriptionRepo);
  const attemptPaymentUseCase = new AttemptSubscriptionPaymentUseCase(subscriptionRepo, paymentRepo);

  let proPlan: any;
  let tenantA: any;
  let tenantB: any;
  let adminUserId: string;

  beforeAll(async () => {
    proPlan = await subscriptionRepo.findPlanByCode("SOLO_PRO");

    const [admin] = await db.select().from(users).limit(1);
    adminUserId = admin.id;

    const [tA] = await db
      .insert(tenants)
      .values({
        slug: `sec-tA-${Date.now()}`,
        name: "Security Tenant A",
        tenantType: "BUSINESS",
      })
      .returning();
    tenantA = tA;

    const [tB] = await db
      .insert(tenants)
      .values({
        slug: `sec-tB-${Date.now()}`,
        name: "Security Tenant B",
        tenantType: "BUSINESS",
      })
      .returning();
    tenantB = tB;
  });

  it("1. Cross-Tenant Invoice Isolation: Tenant A's invoice list strictly excludes Tenant B's invoices", async () => {
    const subA = await subscriptionRepo.createSubscription({
      tenantId: tenantA.id,
      planId: proPlan.id,
      status: "ACTIVE",
    });

    const subB = await subscriptionRepo.createSubscription({
      tenantId: tenantB.id,
      planId: proPlan.id,
      status: "ACTIVE",
    });

    // Create invoice for Tenant A
    const invA = await subscriptionRepo.createInvoice({
      tenantId: tenantA.id,
      subscriptionId: subA.id,
      invoiceNumber: `INV-A-${Date.now()}`,
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
          description: "Plan charge",
          quantity: 1,
          unitPriceMinor: 8900000n,
          amountMinor: 8900000n,
        },
      ],
    });

    // Create invoice for Tenant B
    const invB = await subscriptionRepo.createInvoice({
      tenantId: tenantB.id,
      subscriptionId: subB.id,
      invoiceNumber: `INV-B-${Date.now()}`,
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
          description: "Plan charge",
          quantity: 1,
          unitPriceMinor: 8900000n,
          amountMinor: 8900000n,
        },
      ],
    });

    const listA = await subscriptionRepo.listInvoicesByTenant(tenantA.id);
    const listB = await subscriptionRepo.listInvoicesByTenant(tenantB.id);

    expect(listA.some((i) => i.id === invA.id)).toBe(true);
    expect(listA.some((i) => i.id === invB.id)).toBe(false);

    expect(listB.some((i) => i.id === invB.id)).toBe(true);
    expect(listB.some((i) => i.id === invA.id)).toBe(false);
  });

  it("2. Administrative Suspension & Reactivation Controls", async () => {
    const slug = `sec-admin-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug,
        name: "Admin Control Tenant",
        tenantType: "BUSINESS",
      })
      .returning();

    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: proPlan.id,
      status: "ACTIVE",
    });

    // Admin manually suspends
    const suspendRes = await adminActions.suspendSubscription(
      tenant.id,
      "Compliance audit investigation",
      adminUserId
    );
    expect(suspendRes.status).toBe("SUSPENDED");

    let fresh = await subscriptionRepo.findSubscriptionById(sub.id);
    expect(fresh!.status).toBe("SUSPENDED");
    expect(fresh!.isOperational).toBe(false);

    // Admin reactivates
    const reactivateRes = await adminActions.reactivateSubscription(
      tenant.id,
      "Compliance resolved",
      adminUserId
    );
    expect(reactivateRes.status).toBe("ACTIVE");

    fresh = await subscriptionRepo.findSubscriptionById(sub.id);
    expect(fresh!.status).toBe("ACTIVE");
    expect(fresh!.isOperational).toBe(true);
  });

  it("3. Administrative Trial Extension", async () => {
    const slug = `sec-trial-ext-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug,
        name: "Trial Extension Tenant",
        tenantType: "BUSINESS",
      })
      .returning();

    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: proPlan.id,
      status: "TRIALING",
      trialDays: 14,
    });

    const initialTrialEnd = sub.trialEndsAt!;

    // Admin extends trial by 10 days
    const extRes = await adminActions.extendTrial(tenant.id, 10, adminUserId);
    expect(extRes.newTrialEndsAt.getTime()).toBeGreaterThan(initialTrialEnd.getTime());

    const fresh = await subscriptionRepo.findSubscriptionById(sub.id);
    expect(fresh!.status).toBe("TRIALING");
    expect(fresh!.trialEndsAt).toEqual(extRes.newTrialEndsAt);
  });
});
