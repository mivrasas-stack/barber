import { afterEach, describe, expect, it, vi } from "vitest";
import { WompiPaymentProvider } from "@/modules/payments/infrastructure/providers/wompi-payment.provider";

describe("Wompi production fail-closed configuration", () => {
  afterEach(() => { vi.unstubAllEnvs(); });
  it("rejects missing production credentials", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WOMPI_PUBLIC_KEY", "");
    vi.stubEnv("WOMPI_PRIVATE_KEY", "");
    vi.stubEnv("WOMPI_INTEGRITY_SECRET", "");
    vi.stubEnv("WOMPI_EVENTS_SECRET", "");
    expect(() => new WompiPaymentProvider()).toThrow("WOMPI_PRODUCTION_CONFIGURATION_REQUIRED");
  });
  it("accepts explicitly provided test keys in staging, with sandbox endpoint", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const provider = new WompiPaymentProvider({
      publicKey: "pub_test_example", privateKey: "prv_test_example",
      integritySecret: "real-synthetic-integrity", eventsSecret: "real-synthetic-events",
      environment: "sandbox",
    });
    expect(provider.calculateIntegritySignature("abc", 100n, "COP")).toMatch(/^[a-f0-9]{64}$/);
  });
  it("rejects an unknown payment environment", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(() => new WompiPaymentProvider({
      environment: "unknown" as "production"
    })).toThrow("WOMPI_ENVIRONMENT_INVALID");
  });
});
