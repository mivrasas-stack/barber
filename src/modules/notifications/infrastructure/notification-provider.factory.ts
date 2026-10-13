import type { NotificationChannelProvider } from "../domain/notification-channel-provider.interface";
import { ResendEmailProvider } from "./resend-email.provider";
import { TwilioMessagingProvider } from "./twilio-messaging.provider";

export interface NotificationProviderConfig {
  resendApiKey?: string;
  resendFromEmail?: string;
  twilioAccountSid?: string;
  twilioApiKeySid?: string;
  twilioApiKeySecret?: string;
  twilioSmsFrom?: string;
  twilioWhatsappFrom?: string;
}

export function createConfiguredNotificationProviders(
  config: NotificationProviderConfig
): NotificationChannelProvider[] {
  const providers: NotificationChannelProvider[] = [];

  const resendValues = [
    config.resendApiKey,
    config.resendFromEmail,
  ].map(normalizeOptional);
  const hasAnyResend = resendValues.some(Boolean);
  if (hasAnyResend) {
    const [apiKey, from] = resendValues;
    if (!apiKey || !from) {
      throw new Error("RESEND_CONFIGURATION_INCOMPLETE");
    }
    providers.push(
      new ResendEmailProvider({
        apiKey,
        from,
      })
    );
  }

  const twilioValues = [
    config.twilioAccountSid,
    config.twilioApiKeySid,
    config.twilioApiKeySecret,
    config.twilioSmsFrom,
    config.twilioWhatsappFrom,
  ].map(normalizeOptional);
  const hasAnyTwilio = twilioValues.some(Boolean);
  if (hasAnyTwilio) {
    const [
      accountSid,
      apiKeySid,
      apiKeySecret,
      smsFrom,
      whatsappFrom,
    ] = twilioValues;

    if (!accountSid || !apiKeySid || !apiKeySecret) {
      throw new Error("TWILIO_CONFIGURATION_INCOMPLETE");
    }
    if (!smsFrom && !whatsappFrom) {
      throw new Error("TWILIO_SENDER_REQUIRED");
    }

    providers.push(
      new TwilioMessagingProvider({
        accountSid,
        apiKeySid,
        apiKeySecret,
        smsFrom,
        whatsappFrom,
      })
    );
  }

  return providers;
}

function normalizeOptional(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
