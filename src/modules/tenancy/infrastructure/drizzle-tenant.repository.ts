import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { tenants, TenantRow } from "@/infrastructure/database/schema/tenants";
import { locations, LocationRow } from "@/infrastructure/database/schema/locations";
import { Tenant, TenantId } from "../domain/tenant";
import { Location } from "../domain/location";
import {
  CreateTenantInput,
  CreateLocationInput,
  TenantRepository,
} from "../domain/tenant-repository.interface";
import { ConflictError } from "@/shared/errors/app-error";

export class DrizzleTenantRepository implements TenantRepository {
  private toTenantDomain(row: TenantRow): Tenant {
    return new Tenant({
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status as "ACTIVE" | "SUSPENDED" | "CANCELLED",
      defaultCurrency: row.defaultCurrency,
      defaultTimezone: row.defaultTimezone,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toLocationDomain(row: LocationRow): Location {
    return new Location({
      id: row.id,
      tenantId: row.tenantId,
      slug: row.slug,
      name: row.name,
      address: row.address,
      timezone: row.timezone,
      currency: row.currency,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findById(id: TenantId): Promise<Tenant | null> {
    const rows = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!rows[0]) return null;
    return this.toTenantDomain(rows[0]);
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const rows = await db.select().from(tenants).where(eq(tenants.slug, slug.trim().toLowerCase())).limit(1);
    if (!rows[0]) return null;
    return this.toTenantDomain(rows[0]);
  }

  async create(input: CreateTenantInput): Promise<Tenant> {
    const slug = input.slug.trim().toLowerCase();
    const existing = await this.findBySlug(slug);
    if (existing) {
      throw new ConflictError(`Tenant with slug '${slug}' already exists`);
    }

    const [row] = await db
      .insert(tenants)
      .values({
        name: input.name.trim(),
        slug,
        defaultCurrency: input.defaultCurrency ?? "COP",
        defaultTimezone: input.defaultTimezone ?? "America/Bogota",
      })
      .returning();

    return this.toTenantDomain(row);
  }

  async getLocations(tenantId: TenantId): Promise<Location[]> {
    const rows = await db.select().from(locations).where(eq(locations.tenantId, tenantId));
    return rows.map((r) => this.toLocationDomain(r));
  }

  async createLocation(input: CreateLocationInput): Promise<Location> {
    const slug = input.slug.trim().toLowerCase();
    const [row] = await db
      .insert(locations)
      .values({
        tenantId: input.tenantId,
        name: input.name.trim(),
        slug,
        address: input.address,
        timezone: input.timezone ?? "America/Bogota",
        currency: input.currency ?? "COP",
      })
      .returning();

    return this.toLocationDomain(row);
  }
}
