import { NextRequest, NextResponse } from "next/server";
import { DrizzleNotificationInboxRepository } from "@/modules/notifications/infrastructure/drizzle-notification-inbox.repository";
import {
  assertNotificationTenantAccess,
  requireNotificationSession,
} from "@/modules/notifications/infrastructure/notification-api-auth";
import { notificationApiError } from "@/modules/notifications/infrastructure/notification-api-error";
import { ValidationError } from "@/shared/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const session = await requireNotificationSession(request);
    const tenantId = request.nextUrl.searchParams.get("tenantId") || undefined;
    if (tenantId) {
      await assertNotificationTenantAccess(
        session.userId,
        tenantId,
        session.isPlatformAdmin
      );
    }

    const limitRaw = request.nextUrl.searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : 30;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ValidationError("limit must be an integer between 1 and 100");
    }

    const beforeRaw = request.nextUrl.searchParams.get("before");
    const before = beforeRaw ? new Date(beforeRaw) : undefined;
    if (before && Number.isNaN(before.getTime())) {
      throw new ValidationError("before must be a valid ISO date");
    }

    const includeArchived =
      request.nextUrl.searchParams.get("includeArchived") === "true";

    const repository = new DrizzleNotificationInboxRepository();
    const [items, unreadCount] = await Promise.all([
      repository.listInbox({
        userId: session.userId,
        tenantId,
        limit,
        before,
        includeArchived,
      }),
      repository.countUnread(session.userId, tenantId),
    ]);

    return NextResponse.json({
      data: items,
      meta: {
        unreadCount,
        nextBefore:
          items.length === limit
            ? items[items.length - 1].createdAt.toISOString()
            : null,
      },
    });
  } catch (error) {
    return notificationApiError(error);
  }
}
