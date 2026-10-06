import {
  BusinessHours,
  AvailabilityRule,
  AvailabilityException,
  BookedInterval,
} from "./scheduling-types";

export interface CreateBusinessHoursInput {
  locationId: string;
  dayOfWeek: number;
  openLocalTime: string;
  closeLocalTime: string;
  isClosed?: boolean;
}

export interface CreateAvailabilityRuleInput {
  tenantId: string;
  staffId: string;
  locationId: string;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

export interface CreateAvailabilityExceptionInput {
  tenantId: string;
  staffId: string;
  locationId: string;
  startsAt: Date;
  endsAt: Date;
  type: string;
  reason?: string;
}

export interface SchedulingRepository {
  getLocationBusinessHours(locationId: string): Promise<BusinessHours[]>;
  upsertLocationBusinessHours(input: CreateBusinessHoursInput[]): Promise<void>;
  getStaffAvailabilityRules(staffId: string, locationId: string): Promise<AvailabilityRule[]>;
  createAvailabilityRule(input: CreateAvailabilityRuleInput): Promise<AvailabilityRule>;
  getAvailabilityExceptions(
    staffId: string,
    locationId: string,
    from: Date,
    to: Date
  ): Promise<AvailabilityException[]>;
  createAvailabilityException(input: CreateAvailabilityExceptionInput): Promise<AvailabilityException>;
  getBookedIntervals(staffId: string, from: Date, to: Date): Promise<BookedInterval[]>;
}
