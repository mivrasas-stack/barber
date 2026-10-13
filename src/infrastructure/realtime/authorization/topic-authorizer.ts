import { parseTopic } from "../protocol/validation";
import type { ParsedTopic } from "../protocol/types";
import type { RealtimeSession } from "../auth/realtime-authenticator";
import { RealtimeErrorCodes } from "../protocol/types";
import { db } from "@/infrastructure/database/client";
import { locations } from "@/infrastructure/database/schema/locations";
import { appointments } from "@/infrastructure/database/schema/appointments";
import { orders } from "@/infrastructure/database/schema/commerce";
import { professionalProfiles, professionalWorkspaces } from "@/infrastructure/database/schema/professionals";
import { eq } from "drizzle-orm";

export interface TopicAuthorizationResult {
  allowed: boolean;
  code?: string;
  reason?: string;
  parsedTopic?: ParsedTopic;
}

export interface TopicAuthorizer {
  authorize(session: RealtimeSession, rawTopic: string): Promise<TopicAuthorizationResult>;
}

export class DatabaseTopicAuthorizer implements TopicAuthorizer {
  async authorize(
    session: RealtimeSession,
    rawTopic: string
  ): Promise<TopicAuthorizationResult> {
    const parsed = parseTopic(rawTopic);
    if (!parsed) {
      return {
        allowed: false,
        code: RealtimeErrorCodes.INVALID_TOPIC,
        reason: "Invalid topic format. Expected {kind}:{id}",
      };
    }

    // Platform admin has universal subscription authority
    if (session.isPlatformAdmin) {
      return { allowed: true, parsedTopic: parsed };
    }

    const { kind, id } = parsed;

    try {
      switch (kind) {
        case "user": {
          if (session.userId === id) {
            return { allowed: true, parsedTopic: parsed };
          }
          return {
            allowed: false,
            code: RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
            reason: "User cannot subscribe to another user's private stream",
          };
        }

        case "customer": {
          if (session.userId === id) {
            return { allowed: true, parsedTopic: parsed };
          }
          return {
            allowed: false,
            code: RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
            reason: "Customer stream restricted to account owner",
          };
        }

        case "tenant": {
          if (session.tenantIds.has(id)) {
            return { allowed: true, parsedTopic: parsed };
          }
          return {
            allowed: false,
            code: RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
            reason: "User does not have an active membership in this tenant",
          };
        }

        case "location": {
          const locRows = await db
            .select({ tenantId: locations.tenantId })
            .from(locations)
            .where(eq(locations.id, id))
            .limit(1);

          const loc = locRows[0];
          if (!loc) {
            return {
              allowed: false,
              code: RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
              reason: "Location not found",
            };
          }

          if (session.tenantIds.has(loc.tenantId)) {
            return { allowed: true, parsedTopic: parsed };
          }

          return {
            allowed: false,
            code: RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
            reason: "User not authorized for this location's tenant",
          };
        }

        case "appointment": {
          const aptRows = await db
            .select({
              tenantId: appointments.tenantId,
              customerUserId: appointments.customerUserId,
            })
            .from(appointments)
            .where(eq(appointments.id, id))
            .limit(1);

          const apt = aptRows[0];
          if (!apt) {
            return {
              allowed: false,
              code: RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
              reason: "Appointment not found",
            };
          }

          // Allowed if user is the appointment customer or staff of the tenant
          if (
            (apt.customerUserId && apt.customerUserId === session.userId) ||
            session.tenantIds.has(apt.tenantId)
          ) {
            return { allowed: true, parsedTopic: parsed };
          }

          return {
            allowed: false,
            code: RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
            reason: "User not authorized to access this appointment",
          };
        }

        case "order": {
          const orderRows = await db
            .select({
              contextTenantId: orders.contextTenantId,
              customerUserId: orders.customerUserId,
            })
            .from(orders)
            .where(eq(orders.id, id))
            .limit(1);

          const order = orderRows[0];
          if (!order) {
            return {
              allowed: false,
              code: RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
              reason: "Order not found",
            };
          }

          // Allowed if user is customer or staff of context tenant
          if (
            (order.customerUserId && order.customerUserId === session.userId) ||
            session.tenantIds.has(order.contextTenantId)
          ) {
            return { allowed: true, parsedTopic: parsed };
          }

          return {
            allowed: false,
            code: RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
            reason: "User not authorized to access this order",
          };
        }

        case "professional": {
          // Check if user is this professional
          const profRows = await db
            .select({
              userId: professionalProfiles.userId,
              workspaceTenantId: professionalWorkspaces.tenantId,
            })
            .from(professionalProfiles)
            .leftJoin(
              professionalWorkspaces,
              eq(professionalProfiles.id, professionalWorkspaces.professionalProfileId)
            )
            .where(eq(professionalProfiles.id, id))
            .limit(1);

          const prof = profRows[0];
          if (!prof) {
            return {
              allowed: false,
              code: RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
              reason: "Professional not found",
            };
          }

          if (
            prof.userId === session.userId ||
            (prof.workspaceTenantId && session.tenantIds.has(prof.workspaceTenantId))
          ) {
            return { allowed: true, parsedTopic: parsed };
          }

          return {
            allowed: false,
            code: RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
            reason: "User not authorized to access this professional's topic",
          };
        }

        default:
          return {
            allowed: false,
            code: RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
            reason: "Unknown topic scope",
          };
      }
    } catch {
      return {
        allowed: false,
        code: RealtimeErrorCodes.INTERNAL_ERROR,
        reason: "Failed to authorize topic subscription",
      };
    }
  }
}

/**
 * Mock Topic Authorizer for tests
 */
export class MockTopicAuthorizer implements TopicAuthorizer {
  private allowedRules: Array<(session: RealtimeSession, topic: ParsedTopic) => boolean> = [];

  constructor() {
    // Default baseline rules
    this.addRule((session, topic) => {
      if (session.isPlatformAdmin) return true;
      if (topic.kind === "user" && topic.id === session.userId) return true;
      if (topic.kind === "customer" && topic.id === session.userId) return true;
      if (topic.kind === "tenant" && session.tenantIds.has(topic.id)) return true;
      return false;
    });
  }

  addRule(rule: (session: RealtimeSession, topic: ParsedTopic) => boolean): void {
    this.allowedRules.push(rule);
  }

  async authorize(
    session: RealtimeSession,
    rawTopic: string
  ): Promise<TopicAuthorizationResult> {
    const parsed = parseTopic(rawTopic);
    if (!parsed) {
      return {
        allowed: false,
        code: RealtimeErrorCodes.INVALID_TOPIC,
        reason: "Invalid topic format",
      };
    }

    for (const rule of this.allowedRules) {
      if (rule(session, parsed)) {
        return { allowed: true, parsedTopic: parsed };
      }
    }

    return {
      allowed: false,
      code: RealtimeErrorCodes.UNAUTHORIZED_TOPIC,
      reason: `User is not authorized for topic: ${rawTopic}`,
      parsedTopic: parsed,
    };
  }
}
