import { Product, ProductVariant, ProductCategory } from "./product";

export interface IProductRepository {
  findById(id: string): Promise<(Product & { variants: ProductVariant[] }) | null>;
  findBySlug(ownerTenantId: string, slug: string): Promise<(Product & { variants: ProductVariant[] }) | null>;
  findVariantById(variantId: string): Promise<(ProductVariant & { product?: Product }) | null>;
  findVariantBySku(sku: string): Promise<ProductVariant | null>;
  findVariantsByIds(ids: string[]): Promise<ProductVariant[]>;
  findProductsByOwner(
    ownerTenantId: string,
    options?: { categoryId?: string; status?: string; search?: string }
  ): Promise<Array<Product & { variants: ProductVariant[] }>>;
  save(
    product: Omit<Product, "id" | "createdAt" | "updatedAt"> & { id?: string },
    variants: Array<Omit<ProductVariant, "id" | "productId" | "createdAt" | "updatedAt"> & { id?: string }>
  ): Promise<Product & { variants: ProductVariant[] }>;
  update(product: Partial<Product> & { id: string }): Promise<Product>;
  archive(id: string): Promise<void>;
  saveVariant(
    productId: string,
    variant: Omit<ProductVariant, "id" | "productId" | "createdAt" | "updatedAt"> & { id?: string }
  ): Promise<ProductVariant>;
  findCategories(tenantId?: string | null): Promise<ProductCategory[]>;
}
