import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { locations } from "@/infrastructure/database/schema/locations";
import { AppointmentRepository, AppointmentWithServices } from "../domain/appointment-repository.interface";
import { IdempotencyRepository } from "../domain/idempotency.interface";
import { ServiceRepository } from "@/modules/catalog/domain/service-repository.interface";
import { StaffRepository } from "@/modules/staff/domain/staff-repository.interface";
import { AffiliationRepository } from "@/modules/professionals/domain/affiliation-repository.interface";
import { DrizzleAffiliationRepository } from "@/modules/professionals/infrastructure/drizzle-affiliation.repository";
import { DrizzleProfessionalRepository } from "@/modules/professionals/infrastructure/drizzle-professional.repository";
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from "@/shared/errors/app-error";
import { AppointmentSource, AppointmentStatus } from "../domain/appointment";

export interface CreateAppointmentInput {
  tenantId: string;
  locationId: string;
  customerUserId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  staffId: string;
  serviceIds: string[];
  startsAt: Date | string;
  timezone?: string;
  source?: AppointmentSource;
  notes?: string;
  actorUserId?: string;
  idempotencyKey?: string;
}

export class CreateAppointmentUseCase {
  private readonly affiliationRepo: AffiliationRepository;
  private readonly professionalRepo: DrizzleProfessionalRepository;

  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly idempotencyRepo: IdempotencyRepository,
    private readonly serviceRepo: ServiceRepository,
    private readonly staffRepo: StaffRepository,
    affiliationRepo?: AffiliationRepository,
    professionalRepo?: DrizzleProfessionalRepository
  ) {
    this.affiliationRepo = affiliationRepo ?? new DrizzleAffiliationRepository();
    this.professionalRepo = professionalRepo ?? new DrizzleProfessionalRepository();
  }

  async execute(input: CreateAppointmentInput): Promise<{
    appointment: AppointmentWithServices;
    isIdempotentReplay?: boolean;
  }> {
    const timezone = input.timezone ?? "America/Bogota";
    const source: AppointmentSource = input.source ?? "ONLINE";
    const status: AppointmentStatus = "CONFIRMED"; // Default booked status
    const actorUserId = input.actorUserId ?? input.customerUserId ?? null;

    // 1. Idempotency Check
    let idempotencyRecordId: string | null = null;
    if (input.idempotencyKey && actorUserId) {
      const requestPayload = {
        tenantId: input.tenantId,
        locationId: input.locationId,
        staffId: input.staffId,
        serviceIds: input.serviceIds,
        startsAt: new Date(input.startsAt).toISOString(),
      };
      const requestHash = createHash("sha256")
        .update(JSON.stringify(requestPayload))
        .digest("hex");

      const existingRecord = await this.idempotencyRepo.find(
        input.tenantId,
        actorUserId,
        "CREATE_APPOINTMENT",
        input.idempotencyKey
      );

      if (existingRecord) {
        if (existingRecord.status === "COMPLETED") {
          return {
            appointment: existingRecord.responseBody as AppointmentWithServices,
            isIdempotentReplay: true,
          };
        }
        if (existingRecord.status === "PROCESSING") {
          throw new ConflictError(
            "IDEMPOTENT_OPERATION_IN_PROGRESS: Another request with this idempotency key is already processing"
          );
        }
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const record = await this.idempotencyRepo.create({
        tenantId: input.tenantId,
        userId: actorUserId,
        key: input.idempotencyKey,
        operation: "CREATE_APPOINTMENT",
        requestHash,
        expiresAt,
      });
      idempotencyRecordId = record.id;
    }

    try {
      // 2. Validate Location & Cross-Tenant Affiliation (Case A vs Case B)
      const [loc] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, input.locationId))
        .limit(1);

      if (!loc) {
        throw new NotFoundError("Location not found");
      }

      const isSameTenant = loc.tenantId === input.tenantId;
      if (!isSameTenant) {
        // Case B: Cross-tenant booking. Must have an ACTIVE affiliation
        const affiliation = await this.affiliationRepo.findActiveAffiliation(
          input.tenantId, // Solo professional workspace tenant
          loc.tenantId    // Host barbershop tenant
        );

        if (!affiliation || !affiliation.isActive) {
          throw new ForbiddenError(
            "AFFILIATION_NOT_ACTIVE: No active affiliation between professional workspace and host barbershop"
          );
        }

        const isLocAllowed = await this.affiliationRepo.isLocationAuthorized(
          affiliation.id,
          input.locationId
        );

        if (!isLocAllowed) {
          throw new ForbiddenError(
            "AFFILIATION_LOCATION_NOT_ALLOWED: Host location is not authorized for this professional affiliation"
          );
        }
      }

      // 3. Validate Staff
      const staff = await this.staffRepo.findById(input.staffId);
      if (!staff || staff.tenantId !== input.tenantId) {
        throw new NotFoundError("Staff member not found in this tenant");
      }
      if (!staff.isActive) {
        throw new ValidationError("Staff member is inactive");
      }

      // 4. Validate and Calculate Services
      if (!input.serviceIds || input.serviceIds.length === 0) {
        throw new ValidationError("At least one service must be selected");
      }

      let totalDurationMinutes = 0;
      const serviceSnapshots: {
        serviceId: string;
        serviceNameSnapshot: string;
        durationMinutes: number;
        priceMinor: number;
        currency: string;
        position: number;
      }[] = [];

      for (let i = 0; i < input.serviceIds.length; i++) {
        const sId = input.serviceIds[i];
        const s = await this.serviceRepo.findById(sId);
        if (!s || s.tenantId !== input.tenantId) {
          throw new NotFoundError(`Service with ID '${sId}' not found in tenant`);
        }
        if (!s.isActive) {
          throw new ValidationError(`Service '${s.name}' is inactive`);
        }

        totalDurationMinutes += s.totalOccupiedMinutes;
        serviceSnapshots.push({
          serviceId: s.id,
          serviceNameSnapshot: s.name,
          durationMinutes: s.totalOccupiedMinutes,
          priceMinor: s.priceMinor,
          currency: s.currency,
          position: i + 1,
        });
      }

      // 5. Calculate Time Range
      const startsAtDate = new Date(input.startsAt);
      if (isNaN(startsAtDate.getTime())) {
        throw new ValidationError("Invalid startsAt date format");
      }
      const endsAtDate = new Date(startsAtDate.getTime() + totalDurationMinutes * 60 * 1000);

      // 6. Create in atomic transaction
      const result = await this.appointmentRepo.createWithDetails({
        appointment: {
          tenantId: input.tenantId,
          locationId: input.locationId,
          customerUserId: input.customerUserId,
          customerNameSnapshot: input.customerName.trim(),
          customerEmailSnapshot: input.customerEmail?.trim(),
          customerPhoneSnapshot: input.customerPhone?.trim(),
          staffId: input.staffId,
          status,
          startsAt: startsAtDate,
          endsAt: endsAtDate,
          timezone,
          source,
          notes: input.notes,
          createdByUserId: actorUserId,
        },
        services: serviceSnapshots,
        actorUserId,
        outboxEvent: {
          eventType: "appointment.created",
          aggregateId: "",
          tenantId: input.tenantId,
          locationId: input.locationId,
          payload: {
            staffId: input.staffId,
            startsAt: startsAtDate.toISOString(),
            endsAt: endsAtDate.toISOString(),
            customerName: input.customerName.trim(),
            status,
          },
        },
        auditLog: {
          tenantId: input.tenantId,
          actorUserId,
          action: "APPOINTMENT_CREATED",
          entityType: "APPOINTMENT",
          entityId: "",
          stateAfter: {
            staffId: input.staffId,
            startsAt: startsAtDate.toISOString(),
            endsAt: endsAtDate.toISOString(),
            status,
          },
        },
      });

      // 7. Track Customer Relationship for Commercial Owner (Tenant)
      if (input.customerUserId) {
        await this.professionalRepo.recordCustomerRelationship(
          input.tenantId,
          input.customerUserId
        );
      }

      // 8. Complete Idempotency record if applicable
      if (idempotencyRecordId) {
        await this.idempotencyRepo.complete(idempotencyRecordId, 201, {
          appointment: {
            id: result.appointment.id,
            tenantId: result.appointment.tenantId,
            locationId: result.appointment.locationId,
            customerNameSnapshot: result.appointment.customerNameSnapshot,
            staffId: result.appointment.staffId,
            status: result.appointment.status,
            startsAt: result.appointment.startsAt.toISOString(),
            endsAt: result.appointment.endsAt.toISOString(),
            version: result.appointment.version,
          },
          services: result.services,
        });
      }

      return { appointment: result };
    } catch (err) {
      if (idempotencyRecordId) {
        await this.idempotencyRepo.fail(idempotencyRecordId);
      }
      throw err;
    }
  }
}
