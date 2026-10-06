import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { pool, db } from "@/infrastructure/database/client";
import { DrizzleUserRepository } from "@/modules/identity/infrastructure/drizzle-user.repository";
import { DrizzleTenantRepository } from "@/modules/tenancy/infrastructure/drizzle-tenant.repository";
import { DrizzleServiceRepository } from "@/modules/catalog/infrastructure/drizzle-service.repository";
import { DrizzleStaffRepository } from "@/modules/staff/infrastructure/drizzle-staff.repository";
import { DrizzleSchedulingRepository } from "@/modules/scheduling/infrastructure/drizzle-scheduling.repository";
import { DrizzleAppointmentRepository } from "@/modules/appointments/infrastructure/drizzle-appointment.repository";
import { DrizzleIdempotencyRepository } from "@/modules/appointments/infrastructure/drizzle-idempotency.repository";
import { CreateAppointmentUseCase } from "@/modules/appointments/application/create-appointment.usecase";
import { MutateAppointmentStatusUseCase } from "@/modules/appointments/application/mutate-appointment-status.usecase";
import { GetAvailableSlotsUseCase } from "@/modules/scheduling/application/get-available-slots.usecase";
import { memberships } from "@/infrastructure/database/schema/memberships";
import { locations } from "@/infrastructure/database/schema/locations";
import { parseLocalDateToUtc, getDayOfWeekFromDateString } from "@/shared/utils/date-tz";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors/app-error";
import crypto from "crypto";

describe("Barber Paradise v2 - Stage 2: Scheduling & Concurrency Tests", () => {
  const userRepo = new DrizzleUserRepository();
  const tenantRepo = new DrizzleTenantRepository();
  const serviceRepo = new DrizzleServiceRepository();
  const staffRepo = new DrizzleStaffRepository();
  const schedulingRepo = new DrizzleSchedulingRepository();
  const appointmentRepo = new DrizzleAppointmentRepository();
  const idempotencyRepo = new DrizzleIdempotencyRepository();

  const createAppointmentUseCase = new CreateAppointmentUseCase(
    appointmentRepo,
    idempotencyRepo,
    serviceRepo,
    staffRepo
  );
  const mutateStatusUseCase = new MutateAppointmentStatusUseCase(appointmentRepo);
  const getSlotsUseCase = new GetAvailableSlotsUseCase(
    schedulingRepo,
    serviceRepo,
    staffRepo
  );

  const testSuffix = crypto.randomUUID().slice(0, 8);
  let tenantId: string;
  let tenantBId: string;
  let locationId: string;
  let staffId: string;
  let serviceId: string;
  let serviceBId: string;
  let customerUserId: string;

  beforeAll(async () => {
    // 1. Create Tenant A
    const tenantA = await tenantRepo.create({
      name: `Test Salon A ${testSuffix}`,
      slug: `salon-a-${testSuffix}`,
      defaultCurrency: "COP",
      defaultTimezone: "America/Bogota",
    });
    tenantId = tenantA.id;

    // 2. Create Tenant B (for cross-tenant tests)
    const tenantB = await tenantRepo.create({
      name: `Test Salon B ${testSuffix}`,
      slug: `salon-b-${testSuffix}`,
      defaultCurrency: "COP",
      defaultTimezone: "America/Bogota",
    });
    tenantBId = tenantB.id;

    // 3. Create Location in Tenant A
    const [loc] = await db
      .insert(locations)
      .values({
        tenantId,
        name: `HQ Location ${testSuffix}`,
        slug: `hq-${testSuffix}`,
        address: "Calle 100 # 15-20",
        timezone: "America/Bogota",
        currency: "COP",
      })
      .returning();
    locationId = loc.id;

    // 4. Create User & Membership for Staff
    const staffUser = await userRepo.create({
      email: `staff.${testSuffix}@example.com`,
      name: `Barber Pro ${testSuffix}`,
    });

    const [membership] = await db
      .insert(memberships)
      .values({
        tenantId,
        userId: staffUser.id,
        status: "ACTIVE",
      })
      .returning();

    // 5. Create Staff Profile & Assignments
    const staffProfile = await staffRepo.create({
      tenantId,
      membershipId: membership.id,
      displayName: `Master Barber ${testSuffix}`,
    });
    staffId = staffProfile.id;
    await staffRepo.assignLocation(staffId, locationId);

    // 6. Create Service in Tenant A (30 min duration, 0 buffer)
    const service = await serviceRepo.create({
      tenantId,
      name: `Corte Precision ${testSuffix}`,
      slug: `corte-precision-${testSuffix}`,
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      priceMinor: 40000,
      currency: "COP",
    });
    serviceId = service.id;
    await staffRepo.assignService({ staffId, serviceId });
    await serviceRepo.assignToLocation(locationId, serviceId);

    // 7. Create Service in Tenant B (for isolation test)
    const serviceB = await serviceRepo.create({
      tenantId: tenantBId,
      name: `Servicio Tenant B ${testSuffix}`,
      slug: `service-b-${testSuffix}`,
      durationMinutes: 30,
      priceMinor: 50000,
    });
    serviceBId = serviceB.id;

    // 8. Create Customer User
    const customer = await userRepo.create({
      email: `customer.${testSuffix}@example.com`,
      name: `Customer Test ${testSuffix}`,
    });
    customerUserId = customer.id;

    // 9. Configure Business Hours and Staff Availability for Friday (day 5)
    await schedulingRepo.upsertLocationBusinessHours([
      {
        locationId,
        dayOfWeek: 5, // Friday
        openLocalTime: "08:00",
        closeLocalTime: "18:00",
        isClosed: false,
      },
    ]);

    await schedulingRepo.createAvailabilityRule({
      tenantId,
      staffId,
      locationId,
      dayOfWeek: 5,
      startLocalTime: "08:00",
      endLocalTime: "18:00",
      isActive: true,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("1. Timezone & Availability Calculations", () => {
    it("should correctly convert local date-time in America/Bogota to UTC", () => {
      // 2026-10-16 is a Friday
      const utcDate = parseLocalDateToUtc("2026-10-16", "08:00", "America/Bogota");
      // Bogota is UTC-5 with no DST -> 08:00 local should be 13:00 UTC
      expect(utcDate.getUTCHours()).toBe(13);
      expect(utcDate.getUTCMinutes()).toBe(0);
      expect(getDayOfWeekFromDateString("2026-10-16")).toBe(5);
    });

    it("should compute available slots within working hours", async () => {
      const slots = await getSlotsUseCase.execute({
        tenantId,
        locationId,
        serviceId,
        staffId,
        date: "2026-10-16",
        timezone: "America/Bogota",
        slotIntervalMinutes: 30,
      });

      expect(slots.length).toBeGreaterThan(0);
      const firstSlot = slots[0];
      expect(new Date(firstSlot.startsAt).getUTCHours()).toBe(13); // 08:00 local
      expect(firstSlot.durationMinutes).toBe(30);
    });
  });

  describe("2. Adjacent and Overlapping Slots (PostgreSQL GiST)", () => {
    it("should allow adjacent intervals [10:00, 10:30) and [10:30, 11:00)", async () => {
      const slot1Start = new Date("2026-10-16T15:00:00.000Z"); // 10:00 local
      const slot2Start = new Date("2026-10-16T15:30:00.000Z"); // 10:30 local

      const appt1 = await createAppointmentUseCase.execute({
        tenantId,
        locationId,
        staffId,
        serviceIds: [serviceId],
        startsAt: slot1Start,
        customerName: "Adjacent Customer 1",
        customerUserId,
      });

      const appt2 = await createAppointmentUseCase.execute({
        tenantId,
        locationId,
        staffId,
        serviceIds: [serviceId],
        startsAt: slot2Start,
        customerName: "Adjacent Customer 2",
        customerUserId,
      });

      expect(appt1.appointment.appointment.id).toBeDefined();
      expect(appt2.appointment.appointment.id).toBeDefined();
    });

    it("should reject overlapping interval [10:15, 10:45) with APPOINTMENT_SLOT_UNAVAILABLE", async () => {
      const overlappingStart = new Date("2026-10-16T15:15:00.000Z"); // 10:15 local

      await expect(
        createAppointmentUseCase.execute({
          tenantId,
          locationId,
          staffId,
          serviceIds: [serviceId],
          startsAt: overlappingStart,
          customerName: "Overlapping Customer",
          customerUserId,
        })
      ).rejects.toThrow(ConflictError);
    });

    it("should release the slot immediately when an appointment is cancelled", async () => {
      const slotStart = new Date("2026-10-16T17:00:00.000Z"); // 12:00 local

      // Book appointment
      const booking = await createAppointmentUseCase.execute({
        tenantId,
        locationId,
        staffId,
        serviceIds: [serviceId],
        startsAt: slotStart,
        customerName: "To Cancel Customer",
        customerUserId,
      });

      // Try booking same slot -> must fail
      await expect(
        createAppointmentUseCase.execute({
          tenantId,
          locationId,
          staffId,
          serviceIds: [serviceId],
          startsAt: slotStart,
          customerName: "Competing Customer",
          customerUserId,
        })
      ).rejects.toThrow(ConflictError);

      // Cancel the original booking
      await mutateStatusUseCase.execute({
        tenantId,
        appointmentId: booking.appointment.appointment.id,
        targetStatus: "CANCELLED",
        reason: "Customer cancelled",
      });

      // Now booking the exact same slot must succeed!
      const rebooked = await createAppointmentUseCase.execute({
        tenantId,
        locationId,
        staffId,
        serviceIds: [serviceId],
        startsAt: slotStart,
        customerName: "New Lucky Customer",
        customerUserId,
      });

      expect(rebooked.appointment.appointment.id).toBeDefined();
      expect(rebooked.appointment.appointment.status).toBe("CONFIRMED");
    });
  });

  describe("3. Real 50-Concurrent Booking Race Condition Test", () => {
    it("should allow EXACTLY 1 winner and reject 49 with APPOINTMENT_SLOT_UNAVAILABLE", async () => {
      const raceSlotStart = new Date("2026-10-16T19:00:00.000Z"); // 14:00 local
      const concurrencyCount = 50;

      const promises = Array.from({ length: concurrencyCount }, (_, i) => {
        return createAppointmentUseCase.execute({
          tenantId,
          locationId,
          staffId,
          serviceIds: [serviceId],
          startsAt: raceSlotStart,
          customerName: `Racer #${i + 1}`,
          customerUserId,
        });
      });

      const results = await Promise.allSettled(promises);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      // Verify strict invariant
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(concurrencyCount - 1);

      // Verify that all rejections are ConflictError('APPOINTMENT_SLOT_UNAVAILABLE')
      for (const rej of rejected) {
        if (rej.status === "rejected") {
          expect(rej.reason).toBeInstanceOf(ConflictError);
          expect((rej.reason as ConflictError).message).toContain("APPOINTMENT_SLOT_UNAVAILABLE");
        }
      }
    });
  });

  describe("4. Idempotency & Replay", () => {
    it("should return cached appointment on repeated request with same Idempotency-Key", async () => {
      const idempSlotStart = new Date("2026-10-16T21:00:00.000Z");
      const idempotencyKey = `idemp-key-${crypto.randomUUID()}`;

      // First call
      const firstCall = await createAppointmentUseCase.execute({
        tenantId,
        locationId,
        staffId,
        serviceIds: [serviceId],
        startsAt: idempSlotStart,
        customerName: "Idempotent Customer",
        customerUserId,
        idempotencyKey,
      });

      expect(firstCall.isIdempotentReplay).toBeFalsy();
      expect(firstCall.appointment.appointment.id).toBeDefined();

      // Second call with same key and data
      const secondCall = await createAppointmentUseCase.execute({
        tenantId,
        locationId,
        staffId,
        serviceIds: [serviceId],
        startsAt: idempSlotStart,
        customerName: "Idempotent Customer",
        customerUserId,
        idempotencyKey,
      });

      expect(secondCall.isIdempotentReplay).toBe(true);
      expect(secondCall.appointment.appointment.id).toBe(firstCall.appointment.appointment.id);
    });
  });

  describe("5. State Machine & Optimistic Locking", () => {
    it("should validate allowed status transitions and reject invalid ones", async () => {
      const testStart = new Date("2026-10-16T22:00:00.000Z");

      const created = await createAppointmentUseCase.execute({
        tenantId,
        locationId,
        staffId,
        serviceIds: [serviceId],
        startsAt: testStart,
        customerName: "Workflow Customer",
        customerUserId,
      });

      const apptId = created.appointment.appointment.id;

      // CONFIRMED -> CHECKED_IN
      const step1 = await mutateStatusUseCase.execute({
        tenantId,
        appointmentId: apptId,
        targetStatus: "CHECKED_IN",
      });
      expect(step1.status).toBe("CHECKED_IN");
      expect(step1.version).toBe(2);

      // CHECKED_IN -> IN_PROGRESS
      const step2 = await mutateStatusUseCase.execute({
        tenantId,
        appointmentId: apptId,
        targetStatus: "IN_PROGRESS",
      });
      expect(step2.status).toBe("IN_PROGRESS");
      expect(step2.version).toBe(3);

      // IN_PROGRESS -> COMPLETED
      const step3 = await mutateStatusUseCase.execute({
        tenantId,
        appointmentId: apptId,
        targetStatus: "COMPLETED",
      });
      expect(step3.status).toBe("COMPLETED");
      expect(step3.version).toBe(4);

      // COMPLETED is terminal: trying to transition to IN_PROGRESS must fail
      await expect(
        mutateStatusUseCase.execute({
          tenantId,
          appointmentId: apptId,
          targetStatus: "IN_PROGRESS",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should reject concurrent update when expectedVersion does not match", async () => {
      const testStart = new Date("2026-10-16T22:45:00.000Z");

      const created = await createAppointmentUseCase.execute({
        tenantId,
        locationId,
        staffId,
        serviceIds: [serviceId],
        startsAt: testStart,
        customerName: "Locking Customer",
        customerUserId,
      });

      const apptId = created.appointment.appointment.id;

      // Provide outdated version (e.g. 99)
      await expect(
        mutateStatusUseCase.execute({
          tenantId,
          appointmentId: apptId,
          targetStatus: "CANCELLED",
          expectedVersion: 99,
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("6. Cross-Tenant Security Isolation", () => {
    it("should fail when attempting to book a service from another tenant", async () => {
      const testStart = new Date("2026-10-16T23:30:00.000Z");

      await expect(
        createAppointmentUseCase.execute({
          tenantId, // Tenant A
          locationId,
          staffId,
          serviceIds: [serviceBId], // Belongs to Tenant B!
          startsAt: testStart,
          customerName: "Attacker",
          customerUserId,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
