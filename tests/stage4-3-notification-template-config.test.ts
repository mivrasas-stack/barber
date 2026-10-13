import { describe, expect, it } from "vitest";
import { listNotificationPolicies } from "@/modules/notifications/application/notification-policy-registry";
import { TransactionalNotificationTemplateRenderer } from "@/modules/notifications/infrastructure/transactional-notification-template.renderer";
import { createConfiguredNotificationProviders } from "@/modules/notifications/infrastructure/notification-provider.factory";

describe("Stage 4.3C-C Notification templates and provider configuration", () => {
  it("1. every registered policy has a renderable v1 template", async () => {
    const renderer = new TransactionalNotificationTemplateRenderer();

    for (const policy of listNotificationPolicies()) {
      const rendered = await renderer.render({
        channel: "EMAIL",
        templateKey: policy.templateKey,
        templateVersion: policy.templateVersion,
        locale: "es-CO",
        data: {
          status: "ACTIVE",
          startsAt: "2030-01-01T10:00:00.000Z",
          reason: "safe reason",
        },
      });

      expect(rendered.subject).toBeTruthy();
      expect(rendered.text.length).toBeGreaterThan(0);
      expect(rendered.html).toContain("<html");
    }
  });

  it("2. SMS output is bounded and excludes HTML", async () => {
    const renderer = new TransactionalNotificationTemplateRenderer();
    const rendered = await renderer.render({
      channel: "SMS",
      templateKey: "appointment.created",
      templateVersion: 1,
      locale: "es-CO",
      data: {
        reason: "x".repeat(1000),
      },
    });

    expect(rendered.subject).toBeUndefined();
    expect(rendered.html).toBeUndefined();
    expect(rendered.text.length).toBeLessThanOrEqual(480);
  });

  it("3. unknown template fails closed", async () => {
    const renderer = new TransactionalNotificationTemplateRenderer();

    await expect(
      renderer.render({
        channel: "EMAIL",
        templateKey: "unknown.template",
        templateVersion: 1,
        locale: "es-CO",
        data: {},
      })
    ).rejects.toThrow("NOTIFICATION_TEMPLATE_NOT_FOUND");
  });

  it("4. unsupported template version fails closed", async () => {
    const renderer = new TransactionalNotificationTemplateRenderer();

    await expect(
      renderer.render({
        channel: "EMAIL",
        templateKey: "appointment.created",
        templateVersion: 99,
        locale: "es-CO",
        data: {},
      })
    ).rejects.toThrow("NOTIFICATION_TEMPLATE_VERSION_UNSUPPORTED");
  });

  it("5. template renderer only emits allowlisted detail keys", async () => {
    const renderer = new TransactionalNotificationTemplateRenderer();
    const rendered = await renderer.render({
      channel: "EMAIL",
      templateKey: "appointment.created",
      templateVersion: 1,
      locale: "es-CO",
      data: {
        startsAt: "2030-01-01T10:00:00.000Z",
        password: "super-secret",
        token: "raw-token",
        internalObject: { should: "never render" },
      },
    });

    const serialized = JSON.stringify(rendered);
    expect(serialized).toContain("2030-01-01");
    expect(serialized).not.toContain("super-secret");
    expect(serialized).not.toContain("raw-token");
    expect(serialized).not.toContain("never render");
  });

  it("6. HTML output escapes dynamic detail values", async () => {
    const renderer = new TransactionalNotificationTemplateRenderer();
    const rendered = await renderer.render({
      channel: "EMAIL",
      templateKey: "appointment.cancelled",
      templateVersion: 1,
      locale: "es-CO",
      data: {
        reason: '<script>alert("x")</script>',
      },
    });

    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
  });

  it("7. empty provider config returns no active providers", () => {
    expect(createConfiguredNotificationProviders({})).toEqual([]);
  });

  it("8. complete Resend config creates EMAIL provider only", () => {
    const providers = createConfiguredNotificationProviders({
      resendApiKey: "re_test",
      resendFromEmail: "notifications@example.com",
    });

    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe("RESEND");
    expect(providers[0].channels).toEqual(["EMAIL"]);
  });

  it("9. partial Resend config fails fast", () => {
    expect(() =>
      createConfiguredNotificationProviders({
        resendApiKey: "re_test",
      })
    ).toThrow("RESEND_CONFIGURATION_INCOMPLETE");
  });

  it("10. Twilio config exposes only configured channels", () => {
    const smsOnly = createConfiguredNotificationProviders({
      twilioAccountSid: "AC123",
      twilioApiKeySid: "SK123",
      twilioApiKeySecret: "secret",
      twilioSmsFrom: "+15551234567",
    });

    expect(smsOnly).toHaveLength(1);
    expect(smsOnly[0].name).toBe("TWILIO");
    expect(smsOnly[0].channels).toEqual(["SMS"]);

    const both = createConfiguredNotificationProviders({
      twilioAccountSid: "AC123",
      twilioApiKeySid: "SK123",
      twilioApiKeySecret: "secret",
      twilioSmsFrom: "+15551234567",
      twilioWhatsappFrom: "+14155238886",
    });
    expect(both[0].channels).toEqual(["SMS", "WHATSAPP"]);
  });

  it("11. partial Twilio credentials fail fast", () => {
    expect(() =>
      createConfiguredNotificationProviders({
        twilioAccountSid: "AC123",
        twilioSmsFrom: "+15551234567",
      })
    ).toThrow("TWILIO_CONFIGURATION_INCOMPLETE");
  });

  it("12. Resend and Twilio can coexist without channel ambiguity", () => {
    const providers = createConfiguredNotificationProviders({
      resendApiKey: "re_test",
      resendFromEmail: "notifications@example.com",
      twilioAccountSid: "AC123",
      twilioApiKeySid: "SK123",
      twilioApiKeySecret: "secret",
      twilioSmsFrom: "+15551234567",
      twilioWhatsappFrom: "+14155238886",
    });

    expect(providers.map((provider) => provider.name).sort()).toEqual([
      "RESEND",
      "TWILIO",
    ]);
    const channels = providers.flatMap((provider) => provider.channels);
    expect(channels).toEqual(expect.arrayContaining(["EMAIL", "SMS", "WHATSAPP"]));
  });
});
