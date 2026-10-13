import { describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { POST } from "@/app/api/v1/professionals/register/route";
import { db } from "@/infrastructure/database/client";
import { users } from "@/infrastructure/database/schema/users";
import { professionalProfiles } from "@/infrastructure/database/schema/professionals";

const suffix = () => randomUUID().slice(0, 12);
function register(body: Record<string, unknown>) {
  return POST(new NextRequest("http://localhost/api/v1/professionals/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}
function validBody(unique: string) {
  return {
    email: `new-${unique}@example.test`,
    name: "Security Test",
    displayName: "Security Barber",
    password: "A-safe-password-123!",
    professionalSlug: `security-barber-${unique}`,
    planCode: "SOLO_PRO",
  };
}

describe("Stage 5 — public professional registration security", () => {
  it("does not attach a workspace to an existing account merely by providing its email", async () => {
    const id = suffix();
    const email = `existing-${id}@example.test`;
    const [existing] = await db.insert(users).values({
      email, emailNormalized: email, name: "Existing account",
      passwordHash: "$2a$10$ExistingPasswordHashIsNotRelevantToOwnership",
    }).returning();

    const response = await register({ ...validBody(id), email });
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("CONFLICT");
    const profiles = await db.select().from(professionalProfiles)
      .where(eq(professionalProfiles.userId, existing.id));
    expect(profiles).toHaveLength(0);
  });

  it("rejects missing or weak passwords before provisioning", async () => {
    const id = suffix();
    const body = validBody(id);
    const noPassword = await register({ ...body, password: undefined });
    expect(noPassword.status).toBe(400);
    expect((await noPassword.json()).code).toBe("VALIDATION_ERROR");

    const weakPassword = await register({ ...body, password: "a" });
    expect(weakPassword.status).toBe(400);
    const created = await db.select().from(users).where(eq(users.emailNormalized, body.email));
    expect(created).toHaveLength(0);
  });

  it("rejects userId injection, malformed JSON, and invalid professional slugs", async () => {
    const id = suffix();
    expect((await register({ ...validBody(id), userId: randomUUID() })).status).toBe(400);
    expect((await register({ ...validBody(id), professionalSlug: "../admin" })).status).toBe(400);
    const malformed = await POST(new NextRequest("http://localhost/api/v1/professionals/register", {
      method: "POST", body: "{not-json",
    }));
    expect(malformed.status).toBe(400);
  });

  it("allows new public registration with user, profile and workspace created once", async () => {
    const id = suffix();
    const body = validBody(id);
    const response = await register(body);
    expect(response.status).toBe(201);
    const result = (await response.json()).data;
    expect(result.user.email).toBe(body.email);
    expect(result.profile.professionalSlug).toBe(body.professionalSlug);
    expect(result.tenant.tenantType).toBe("SOLO_PROFESSIONAL");
    expect(result.membership.role).toBe("OWNER");
    expect(result.subscription).toBeTruthy();

    const second = await register(body);
    expect(second.status).toBe(409);
    const matched = await db.select().from(users).where(eq(users.emailNormalized, body.email));
    expect(matched).toHaveLength(1);
  });
});
