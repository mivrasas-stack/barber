import { describe, expect, it, vi } from "vitest";
import type { NotificationProviderMessage } from "@/modules/notifications/domain/notification-channel-provider.interface";
import { ResendEmailProvider } from "@/modules/notifications/infrastructure/resend-email.provider";
import { TwilioMessagingProvider } from "@/modules/notifications/infrastructure/twilio-messaging.provider";

function message(
  channel: "EMAIL" | "SMS" | "WHATSAPP"
): NotificationProviderMessage {
  return {
    deliveryId: "delivery-123",
    idempotencyKey: "delivery-123",
    channel,
    destination:
      channel === "EMAIL" ? "person@example.test" : "+573001234567",
    templateKey: "appointment.created",
    templateVersion: 1,
    locale: "es-CO",
    timezone: "America/Bogota",
    data: { appointmentId: "appt-123" },
    rendered: {
      subject: "Cita creada",
      text: "Tu cita fue creada",
      html: "<p>Tu cita fue creada</p>",
    },
  };
}

describe("Stage 4.3C-B Notification Provider Adapters", () => {
  it("1. Resend sends EMAIL with bearer auth and stable idempotency key", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const provider = new ResendEmailProvider({
      apiKey: "re_test_secret",
      from: "Barber Paradise <notifications@example.com>",
      fetchFn: fetchFn as typeof fetch,
    });

    const result = await provider.send(message("EMAIL"));

    expect(result).toEqual({
      ok: true,
      provider: "RESEND",
      providerMessageId: "email_123",
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer re_test_secret");
    expect(headers["Idempotency-Key"]).toBe("delivery-123");

    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual(["person@example.test"]);
    expect(body.subject).toBe("Cita creada");
    expect(body.html).toContain("Tu cita");
  });

  it("2. Resend 429 is retryable and does not expose provider response text", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          name: "rate_limit_exceeded",
          message: "person@example.test Bearer raw-secret",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    const provider = new ResendEmailProvider({
      apiKey: "re_test_secret",
      from: "notifications@example.com",
      fetchFn: fetchFn as typeof fetch,
    });

    const result = await provider.send(message("EMAIL"));

    expect(result).toEqual({
      ok: false,
      retryable: true,
      error: "RESEND_HTTP_429:rate_limit_exceeded",
      provider: "RESEND",
    });
    expect(JSON.stringify(result)).not.toContain("person@example.test");
    expect(JSON.stringify(result)).not.toContain("raw-secret");
  });

  it("3. Resend permanent 4xx is non-retryable", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ name: "validation_error" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })
    );
    const provider = new ResendEmailProvider({
      apiKey: "re_test_secret",
      from: "notifications@example.com",
      fetchFn: fetchFn as typeof fetch,
    });

    expect(await provider.send(message("EMAIL"))).toEqual({
      ok: false,
      retryable: false,
      error: "RESEND_HTTP_422:validation_error",
      provider: "RESEND",
    });
  });

  it("4. Resend concurrent idempotent 409 is retryable", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ name: "concurrent_idempotent_requests" }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    const provider = new ResendEmailProvider({
      apiKey: "re_test_secret",
      from: "notifications@example.com",
      fetchFn: fetchFn as typeof fetch,
    });

    const result = await provider.send(message("EMAIL"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryable).toBe(true);
    }
  });

  it("5. Resend network exceptions become sanitized retryable failures", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValue(
        new Error("network failure Bearer secret-token person@example.test")
      );
    const provider = new ResendEmailProvider({
      apiKey: "re_test_secret",
      from: "notifications@example.com",
      fetchFn: fetchFn as typeof fetch,
    });

    const result = await provider.send(message("EMAIL"));
    expect(result).toEqual({
      ok: false,
      retryable: true,
      error: "RESEND_NETWORK_ERROR",
      provider: "RESEND",
    });
  });

  it("6. Twilio sends SMS with Basic auth and form-encoded body", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sid: "SM123" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    const provider = new TwilioMessagingProvider({
      accountSid: "AC123",
      apiKeySid: "SK123",
      apiKeySecret: "secret",
      smsFrom: "+15551234567",
      fetchFn: fetchFn as typeof fetch,
    });

    const result = await provider.send(message("SMS"));

    expect(result).toEqual({
      ok: true,
      provider: "TWILIO",
      providerMessageId: "SM123",
    });

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/Accounts/AC123/Messages.json");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from("SK123:secret").toString("base64")}`
    );
    const form = new URLSearchParams(String(init.body));
    expect(form.get("From")).toBe("+15551234567");
    expect(form.get("To")).toBe("+573001234567");
    expect(form.get("Body")).toBe("Tu cita fue creada");
  });

  it("7. Twilio WhatsApp normalizes whatsapp: sender and recipient", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sid: "SMWA123" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    const provider = new TwilioMessagingProvider({
      accountSid: "AC123",
      apiKeySid: "SK123",
      apiKeySecret: "secret",
      whatsappFrom: "+14155238886",
      fetchFn: fetchFn as typeof fetch,
    });

    await provider.send(message("WHATSAPP"));

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    const form = new URLSearchParams(String(init.body));
    expect(form.get("From")).toBe("whatsapp:+14155238886");
    expect(form.get("To")).toBe("whatsapp:+573001234567");
  });

  it("8. Twilio 429 and 5xx are retryable", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 20429 }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 20500 }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      );
    const provider = new TwilioMessagingProvider({
      accountSid: "AC123",
      apiKeySid: "SK123",
      apiKeySecret: "secret",
      smsFrom: "+15551234567",
      fetchFn: fetchFn as typeof fetch,
    });

    const first = await provider.send(message("SMS"));
    const second = await provider.send(message("SMS"));

    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
    if (!first.ok && !second.ok) {
      expect(first.retryable).toBe(true);
      expect(second.retryable).toBe(true);
      expect(first.error).toBe("TWILIO_HTTP_429:20429");
      expect(second.error).toBe("TWILIO_HTTP_503:20500");
    }
  });

  it("9. Twilio permanent 4xx is non-retryable", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 21211 }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    );
    const provider = new TwilioMessagingProvider({
      accountSid: "AC123",
      apiKeySid: "SK123",
      apiKeySecret: "secret",
      smsFrom: "+15551234567",
      fetchFn: fetchFn as typeof fetch,
    });

    const result = await provider.send(message("SMS"));
    expect(result).toEqual({
      ok: false,
      retryable: false,
      error: "TWILIO_HTTP_400:21211",
      provider: "TWILIO",
    });
  });

  it("10. Twilio success without SID is terminal to avoid blind duplicate resend", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "queued" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    const provider = new TwilioMessagingProvider({
      accountSid: "AC123",
      apiKeySid: "SK123",
      apiKeySecret: "secret",
      smsFrom: "+15551234567",
      fetchFn: fetchFn as typeof fetch,
    });

    expect(await provider.send(message("SMS"))).toEqual({
      ok: false,
      retryable: false,
      error: "TWILIO_RESPONSE_MISSING_SID",
      provider: "TWILIO",
    });
  });

  it("11. providers reject unsupported channels without network I/O", async () => {
    const resendFetch = vi.fn();
    const twilioFetch = vi.fn();

    const resend = new ResendEmailProvider({
      apiKey: "re_test",
      from: "notifications@example.com",
      fetchFn: resendFetch as typeof fetch,
    });
    const twilio = new TwilioMessagingProvider({
      accountSid: "AC123",
      apiKeySid: "SK123",
      apiKeySecret: "secret",
      smsFrom: "+15551234567",
      fetchFn: twilioFetch as typeof fetch,
    });

    const resendUnsupported = await resend.send(message("SMS"));
    const twilioUnsupported = await twilio.send(message("EMAIL"));

    expect(resendUnsupported.ok).toBe(false);
    expect(twilioUnsupported.ok).toBe(false);
    expect(resendFetch).not.toHaveBeenCalled();
    expect(twilioFetch).not.toHaveBeenCalled();
  });

  it("12. Twilio requires at least one configured sender", () => {
    expect(
      () =>
        new TwilioMessagingProvider({
          accountSid: "AC123",
          apiKeySid: "SK123",
          apiKeySecret: "secret",
        })
    ).toThrow("TWILIO_SENDER_REQUIRED");
  });
});
