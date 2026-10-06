import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { services, locationServices, ServiceRow } from "@/infrastructure/database/schema/services";
import { Service } from "../domain/service";
import { CreateServiceInput, ServiceRepository } from "../domain/service-repository.interface";
import { ConflictError } from "@/shared/errors/app-error";

export class DrizzleServiceRepository implements ServiceRepository {
  private toDomain(row: ServiceRow): Service {
    return new Service({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      durationMinutes: row.durationMinutes,
      bufferBeforeMinutes: row.bufferBeforeMinutes,
      bufferAfterMinutes: row.bufferAfterMinutes,
      priceMinor: row.priceMinor,
      currency: row.currency,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findById(id: string): Promise<Service | null> {
    const rows = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (!rows[0]) return null;
    return this.toDomain(rows[0]);
  }

  async findByTenantAndSlug(tenantId: string, slug: string): Promise<Service | null> {
    const rows = await db
      .select()
      .from(services)
      .where(and(eq(services.tenantId, tenantId), eq(services.slug, slug.trim().toLowerCase())))
      .limit(1);
    if (!rows[0]) return null;
    return this.toDomain(rows[0]);
  }

  async listByTenant(tenantId: string): Promise<Service[]> {
    const rows = await db.select().from(services).where(eq(services.tenantId, tenantId));
    return rows.map((r) => this.toDomain(r));
  }

  async listByLocation(locationId: string): Promise<Service[]> {
    const rows = await db
      .select({ service: services })
      .from(locationServices)
      .innerJoin(services, eq(locationServices.serviceId, services.id))
      .where(and(eq(locationServices.locationId, locationId), eq(locationServices.isActive, true)));

    return rows.map((r) => this.toDomain(r.service));
  }

  async create(input: CreateServiceInput): Promise<Service> {
    const slug = input.slug.trim().toLowerCase();
    const existing = await this.findByTenantAndSlug(input.tenantId, slug);
    if (existing) {
      throw new ConflictError(`Service with slug '${slug}' already exists in this tenant`);
    }

    const [row] = await db
      .insert(services)
      .values({
        tenantId: input.tenantId,
        name: input.name.trim(),
        slug,
        description: input.description,
        durationMinutes: input.durationMinutes,
        bufferBeforeMinutes: input.bufferBeforeMinutes ?? 0,
        bufferAfterMinutes: input.bufferAfterMinutes ?? 0,
        priceMinor: input.priceMinor,
        currency: input.currency ?? "COP",
      })
      .returning();

    return this.toDomain(row);
  }

  async assignToLocation(
    locationId: string,
    serviceId: string,
    priceOverride?: number,
    durationOverride?: number
  ): Promise<void> {
    await db
      .insert(locationServices)
      .values({
        locationId,
        serviceId,
        priceOverrideMinor: priceOverride,
        durationOverrideMinutes: durationOverride,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [locationServices.locationId, locationServices.serviceId],
        set: {
          priceOverrideMinor: priceOverride,
          durationOverrideMinutes: durationOverride,
          isActive: true,
        },
      });
  }
}
