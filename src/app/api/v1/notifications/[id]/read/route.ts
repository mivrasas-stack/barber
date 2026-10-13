import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DrizzleNotificationInboxRepository } from "@/modules/notifications/infrastructure/drizzle-notification-inbox.repository";
import { requireNotificationSession } from "@/modules/notifications/infrastructure/notification-api-auth";
import { notificationApiError } from "@/modules/notifications/infrastructure/notification-api-error";
import { NotFoundError, ValidationError } from "@/shared/errors/app-error";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireNotificationSession(request);
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError("Invalid notification id");
    }

    const updated = await new DrizzleNotificationInboxRepository().markRead(
      id,
      session.userId
    );
    if (!updated) throw new NotFoundError("Notification", id);

    return NextResponse.json({ data: { id, read: true } });
  } catch (error) {
    return notificationApiError(error);
  }
}
