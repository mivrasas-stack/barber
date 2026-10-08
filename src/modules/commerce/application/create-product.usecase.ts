import { IProductRepository } from "../domain/product.repository";
import { Product, ProductVariant } from "../domain/product";

export interface CreateProductInput {
  id?: string;
  ownerTenantId: string;
  name: string;
  slug?: string;
  description?: string;
  brand?: string;
  categoryId?: string;
  trackInventory?: boolean;
  defaultTaxCategory?: string;
  variants: Array<{
    id?: string;
    sku: string;
    name: string;
    priceMinor: bigint;
    costMinor?: bigint | null;
    barcode?: string;
    currency?: string;
    trackInventory?: boolean;
    reorderPoint?: number;
  }>;
}

export class CreateProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(input: CreateProductInput): Promise<Product & { variants: ProductVariant[] }> {
    const slug = input.slug || this.generateSlug(input.name);

    if (!input.variants || input.variants.length === 0) {
      throw new Error("At least one product variant is required");
    }

    return await this.productRepository.save(
      {
        id: input.id,
        ownerTenantId: input.ownerTenantId,
        name: input.name,
        slug,
        description: input.description,
        brand: input.brand,
        categoryId: input.categoryId,
        trackInventory: input.trackInventory ?? true,
        defaultTaxCategory: input.defaultTaxCategory,
        status: "ACTIVE",
      },
      input.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        priceMinor: v.priceMinor,
        costMinor: v.costMinor,
        barcode: v.barcode,
        currency: v.currency || "COP",
        trackInventory: v.trackInventory ?? true,
        reorderPoint: v.reorderPoint ?? 5,
        status: "ACTIVE" as const,
      }))
    );
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}
