import { AppointmentRepository } from "../domain/appointment-repository.interface";
import { AppointmentStatus, Appointment } from "../domain/appointment";
import { NotFoundError } from "@/shared/errors/app-error";

export interface MutateAppointmentStatusInput {
  tenantId: string;
  appointmentId: string;
  targetStatus: AppointmentStatus;
  expectedVersion?: number;
  actorUserId?: string | null;
  reason?: string;
}

export class MutateAppointmentStatusUseCase {
  constructor(private readonly appointmentRepo: AppointmentRepository) {}

  async execute(input: MutateAppointmentStatusInput): Promise<Appointment> {
    const existing = await this.appointmentRepo.findById(input.appointmentId);
    if (!existing || existing.tenantId !== input.tenantId) {
      throw new NotFoundError("Appointment not found");
    }

    // Verify allowed transition
    existing.assertCanTransitionTo(input.targetStatus);

    const expectedVersion = input.expectedVersion ?? existing.version;

    const updated = await this.appointmentRepo.updateStatusWithDetails({
      appointmentId: existing.id,
      expectedVersion,
      fromStatus: existing.status,
      toStatus: input.targetStatus,
      actorUserId: input.actorUserId,
      reason: input.reason,
      outboxEvent: {
        eventType: `appointment.${input.targetStatus.toLowerCase()}`,
        aggregateId: existing.id,
        tenantId: existing.tenantId,
        locationId: existing.locationId,
        payload: {
          appointmentId: existing.id,
          fromStatus: existing.status,
          toStatus: input.targetStatus,
          reason: input.reason,
          staffId: existing.staffId,
          startsAt: existing.startsAt.toISOString(),
          endsAt: existing.endsAt.toISOString(),
        },
      },
      auditLog: {
        tenantId: existing.tenantId,
        actorUserId: input.actorUserId,
        action: `APPOINTMENT_STATUS_${input.targetStatus}`,
        entityType: "APPOINTMENT",
        entityId: existing.id,
        stateBefore: {
          status: existing.status,
          version: existing.version,
        },
        stateAfter: {
          status: input.targetStatus,
          version: expectedVersion + 1,
        },
      },
    });

    return updated;
  }
}
