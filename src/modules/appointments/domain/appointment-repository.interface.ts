import {
  Appointment,
  AppointmentProps,
  AppointmentServiceItem,
  AppointmentStatus,
} from "./appointment";

export interface AppointmentFilter {
  tenantId: string;
  locationId?: string;
  staffId?: string;
  customerUserId?: string;
  status?: AppointmentStatus | AppointmentStatus[];
  from?: Date;
  to?: Date;
}

export interface CreateAppointmentTxInput {
  appointment: Omit<AppointmentProps, "id" | "version" | "createdAt" | "updatedAt">;
  services: {
    serviceId: string;
    serviceNameSnapshot: string;
    durationMinutes: number;
    priceMinor: number;
    currency: string;
    position: number;
  }[];
  actorUserId?: string | null;
  outboxEvent: {
    eventType: string;
    aggregateId: string;
    tenantId: string;
    locationId?: string;
    payload: Record<string, unknown>;
  };
  auditLog: {
    tenantId: string;
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    stateAfter: Record<string, unknown>;
  };
}

export interface UpdateStatusTxInput {
  appointmentId: string;
  expectedVersion: number;
  fromStatus: AppointmentStatus;
  toStatus: AppointmentStatus;
  actorUserId?: string | null;
  reason?: string;
  outboxEvent: {
    eventType: string;
    aggregateId: string;
    tenantId: string;
    locationId?: string;
    payload: Record<string, unknown>;
  };
  auditLog: {
    tenantId: string;
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    stateBefore?: Record<string, unknown>;
    stateAfter: Record<string, unknown>;
  };
}

export interface AppointmentWithServices {
  appointment: Appointment;
  services: AppointmentServiceItem[];
}

export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  findServicesByAppointmentId(appointmentId: string): Promise<AppointmentServiceItem[]>;
  list(filter: AppointmentFilter): Promise<AppointmentWithServices[]>;
  createWithDetails(input: CreateAppointmentTxInput): Promise<AppointmentWithServices>;
  updateStatusWithDetails(input: UpdateStatusTxInput): Promise<Appointment>;
}
