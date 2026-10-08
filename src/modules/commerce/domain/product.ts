export interface ProductCategory {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode?: string | null;
  name: string;
  priceMinor: bigint;
  costMinor?: bigint | null;
  currency: string;
  status: "ACTIVE" | "ARCHIVED";
  trackInventory: boolean;
  reorderPoint?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  ownerTenantId: string;
  categoryId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  brand?: string | null;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  trackInventory: boolean;
  defaultTaxCategory?: string | null;
  createdAt: Date;
  updatedAt: Date;
  variants?: ProductVariant[];
}
