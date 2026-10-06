import { ValidationError } from "@/shared/errors/app-error";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type AppointmentSource = "ONLINE" | "WALK_IN" | "PHONE";

export interface AppointmentProps {
  id: string;
  tenantId: string;
  locationId: string;
  customerUserId?: string | null;
  customerNameSnapshot: string;
  customerEmailSnapshot?: string | null;
  customerPhoneSnapshot?: string | null;
  staffId: string;
  status: AppointmentStatus;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  source: AppointmentSource;
  notes?: string | null;
  createdByUserId?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date | null;
  completedAt?: Date | null;
}

export interface AppointmentServiceItem {
  id: string;
  appointmentId: string;
  serviceId: string;
  serviceNameSnapshot: string;
  durationMinutes: number;
  priceMinor: number;
  currency: string;
  position: number;
}

export const ALLOWED_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export class Appointment {
  constructor(private readonly props: AppointmentProps) {
    if (this.props.startsAt >= this.props.endsAt) {
      throw new ValidationError("Appointment startsAt must be strictly before endsAt");
    }
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get locationId(): string {
    return this.props.locationId;
  }

  get customerUserId(): string | null | undefined {
    return this.props.customerUserId;
  }

  get customerNameSnapshot(): string {
    return this.props.customerNameSnapshot;
  }

  get customerEmailSnapshot(): string | null | undefined {
    return this.props.customerEmailSnapshot;
  }

  get customerPhoneSnapshot(): string | null | undefined {
    return this.props.customerPhoneSnapshot;
  }

  get staffId(): string {
    return this.props.staffId;
  }

  get status(): AppointmentStatus {
    return this.props.status;
  }

  get startsAt(): Date {
    return this.props.startsAt;
  }

  get endsAt(): Date {
    return this.props.endsAt;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get source(): AppointmentSource {
    return this.props.source;
  }

  get notes(): string | null | undefined {
    return this.props.notes;
  }

  get createdByUserId(): string | null | undefined {
    return this.props.createdByUserId;
  }

  get version(): number {
    return this.props.version;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get cancelledAt(): Date | null | undefined {
    return this.props.cancelledAt;
  }

  get completedAt(): Date | null | undefined {
    return this.props.completedAt;
  }

  canTransitionTo(targetStatus: AppointmentStatus): boolean {
    const allowed = ALLOWED_STATUS_TRANSITIONS[this.status];
    return allowed.includes(targetStatus);
  }

  assertCanTransitionTo(targetStatus: AppointmentStatus): void {
    if (!this.canTransitionTo(targetStatus)) {
      throw new ValidationError(
        `Invalid appointment status transition from '${this.status}' to '${targetStatus}'`
      );
    }
  }
}
