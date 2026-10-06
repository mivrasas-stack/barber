import { StaffProfile, StaffServiceAssignment, StaffLocationAssignment } from "./staff-profile";

export interface CreateStaffProfileInput {
  tenantId: string;
  membershipId: string;
  displayName: string;
  bio?: string;
  status?: string;
}

export interface AssignStaffServiceInput {
  staffId: string;
  serviceId: string;
  durationOverrideMinutes?: number;
  priceOverrideMinor?: number;
}

export interface StaffRepository {
  findById(id: string): Promise<StaffProfile | null>;
  findByMembershipId(membershipId: string): Promise<StaffProfile | null>;
  listByTenant(tenantId: string): Promise<StaffProfile[]>;
  listByLocation(locationId: string): Promise<StaffProfile[]>;
  create(input: CreateStaffProfileInput): Promise<StaffProfile>;
  assignLocation(staffId: string, locationId: string): Promise<void>;
  assignService(input: AssignStaffServiceInput): Promise<void>;
  getStaffServices(staffId: string): Promise<StaffServiceAssignment[]>;
  getStaffLocations(staffId: string): Promise<StaffLocationAssignment[]>;
}
