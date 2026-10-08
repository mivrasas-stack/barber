import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  tenants,
  modules,
  planModules,
  tenantModuleOverrides,
} from "@/infrastructure/database/schema";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { DrizzleModuleRepository } from "@/modules/modules/infrastructure/drizzle-module.repository";
import { ModuleEntitlementResolver } from "@/modules/modules/application/module-entitlement-resolver";
import { AttemptSubscriptionPaymentUseCase } from "@/modules/subscriptions/application/attempt-subscription-payment.usecase";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";

describe("Stage 3C.2 Entitlements Enforcement & Billing Recovery Access", () => {
  const subscriptionRepo = new DrizzleSubscriptionRepository();
  const moduleRepo = new DrizzleModuleRepository();
  const paymentRepo = new DrizzlePaymentRepository();
  const entitlementResolver = new ModuleEntitlementResolver(moduleRepo, subscriptionRepo);
  const attemptPaymentUseCase = new AttemptSubscriptionPaymentUseCase(subscriptionRepo, paymentRepo);

  let proPlan: any;

  beforeAll(async () => {
    proPlan = await subscriptionRepo.findPlanByCode("SOLO_PRO");
  });

  it("1. Operational State Entitlements: ACTIVE, TRIALING, PAST_DUE and GRACE_PERIOD grant module access", async () => {
    const operationalStatuses = ["ACTIVE", "TRIALING", "PAST_DUE", "GRACE_PERIOD"] as const;

    for (const st of operationalStatuses) {
      const slug = `ent-op-${st.toLowerCase()}-${Date.now()}`;
      const [tenant] = await db
        .insert(tenants)
        .values({
          slug,
          name: `Operational ${st} Tenant`,
          tenantType: "BUSINESS",
        })
        .returning();

      const sub = await subscriptionRepo.createSubscription({
        tenantId: tenant.id,
        planId: proPlan.id,
        status: st,
      });

      expect(sub.isOperational).toBe(true);

      const effective = await entitlementResolver.resolveEffectiveModules(tenant.id);
      // At least some modules from proPlan are enabled
      const enabledModules = effective.filter((m) => m.isEnabled);
      expect(enabledModules.length).toBeGreaterThan(0);
      expect(effective.every((m) => m.source !== "SUBSCRIPTION_REQUIRED")).toBe(true);
    }
  });

  it("2. Suspension Entitlements Denial: SUSPENDED and CANCELLED deny all modules with SUBSCRIPTION_REQUIRED", async () => {
    const lockedStatuses = ["SUSPENDED", "CANCELLED"] as const;

    for (const st of lockedStatuses) {
      const slug = `ent-locked-${st.toLowerCase()}-${Date.now()}`;
      const [tenant] = await db
        .insert(tenants)
        .values({
          slug,
          name: `Locked ${st} Tenant`,
          tenantType: "BUSINESS",
        })
        .returning();

      const sub = await subscriptionRepo.createSubscription({
        tenantId: tenant.id,
        planId: proPlan.id,
        status: st,
      });

      expect(sub.isOperational).toBe(false);

      const effective = await entitlementResolver.resolveEffectiveModules(tenant.id);
      // All modules must be disabled with SUBSCRIPTION_REQUIRED
      expect(effective.every((m) => !m.isEnabled)).toBe(true);
      expect(effective.every((m) => m.source === "SUBSCRIPTION_REQUIRED")).toBe(true);
    }
  });

  it("3. Billing Recovery Paradox: a suspended tenant can access invoices and pay without module lock", async () => {
    const slug = `ent-recovery-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug,
        name: "Recovery Paradox Tenant",
        tenantType: "BUSINESS",
      })
      .returning();

    const pStart = new Date("2026-08-01T00:00:00Z");
    const pEnd = new Date("2026-09-01T00:00:00Z");

    const sub = await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: proPlan.id,
      status: "SUSPENDED",
      suspendedAt: new Date(),
      currentPeriodStart: pStart,
      currentPeriodEnd: pEnd,
    });

    // Verify modules are completely blocked
    const effectiveBefore = await entitlementResolver.resolveEffectiveModules(tenant.id);
    expect(effectiveBefore.every((m) => !m.isEnabled)).toBe(true);

    // Create outstanding invoice
    const invoice = await subscriptionRepo.createInvoice({
      tenantId: tenant.id,
      subscriptionId: sub.id,
      invoiceNumber: `INV-PARADOX-${Date.now()}`,
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
          description: "Monthly SaaS Pro Plan",
          quantity: 1,
          unitPriceMinor: 8900000n,
          amountMinor: 8900000n,
        },
      ],
    });

    // Suspended tenant successfully pays invoice
    const payResult = await attemptPaymentUseCase.execute({
      invoiceId: invoice.id,
      collectorTenantId: tenant.id,
      providerType: "TEST",
    });

    expect(payResult.status).toBe("SUCCEEDED");

    // Subscription status becomes ACTIVE and operational
    const activeSub = await subscriptionRepo.findSubscriptionById(sub.id);
    expect(activeSub!.status).toBe("ACTIVE");
    expect(activeSub!.isOperational).toBe(true);

    // Modules are immediately restored!
    const effectiveAfter = await entitlementResolver.resolveEffectiveModules(tenant.id);
    const restoredModules = effectiveAfter.filter((m) => m.isEnabled);
    expect(restoredModules.length).toBeGreaterThan(0);
  });

  it("4. Precedence Hierarchy: FORCE_DISABLED by admin always overrides plan inclusion", async () => {
    const slug = `ent-hierarchy-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug,
        name: "Hierarchy Test Tenant",
        tenantType: "BUSINESS",
      })
      .returning();

    await subscriptionRepo.createSubscription({
      tenantId: tenant.id,
      planId: proPlan.id,
      status: "ACTIVE",
    });

    // Find a module that proPlan grants
    const planModuleIds = await moduleRepo.listPlanModules(proPlan.id);
    expect(planModuleIds.length).toBeGreaterThan(0);
    const targetModuleId = planModuleIds[0];

    // Verify it is enabled before override
    let effective = await entitlementResolver.resolveEffectiveModules(tenant.id);
    let target = effective.find((m) => m.module.id === targetModuleId);
    expect(target?.isEnabled).toBe(true);

    // Apply Admin FORCE_DISABLED override
    await db.insert(tenantModuleOverrides).values({
      tenantId: tenant.id,
      moduleId: targetModuleId,
      state: "FORCE_DISABLED",
      reason: "Suspended by admin for investigation",
    });

    effective = await entitlementResolver.resolveEffectiveModules(tenant.id);
    target = effective.find((m) => m.module.id === targetModuleId);
    expect(target?.isEnabled).toBe(false);
    expect(target?.source).toBe("DISABLED_BY_ADMIN");
  });
});
