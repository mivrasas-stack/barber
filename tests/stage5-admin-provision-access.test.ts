import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { users } from "@/infrastructure/database/schema/users";
import { subscriptionInvoices } from "@/infrastructure/database/schema/subscriptions";
import { POST } from "@/app/api/v1/admin/independent-professionals/route";
import { createSession, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { PasswordHasher } from "@/modules/identity/infrastructure/password-hasher";
import { calculateAdminAccessEnd } from "@/modules/professionals/domain/admin-access-duration";
import { DrizzleSubscriptionRepository } from "@/modules/subscriptions/infrastructure/drizzle-subscription.repository";
import { DrizzleModuleRepository } from "@/modules/modules/infrastructure/drizzle-module.repository";
import { ModuleEntitlementResolver } from "@/modules/modules/application/module-entitlement-resolver";
import { ExpireTrialsUseCase } from "@/modules/subscriptions/application/expire-trials.usecase";
import { GenerateDueInvoicesUseCase } from "@/modules/subscriptions/application/generate-due-invoices.usecase";

const suffix = () => randomUUID().slice(0, 11);
let adminCookie: string;
let memberCookie: string;

const payload = (duration: "DAY" | "MONTH" | "YEAR") => {
  const id = suffix();
  return {
    email: `qa-admin-grant-${id}@example.test`,
    name: "QA Person " + id,
    displayName: "QA Professional " + id,
    professionalSlug: "qa-grant-" + id,
    planCode: "SOLO_PRO",
    accessDuration: duration,
  };
};

function post(body: Record<string, unknown>, cookie?: string) {
  return POST(new NextRequest("http://localhost/api/v1/admin/independent-professionals", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  }));
}

describe("Platform Admin professional provisioning - credentials and exact access", () => {
  beforeAll(async () => {
    if (process.env.NODE_ENV === "production") throw new Error("Test must not use production environment");
    const id = suffix();
    const [admin, member] = await db.insert(users).values([
      { email: `qa-platform-${id}@example.test`, emailNormalized: `qa-platform-${id}@example.test`, name: "QA Platform Admin", isPlatformAdmin: true, passwordHash: "qa" },
      { email: `qa-member-${id}@example.test`, emailNormalized: `qa-member-${id}@example.test`, name: "QA Member", isPlatformAdmin: false, passwordHash: "qa" },
    ]).returning();
    adminCookie = `${SESSION_COOKIE_NAME}=${(await createSession({ id:admin.id, email:admin.email, name:admin.name, isPlatformAdmin:true })).token}`;
    memberCookie = `${SESSION_COOKIE_NAME}=${(await createSession({ id:member.id, email:member.email, name:member.name, isPlatformAdmin:false })).token}`;
  });

  it("rejects unauthenticated and non-admin requests without creating accounts", async () => {
    expect((await post(payload("DAY"))).status).toBe(401);
    expect((await post(payload("DAY"), memberCookie)).status).toBe(403);
  });

  it("rejects identity injection and duration tampering", async () => {
    expect((await post({ ...payload("DAY"), userId: randomUUID() }, adminCookie)).status).toBe(400);
    expect((await post({ ...payload("DAY"), password: "attacker-set-password" }, adminCookie)).status).toBe(400);
    expect((await post({ ...payload("DAY"), accessDuration: "DECADE" }, adminCookie)).status).toBe(400);
    expect((await post({ ...payload("DAY"), professionalSlug: "../admin" }, adminCookie)).status).toBe(400);
  });

  for (const duration of ["DAY", "MONTH", "YEAR"] as const) {
    it(`generates a secure password and an exact non-renewing ${duration} access grant`, async () => {
      const form = payload(duration);
      const response = await post(form, adminCookie);
      expect(response.status).toBe(201);
      expect(response.headers.get("cache-control")).toContain("no-store");
      const json = await response.json();
      expect(json.credentials.email).toBe(form.email);
      expect(json.credentials.temporaryPassword).toMatch(/^[A-Za-z0-9_-]{32}$/);
      expect(json.credentials.temporaryPassword).not.toContain(form.name);
      const subscription = json.data.subscription;
      expect(subscription.status).toBe("TRIALING");
      expect(subscription.cancelAtPeriodEnd).toBe(true);
      const expected = calculateAdminAccessEnd(new Date(subscription.startsAt), duration);
      expect(new Date(subscription.trialEndsAt).toISOString()).toBe(expected.toISOString());
      expect(new Date(subscription.currentPeriodEnd).toISOString()).toBe(expected.toISOString());
      expect(json.accessEndsAt).toBe(expected.toISOString());

      const [created] = await db.select().from(users).where(eq(users.emailNormalized, form.email));
      expect(created.name).toBe(form.name);
      expect(created.passwordHash).not.toBe(json.credentials.temporaryPassword);
      expect(await PasswordHasher.compare(json.credentials.temporaryPassword, created.passwordHash!)).toBe(true);

      const repeat = await post(form, adminCookie);
      expect(repeat.status).toBe(409);
      expect((await repeat.json()).credentials).toBeUndefined();
    });
  }

  it("expires a one-time grant without charging or prolonging access through billing grace", async () => {
    const response = await post(payload("DAY"), adminCookie);
    expect(response.status).toBe(201);
    const json = await response.json();
    const tenantId = json.data.tenant.id;
    const subscriptionId = json.data.subscription.id;
    const subRepo = new DrizzleSubscriptionRepository();
    const before = await subRepo.findSubscriptionByTenant(tenantId);
    expect(before?.isOperational).toBe(true);
    expect(before?.cancelAtPeriodEnd).toBe(true);

    const future = new Date(new Date(json.accessEndsAt).getTime() + 1000);
    const due = await new GenerateDueInvoicesUseCase(subRepo).execute({ asOf: future, tenantId });
    expect(due.generatedCount).toBe(0);

    const expired = await new ExpireTrialsUseCase(subRepo).execute({ asOf: future, tenantId });
    expect(expired.expiredCount).toBe(1);
    const after = await subRepo.findSubscriptionByTenant(tenantId);
    expect(after?.status).toBe("CANCELLED");
    expect(after?.isOperational).toBe(false);
    const modules = await new ModuleEntitlementResolver(new DrizzleModuleRepository(), subRepo).resolveEffectiveModules(tenantId);
    expect(modules.length).toBeGreaterThan(0);
    expect(modules.every((item) => !item.isEnabled)).toBe(true);
    const invoices = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.subscriptionId, subscriptionId));
    expect(invoices).toHaveLength(0);
  });

  it("clamps month and leap-year dates correctly", () => {
    expect(calculateAdminAccessEnd(new Date("2026-01-31T12:30:00Z"), "MONTH").toISOString()).toBe("2026-02-28T12:30:00.000Z");
    expect(calculateAdminAccessEnd(new Date("2028-02-29T12:30:00Z"), "YEAR").toISOString()).toBe("2029-02-28T12:30:00.000Z");
    expect(calculateAdminAccessEnd(new Date("2026-10-13T13:00:00Z"), "DAY").toISOString()).toBe("2026-10-14T13:00:00.000Z");
  });
});
