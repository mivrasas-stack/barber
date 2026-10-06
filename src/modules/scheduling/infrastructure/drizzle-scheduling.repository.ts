import { eq, and, inArray, lt, gt } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  locationBusinessHours,
  availabilityRules,
  availabilityExceptions,
  LocationBusinessHoursRow,
  AvailabilityRuleRow,
  AvailabilityExceptionRow,
} from "@/infrastructure/database/schema/scheduling";
import { appointments } from "@/infrastructure/database/schema/appointments";
import {
  BusinessHours,
  AvailabilityRule,
  AvailabilityException,
  BookedInterval,
} from "../domain/scheduling-types";
import {
  SchedulingRepository,
  CreateBusinessHoursInput,
  CreateAvailabilityRuleInput,
  CreateAvailabilityExceptionInput,
} from "../domain/scheduling-repository.interface";

export class DrizzleSchedulingRepository implements SchedulingRepository {
  private toBusinessHours(row: LocationBusinessHoursRow): BusinessHours {
    return {
      id: row.id,
      locationId: row.locationId,
      dayOfWeek: row.dayOfWeek,
      openLocalTime: row.openLocalTime,
      closeLocalTime: row.closeLocalTime,
      isClosed: row.isClosed,
    };
  }

  private toAvailabilityRule(row: AvailabilityRuleRow): AvailabilityRule {
    return {
      id: row.id,
      tenantId: row.tenantId,
      staffId: row.staffId,
      locationId: row.locationId,
      dayOfWeek: row.dayOfWeek,
      startLocalTime: row.startLocalTime,
      endLocalTime: row.endLocalTime,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      isActive: row.isActive,
    };
  }

  private toAvailabilityException(row: AvailabilityExceptionRow): AvailabilityException {
    return {
      id: row.id,
      tenantId: row.tenantId,
      staffId: row.staffId,
      locationId: row.locationId,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      type: row.type,
      reason: row.reason,
    };
  }

  async getLocationBusinessHours(locationId: string): Promise<BusinessHours[]> {
    const rows = await db
      .select()
      .from(locationBusinessHours)
      .where(eq(locationBusinessHours.locationId, locationId));
    return rows.map((r) => this.toBusinessHours(r));
  }

  async upsertLocationBusinessHours(input: CreateBusinessHoursInput[]): Promise<void> {
    for (const item of input) {
      await db
        .insert(locationBusinessHours)
        .values({
          locationId: item.locationId,
          dayOfWeek: item.dayOfWeek,
          openLocalTime: item.openLocalTime,
          closeLocalTime: item.closeLocalTime,
          isClosed: item.isClosed ?? false,
        })
        .onConflictDoUpdate({
          target: [locationBusinessHours.locationId, locationBusinessHours.dayOfWeek],
          set: {
            openLocalTime: item.openLocalTime,
            closeLocalTime: item.closeLocalTime,
            isClosed: item.isClosed ?? false,
          },
        });
    }
  }

  async getStaffAvailabilityRules(staffId: string, locationId: string): Promise<AvailabilityRule[]> {
    const rows = await db
      .select()
      .from(availabilityRules)
      .where(
        and(
          eq(availabilityRules.staffId, staffId),
          eq(availabilityRules.locationId, locationId),
          eq(availabilityRules.isActive, true)
        )
      );
    return rows.map((r) => this.toAvailabilityRule(r));
  }

  async createAvailabilityRule(input: CreateAvailabilityRuleInput): Promise<AvailabilityRule> {
    const [row] = await db
      .insert(availabilityRules)
      .values({
        tenantId: input.tenantId,
        staffId: input.staffId,
        locationId: input.locationId,
        dayOfWeek: input.dayOfWeek,
        startLocalTime: input.startLocalTime,
        endLocalTime: input.endLocalTime,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        isActive: input.isActive ?? true,
      })
      .returning();

    return this.toAvailabilityRule(row);
  }

  async getAvailabilityExceptions(
    staffId: string,
    locationId: string,
    from: Date,
    to: Date
  ): Promise<AvailabilityException[]> {
    const rows = await db
      .select()
      .from(availabilityExceptions)
      .where(
        and(
          eq(availabilityExceptions.staffId, staffId),
          eq(availabilityExceptions.locationId, locationId),
          lt(availabilityExceptions.startsAt, to),
          gt(availabilityExceptions.endsAt, from)
        )
      );
    return rows.map((r) => this.toAvailabilityException(r));
  }

  async createAvailabilityException(input: CreateAvailabilityExceptionInput): Promise<AvailabilityException> {
    const [row] = await db
      .insert(availabilityExceptions)
      .values({
        tenantId: input.tenantId,
        staffId: input.staffId,
        locationId: input.locationId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        type: input.type,
        reason: input.reason,
      })
      .returning();

    return this.toAvailabilityException(row);
  }

  async getBookedIntervals(staffId: string, from: Date, to: Date): Promise<BookedInterval[]> {
    const activeStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];
    const rows = await db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.staffId, staffId),
          inArray(appointments.status, activeStatuses),
          lt(appointments.startsAt, to),
          gt(appointments.endsAt, from)
        )
      );

    return rows.map((r) => ({
      id: r.id,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      status: r.status,
    }));
  }
}
