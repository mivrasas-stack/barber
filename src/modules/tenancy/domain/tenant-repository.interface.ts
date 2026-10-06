import { Tenant, TenantId } from "./tenant";
import { Location } from "./location";

export interface CreateTenantInput {
  name: string;
  slug: string;
  defaultCurrency?: string;
  defaultTimezone?: string;
}

export interface CreateLocationInput {
  tenantId: TenantId;
  name: string;
  slug: string;
  address?: string;
  timezone?: string;
  currency?: string;
}

export interface TenantRepository {
  findById(id: TenantId): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  create(input: CreateTenantInput): Promise<Tenant>;
  getLocations(tenantId: TenantId): Promise<Location[]>;
  createLocation(input: CreateLocationInput): Promise<Location>;
}
