export interface BusinessHours {
  id: string;
  locationId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  openLocalTime: string; // "08:00"
  closeLocalTime: string; // "20:00"
  isClosed: boolean;
}

export interface AvailabilityRule {
  id: string;
  tenantId: string;
  staffId: string;
  locationId: string;
  dayOfWeek: number;
  startLocalTime: string; // "09:00"
  endLocalTime: string; // "18:00"
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
}

export interface AvailabilityException {
  id: string;
  tenantId: string;
  staffId: string;
  locationId: string;
  startsAt: Date;
  endsAt: Date;
  type: "BLOCKED" | "AVAILABLE_OVERRIDE" | "VACATION" | "SICK_LEAVE" | "BREAK" | string;
  reason?: string | null;
}

export interface BookedInterval {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
}

export interface TimeSlot {
  startsAt: string; // ISO 8601 string
  endsAt: string;   // ISO 8601 string
  staffId: string;
  locationId: string;
  durationMinutes: number;
}
