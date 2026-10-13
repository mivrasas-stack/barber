import { eq, and, inArray, gte, lte, desc } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  appointments,
  appointmentServices,
  appointmentStatusHistory,
  AppointmentRow,
  AppointmentServiceRow,
} from "@/infrastructure/database/schema/appointments";
import { outboxEvents } from "@/infrastructure/database/schema/outbox";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import {
  Appointment,
  AppointmentServiceItem,
  AppointmentStatus,
  AppointmentSource,
} from "../domain/appointment";
import {
  AppointmentRepository,
  AppointmentFilter,
  AppointmentWithServices,
  CreateAppointmentTxInput,
  UpdateStatusTxInput,
} from "../domain/appointment-repository.interface";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { isAppointmentSlotConflictError } from "./appointment-db-conflicts";

export class DrizzleAppointmentRepository implements AppointmentRepository {
  private toAppointmentDomain(row: AppointmentRow): Appointment {
    return new Appointment({
      id: row.id,
      tenantId: row.tenantId,
      locationId: row.locationId,
      customerUserId: row.customerUserId,
      customerNameSnapshot: row.customerNameSnapshot,
      customerEmailSnapshot: row.customerEmailSnapshot,
      customerPhoneSnapshot: row.customerPhoneSnapshot,
      staffId: row.staffId,
      status: row.status as AppointmentStatus,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      timezone: row.timezone,
      source: row.source as AppointmentSource,
      notes: row.notes,
      createdByUserId: row.createdByUserId,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      cancelledAt: row.cancelledAt,
      completedAt: row.completedAt,
    });
  }

  private toServiceDomain(row: AppointmentServiceRow): AppointmentServiceItem {
    return {
      id: row.id,
      appointmentId: row.appointmentId,
      serviceId: row.serviceId,
      serviceNameSnapshot: row.serviceNameSnapshot,
      durationMinutes: row.durationMinutes,
      priceMinor: row.priceMinor,
      currency: row.currency,
      position: row.position,
    };
  }

  async findById(id: string): Promise<Appointment | null> {
    const rows = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);

    if (!rows[0]) return null;
    return this.toAppointmentDomain(rows[0]);
  }

  async findServicesByAppointmentId(appointmentId: string): Promise<AppointmentServiceItem[]> {
    const rows = await db
      .select()
      .from(appointmentServices)
      .where(eq(appointmentServices.appointmentId, appointmentId))
      .orderBy(appointmentServices.position);

    return rows.map((r) => this.toServiceDomain(r));
  }

  async list(filter: AppointmentFilter): Promise<AppointmentWithServices[]> {
    const conditions = [eq(appointments.tenantId, filter.tenantId)];

    if (filter.locationId) {
      conditions.push(eq(appointments.locationId, filter.locationId));
    }
    if (filter.staffId) {
      conditions.push(eq(appointments.staffId, filter.staffId));
    }
    if (filter.customerUserId) {
      conditions.push(eq(appointments.customerUserId, filter.customerUserId));
    }
    if (filter.status) {
      if (Array.isArray(filter.status)) {
        conditions.push(inArray(appointments.status, filter.status));
      } else {
        conditions.push(eq(appointments.status, filter.status));
      }
    }
    if (filter.from) {
      conditions.push(gte(appointments.startsAt, filter.from));
    }
    if (filter.to) {
      conditions.push(lte(appointments.endsAt, filter.to));
    }

    const apptRows = await db
      .select()
      .from(appointments)
      .where(and(...conditions))
      .orderBy(desc(appointments.startsAt));

    const result: AppointmentWithServices[] = [];
    for (const row of apptRows) {
      const sRows = await this.findServicesByAppointmentId(row.id);
      result.push({
        appointment: this.toAppointmentDomain(row),
        services: sRows,
      });
    }

    return result;
  }

  async createWithDetails(input: CreateAppointmentTxInput): Promise<AppointmentWithServices> {
    try {
      return await db.transaction(async (tx) => {
        // 1. Insert appointment
        const [row] = await tx
          .insert(appointments)
          .values({
            tenantId: input.appointment.tenantId,
            locationId: input.appointment.locationId,
            customerUserId: input.appointment.customerUserId,
            customerNameSnapshot: input.appointment.customerNameSnapshot,
            customerEmailSnapshot: input.appointment.customerEmailSnapshot,
            customerPhoneSnapshot: input.appointment.customerPhoneSnapshot,
            staffId: input.appointment.staffId,
            status: input.appointment.status,
            startsAt: input.appointment.startsAt,
            endsAt: input.appointment.endsAt,
            timezone: input.appointment.timezone,
            source: input.appointment.source,
            notes: input.appointment.notes,
            createdByUserId: input.appointment.createdByUserId,
          })
          .returning();

        // 2. Insert appointment services
        const insertedServices: AppointmentServiceItem[] = [];
        for (const s of input.services) {
          const [sRow] = await tx
            .insert(appointmentServices)
            .values({
              appointmentId: row.id,
              serviceId: s.serviceId,
              serviceNameSnapshot: s.serviceNameSnapshot,
              durationMinutes: s.durationMinutes,
              priceMinor: s.priceMinor,
              currency: s.currency,
              position: s.position,
            })
            .returning();
          insertedServices.push(this.toServiceDomain(sRow));
        }

        // 3. Insert initial status history
        await tx.insert(appointmentStatusHistory).values({
          appointmentId: row.id,
          fromStatus: "NONE",
          toStatus: row.status,
          actorUserId: input.actorUserId,
          reason: "Appointment created",
        });

        // 4. Insert transactional outbox event
        await tx.insert(outboxEvents).values({
          eventType: input.outboxEvent.eventType,
          tenantId: input.outboxEvent.tenantId,
          locationId: input.outboxEvent.locationId,
          aggregateId: row.id,
          payload: input.outboxEvent.payload,
          status: "PENDING",
        });

        // 5. Insert audit log
        await tx.insert(auditLogs).values({
          tenantId: input.auditLog.tenantId,
          actorUserId: input.auditLog.actorUserId,
          action: input.auditLog.action,
          entityType: input.auditLog.entityType,
          entityId: row.id,
          metadata: { stateAfter: input.auditLog.stateAfter },
        });

        return {
          appointment: this.toAppointmentDomain(row),
          services: insertedServices,
        };
      });
    } catch (error: any) {
      if (isAppointmentSlotConflictError(error)) {
        throw new ConflictError("APPOINTMENT_SLOT_UNAVAILABLE");
      }
      throw error;
    }
  }

  async updateStatusWithDetails(input: UpdateStatusTxInput): Promise<Appointment> {
    return await db.transaction(async (tx) => {
      // Optimistic concurrency check
      const current = await tx
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.appointmentId))
        .limit(1);

      if (!current[0]) {
        throw new NotFoundError("Appointment not found");
      }

      if (current[0].version !== input.expectedVersion) {
        throw new ConflictError(
          "CONCURRENT_MODIFICATION: Appointment was updated by another process. Please refresh."
        );
      }

      const now = new Date();
      const updates: Record<string, unknown> = {
        status: input.toStatus,
        version: input.expectedVersion + 1,
        updatedAt: now,
      };

      if (input.toStatus === "CANCELLED") {
        updates.cancelledAt = now;
      }
      if (input.toStatus === "COMPLETED") {
        updates.completedAt = now;
      }

      const [updated] = await tx
        .update(appointments)
        .set(updates)
        .where(
          and(
            eq(appointments.id, input.appointmentId),
            eq(appointments.version, input.expectedVersion)
          )
        )
        .returning();

      if (!updated) {
        throw new ConflictError(
          "CONCURRENT_MODIFICATION: Conflict while updating appointment status."
        );
      }

      // Record status transition
      await tx.insert(appointmentStatusHistory).values({
        appointmentId: input.appointmentId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        actorUserId: input.actorUserId,
        reason: input.reason,
      });

      // Record outbox event
      await tx.insert(outboxEvents).values({
        eventType: input.outboxEvent.eventType,
        tenantId: input.outboxEvent.tenantId,
        locationId: input.outboxEvent.locationId,
        aggregateId: input.appointmentId,
        payload: input.outboxEvent.payload,
        status: "PENDING",
      });

      // Record audit log
      await tx.insert(auditLogs).values({
        tenantId: input.auditLog.tenantId,
        actorUserId: input.auditLog.actorUserId,
        action: input.auditLog.action,
        entityType: input.auditLog.entityType,
        entityId: input.appointmentId,
        metadata: {
          stateBefore: input.auditLog.stateBefore,
          stateAfter: input.auditLog.stateAfter,
        },
      });

      // Pure PostgreSQL transactional authority: financialize appointment on COMPLETED
      if (input.toStatus === "COMPLETED") {
        const { DrizzleFinanceRepository } = await import(
          "@/modules/finance/infrastructure/drizzle-finance.repository"
        );
        const { PostServiceRevenueUseCase } = await import(
          "@/modules/finance/application/post-service-revenue.usecase"
        );
        const financeRepo = new DrizzleFinanceRepository();
        const postRevenueUseCase = new PostServiceRevenueUseCase(financeRepo);
        await postRevenueUseCase.execute({
          appointmentId: input.appointmentId,
          actorUserId: input.actorUserId || undefined,
          tx,
        });
      }

      return this.toAppointmentDomain(updated);
    });
  }
}
