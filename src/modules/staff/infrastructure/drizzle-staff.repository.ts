import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  staffProfiles,
  staffLocations,
  staffServices,
  StaffProfileRow,
  StaffLocationRow,
  StaffServiceRow,
} from "@/infrastructure/database/schema/staff";
import {
  StaffProfile,
  StaffLocationAssignment,
  StaffServiceAssignment,
} from "../domain/staff-profile";
import {
  StaffRepository,
  CreateStaffProfileInput,
  AssignStaffServiceInput,
} from "../domain/staff-repository.interface";
import { ConflictError } from "@/shared/errors/app-error";

export class DrizzleStaffRepository implements StaffRepository {
  private toDomain(row: StaffProfileRow): StaffProfile {
    return new StaffProfile({
      id: row.id,
      tenantId: row.tenantId,
      membershipId: row.membershipId,
      displayName: row.displayName,
      bio: row.bio,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toLocationDomain(row: StaffLocationRow): StaffLocationAssignment {
    return {
      id: row.id,
      staffId: row.staffId,
      locationId: row.locationId,
      status: row.status,
    };
  }

  private toServiceDomain(row: StaffServiceRow): StaffServiceAssignment {
    return {
      id: row.id,
      staffId: row.staffId,
      serviceId: row.serviceId,
      durationOverrideMinutes: row.durationOverrideMinutes,
      priceOverrideMinor: row.priceOverrideMinor,
      isActive: row.isActive,
    };
  }

  async findById(id: string): Promise<StaffProfile | null> {
    const rows = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.id, id))
      .limit(1);
    if (!rows[0]) return null;
    return this.toDomain(rows[0]);
  }

  async findByMembershipId(membershipId: string): Promise<StaffProfile | null> {
    const rows = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.membershipId, membershipId))
      .limit(1);
    if (!rows[0]) return null;
    return this.toDomain(rows[0]);
  }

  async listByTenant(tenantId: string): Promise<StaffProfile[]> {
    const rows = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.tenantId, tenantId));
    return rows.map((r) => this.toDomain(r));
  }

  async listByLocation(locationId: string): Promise<StaffProfile[]> {
    const rows = await db
      .select({ profile: staffProfiles })
      .from(staffLocations)
      .innerJoin(staffProfiles, eq(staffLocations.staffId, staffProfiles.id))
      .where(
        and(
          eq(staffLocations.locationId, locationId),
          eq(staffLocations.status, "ACTIVE")
        )
      );
    return rows.map((r) => this.toDomain(r.profile));
  }

  async create(input: CreateStaffProfileInput): Promise<StaffProfile> {
    const existing = await this.findByMembershipId(input.membershipId);
    if (existing) {
      throw new ConflictError("Staff profile already exists for this membership");
    }

    const [row] = await db
      .insert(staffProfiles)
      .values({
        tenantId: input.tenantId,
        membershipId: input.membershipId,
        displayName: input.displayName.trim(),
        bio: input.bio,
        status: input.status ?? "ACTIVE",
      })
      .returning();

    return this.toDomain(row);
  }

  async assignLocation(staffId: string, locationId: string): Promise<void> {
    await db
      .insert(staffLocations)
      .values({
        staffId,
        locationId,
        status: "ACTIVE",
      })
      .onConflictDoUpdate({
        target: [staffLocations.staffId, staffLocations.locationId],
        set: {
          status: "ACTIVE",
        },
      });
  }

  async assignService(input: AssignStaffServiceInput): Promise<void> {
    await db
      .insert(staffServices)
      .values({
        staffId: input.staffId,
        serviceId: input.serviceId,
        durationOverrideMinutes: input.durationOverrideMinutes,
        priceOverrideMinor: input.priceOverrideMinor,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [staffServices.staffId, staffServices.serviceId],
        set: {
          durationOverrideMinutes: input.durationOverrideMinutes,
          priceOverrideMinor: input.priceOverrideMinor,
          isActive: true,
        },
      });
  }

  async getStaffServices(staffId: string): Promise<StaffServiceAssignment[]> {
    const rows = await db
      .select()
      .from(staffServices)
      .where(and(eq(staffServices.staffId, staffId), eq(staffServices.isActive, true)));
    return rows.map((r) => this.toServiceDomain(r));
  }

  async getStaffLocations(staffId: string): Promise<StaffLocationAssignment[]> {
    const rows = await db
      .select()
      .from(staffLocations)
      .where(and(eq(staffLocations.staffId, staffId), eq(staffLocations.status, "ACTIVE")));
    return rows.map((r) => this.toLocationDomain(r));
  }
}
