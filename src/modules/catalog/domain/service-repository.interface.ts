import { Service } from "./service";

export interface CreateServiceInput {
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  priceMinor: number;
  currency?: string;
}

export interface ServiceRepository {
  findById(id: string): Promise<Service | null>;
  findByTenantAndSlug(tenantId: string, slug: string): Promise<Service | null>;
  listByTenant(tenantId: string): Promise<Service[]>;
  listByLocation(locationId: string): Promise<Service[]>;
  create(input: CreateServiceInput): Promise<Service>;
  assignToLocation(locationId: string, serviceId: string, priceOverride?: number, durationOverride?: number): Promise<void>;
}
