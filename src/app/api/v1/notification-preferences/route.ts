import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DrizzleNotificationInboxRepository } from "@/modules/notifications/infrastructure/drizzle-notification-inbox.repository";
import {
  assertNotificationTenantAccess,
  requireNotificationSession,
} from "@/modules/notifications/infrastructure/notification-api-auth";
import { notificationApiError } from "@/modules/notifications/infrastructure/notification-api-error";
import { ValidationError } from "@/shared/errors/app-error";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

const preferenceSchema = z.object({
  tenantId: z.string().uuid().nullable().default(null),
  category: z.string().trim().min(1).max(64),
  inAppEnabled: z.boolean().default(true),
  emailEnabled: z.boolean().default(true),
  smsEnabled: z.boolean().default(false),
  whatsappEnabled: z.boolean().default(false),
  quietHoursEnabled: z.boolean().default(false),
  quietHoursStart: z.string().regex(timePattern).nullable().default(null),
  quietHoursEnd: z.string().regex(timePattern).nullable().default(null),
  timezone: z.string().trim().min(1).max(100).nullable().default(null),
  locale: z.string().trim().min(2).max(16).nullable().default(null),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireNotificationSession(request);
    const tenantParam = request.nextUrl.searchParams.get("tenantId");
    const tenantId =
      tenantParam === "global" ? null : tenantParam || undefined;

    if (typeof tenantId === "string") {
      await assertNotificationTenantAccess(
        session.userId,
        tenantId,
        session.isPlatformAdmin
      );
    }

    const repository = new DrizzleNotificationInboxRepository();
    const preferences = await repository.listPreferences(
      session.userId,
      tenantId
    );

    return NextResponse.json({ data: preferences });
  } catch (error) {
    return notificationApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireNotificationSession(request);
    const parsed = preferenceSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid notification preference",
        parsed.error.flatten()
      );
    }

    const input = parsed.data;
    if (input.tenantId) {
      await assertNotificationTenantAccess(
        session.userId,
        input.tenantId,
        session.isPlatformAdmin
      );
    }

    if (
      input.quietHoursEnabled &&
      (!input.quietHoursStart || !input.quietHoursEnd)
    ) {
      throw new ValidationError(
        "quietHoursStart and quietHoursEnd are required when quiet hours are enabled"
      );
    }

    const repository = new DrizzleNotificationInboxRepository();
    const preference = await repository.upsertPreference({
      userId: session.userId,
      tenantId: input.tenantId,
      category: input.category,
      inAppEnabled: input.inAppEnabled,
      emailEnabled: input.emailEnabled,
      smsEnabled: input.smsEnabled,
      whatsappEnabled: input.whatsappEnabled,
      quietHoursEnabled: input.quietHoursEnabled,
      quietHoursStart: input.quietHoursStart,
      quietHoursEnd: input.quietHoursEnd,
      timezone: input.timezone,
      locale: input.locale,
    });

    return NextResponse.json({ data: preference });
  } catch (error) {
    return notificationApiError(error);
  }
}
