import { NotFoundError } from "@/shared/errors/app-error";
import { ServiceRepository } from "@/modules/catalog/domain/service-repository.interface";
import { StaffRepository } from "@/modules/staff/domain/staff-repository.interface";
import { SchedulingRepository } from "../domain/scheduling-repository.interface";
import { TimeSlot } from "../domain/scheduling-types";
import { parseLocalDateToUtc, getDayOfWeekFromDateString } from "@/shared/utils/date-tz";

export interface GetAvailableSlotsInput {
  tenantId: string;
  locationId: string;
  serviceId: string;
  staffId?: string;
  date: string; // YYYY-MM-DD
  timezone?: string; // default: "America/Bogota"
  slotIntervalMinutes?: number; // default: 15
}

export class GetAvailableSlotsUseCase {
  constructor(
    private readonly schedulingRepo: SchedulingRepository,
    private readonly serviceRepo: ServiceRepository,
    private readonly staffRepo: StaffRepository
  ) {}

  async execute(input: GetAvailableSlotsInput): Promise<TimeSlot[]> {
    const timezone = input.timezone ?? "America/Bogota";
    const slotInterval = input.slotIntervalMinutes ?? 15;

    // 1. Fetch service
    const service = await this.serviceRepo.findById(input.serviceId);
    if (!service || service.tenantId !== input.tenantId) {
      throw new NotFoundError("Service not found");
    }

    // 2. Fetch business hours for the requested date's day of week
    const dayOfWeek = getDayOfWeekFromDateString(input.date);
    const businessHoursList = await this.schedulingRepo.getLocationBusinessHours(input.locationId);
    const dayBusinessHours = businessHoursList.find((bh) => bh.dayOfWeek === dayOfWeek);

    if (!dayBusinessHours || dayBusinessHours.isClosed) {
      return [];
    }

    const locOpenUtc = parseLocalDateToUtc(input.date, dayBusinessHours.openLocalTime, timezone);
    const locCloseUtc = parseLocalDateToUtc(input.date, dayBusinessHours.closeLocalTime, timezone);

    if (locOpenUtc >= locCloseUtc) {
      return [];
    }

    // 3. Resolve eligible staff
    let candidateStaffIds: string[] = [];
    if (input.staffId) {
      candidateStaffIds = [input.staffId];
    } else {
      const locationStaff = await this.staffRepo.listByLocation(input.locationId);
      candidateStaffIds = locationStaff.map((s) => s.id);
    }

    const availableSlots: TimeSlot[] = [];

    // 4. Iterate staff and calculate slots
    for (const staffId of candidateStaffIds) {
      // Check if staff offers the service
      const staffServices = await this.staffRepo.getStaffServices(staffId);
      const staffService = staffServices.find((s) => s.serviceId === input.serviceId);
      // If specific staff was requested or staff list is filtered, ensure active service
      if (!staffService && input.staffId) {
        // Requested staff does not perform this service
        continue;
      }
      if (staffServices.length > 0 && !staffService) {
        // Staff has assignments and doesn't offer this service
        continue;
      }

      const durationMinutes =
        staffService?.durationOverrideMinutes ??
        service.totalOccupiedMinutes;

      const durationMs = durationMinutes * 60 * 1000;

      // Staff availability rules for this day
      const staffRules = await this.schedulingRepo.getStaffAvailabilityRules(staffId, input.locationId);
      const rule = staffRules.find((r) => r.dayOfWeek === dayOfWeek && r.isActive);
      if (!rule) {
        continue; // Staff does not work on this day
      }

      const staffStartUtc = parseLocalDateToUtc(input.date, rule.startLocalTime, timezone);
      const staffEndUtc = parseLocalDateToUtc(input.date, rule.endLocalTime, timezone);

      const effectiveStart = new Date(Math.max(locOpenUtc.getTime(), staffStartUtc.getTime()));
      const effectiveEnd = new Date(Math.min(locCloseUtc.getTime(), staffEndUtc.getTime()));

      if (effectiveStart.getTime() + durationMs > effectiveEnd.getTime()) {
        continue;
      }

      // Fetch exceptions & existing appointments
      const [exceptions, bookedIntervals] = await Promise.all([
        this.schedulingRepo.getAvailabilityExceptions(staffId, input.locationId, effectiveStart, effectiveEnd),
        this.schedulingRepo.getBookedIntervals(staffId, effectiveStart, effectiveEnd),
      ]);

      const intervalMs = slotInterval * 60 * 1000;
      let slotStartMs = effectiveStart.getTime();
      const lastPossibleStartMs = effectiveEnd.getTime() - durationMs;

      while (slotStartMs <= lastPossibleStartMs) {
        const slotEndMs = slotStartMs + durationMs;
        const slotStartDate = new Date(slotStartMs);
        const slotEndDate = new Date(slotEndMs);

        // Check collisions with exceptions
        const hasExceptionCollision = exceptions.some((ex) => {
          if (ex.type === "AVAILABLE_OVERRIDE") return false;
          return slotStartDate < ex.endsAt && slotEndDate > ex.startsAt;
        });

        // Check collisions with existing active appointments
        const hasBookingCollision = bookedIntervals.some((b) => {
          return slotStartDate < b.endsAt && slotEndDate > b.startsAt;
        });

        if (!hasExceptionCollision && !hasBookingCollision) {
          availableSlots.push({
            startsAt: slotStartDate.toISOString(),
            endsAt: slotEndDate.toISOString(),
            staffId,
            locationId: input.locationId,
            durationMinutes,
          });
        }

        slotStartMs += intervalMs;
      }
    }

    // Sort chronologically by startsAt
    availableSlots.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    return availableSlots;
  }
}
