import { eq, and, inArray, ilike, desc } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  products,
  productVariants,
  productCategories,
  ProductRow,
  ProductVariantRow,
  ProductCategoryRow,
} from "@/infrastructure/database/schema/commerce";
import { IProductRepository } from "../domain/product.repository";
import { Product, ProductVariant, ProductCategory } from "../domain/product";

export class DrizzleProductRepository implements IProductRepository {
  async findById(id: string): Promise<(Product & { variants: ProductVariant[] }) | null> {
    const [p] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!p) return null;

    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(desc(productVariants.createdAt));

    return this.mapProductWithVariants(p, variants);
  }

  async findBySlug(
    ownerTenantId: string,
    slug: string
  ): Promise<(Product & { variants: ProductVariant[] }) | null> {
    const [p] = await db
      .select()
      .from(products)
      .where(and(eq(products.ownerTenantId, ownerTenantId), eq(products.slug, slug)))
      .limit(1);
    if (!p) return null;

    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, p.id));

    return this.mapProductWithVariants(p, variants);
  }

  async findVariantById(variantId: string): Promise<(ProductVariant & { product?: Product }) | null> {
    const [v] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);
    if (!v) return null;

    const [p] = await db
      .select()
      .from(products)
      .where(eq(products.id, v.productId))
      .limit(1);

    return {
      ...this.mapVariant(v),
      product: p ? this.mapProduct(p) : undefined,
    };
  }

  async findVariantBySku(sku: string): Promise<ProductVariant | null> {
    const [v] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.sku, sku))
      .limit(1);
    if (!v) return null;
    return this.mapVariant(v);
  }

  async findVariantsByIds(ids: string[]): Promise<ProductVariant[]> {
    if (ids.length === 0) return [];
    const rows = await db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.id, ids));
    return rows.map((r) => this.mapVariant(r));
  }

  async findProductsByOwner(
    ownerTenantId: string,
    options?: { categoryId?: string; status?: string; search?: string }
  ): Promise<Array<Product & { variants: ProductVariant[] }>> {
    const conditions = [eq(products.ownerTenantId, ownerTenantId)];

    if (options?.categoryId) {
      conditions.push(eq(products.categoryId, options.categoryId));
    }
    if (options?.status) {
      conditions.push(eq(products.status, options.status));
    }
    if (options?.search) {
      conditions.push(ilike(products.name, `%${options.search}%`));
    }

    const prodRows = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt));

    if (prodRows.length === 0) return [];

    const productIds = prodRows.map((p) => p.id);
    const variantRows = await db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds));

    const variantsByProductId = new Map<string, ProductVariantRow[]>();
    for (const v of variantRows) {
      const list = variantsByProductId.get(v.productId) || [];
      list.push(v);
      variantsByProductId.set(v.productId, list);
    }

    return prodRows.map((p) =>
      this.mapProductWithVariants(p, variantsByProductId.get(p.id) || [])
    );
  }

  async save(
    product: Omit<Product, "id" | "createdAt" | "updatedAt"> & { id?: string },
    variants: Array<Omit<ProductVariant, "id" | "productId" | "createdAt" | "updatedAt"> & { id?: string }>
  ): Promise<Product & { variants: ProductVariant[] }> {
    return await db.transaction(async (tx) => {
      const [insertedProduct] = await tx
        .insert(products)
        .values({
          ...(product.id ? { id: product.id } : {}),
          ownerTenantId: product.ownerTenantId,
          categoryId: product.categoryId || null,
          name: product.name,
          slug: product.slug,
          description: product.description || null,
          brand: product.brand || null,
          status: product.status || "ACTIVE",
          trackInventory: product.trackInventory ?? true,
          defaultTaxCategory: product.defaultTaxCategory || null,
        })
        .returning();

      const insertedVariants: ProductVariantRow[] = [];
      for (const v of variants) {
        const [variantRow] = await tx
          .insert(productVariants)
          .values({
            ...(v.id ? { id: v.id } : {}),
            productId: insertedProduct.id,
            sku: v.sku,
            barcode: v.barcode || null,
            name: v.name || "Default",
            priceMinor: v.priceMinor,
            costMinor: v.costMinor ?? null,
            currency: v.currency || "COP",
            status: v.status || "ACTIVE",
            trackInventory: v.trackInventory ?? true,
            reorderPoint: v.reorderPoint ?? 5,
          })
          .returning();
        insertedVariants.push(variantRow);
      }

      return this.mapProductWithVariants(insertedProduct, insertedVariants);
    });
  }

  async update(product: Partial<Product> & { id: string }): Promise<Product> {
    const [updated] = await db
      .update(products)
      .set({
        ...(product.name !== undefined ? { name: product.name } : {}),
        ...(product.slug !== undefined ? { slug: product.slug } : {}),
        ...(product.description !== undefined ? { description: product.description } : {}),
        ...(product.brand !== undefined ? { brand: product.brand } : {}),
        ...(product.status !== undefined ? { status: product.status } : {}),
        ...(product.categoryId !== undefined ? { categoryId: product.categoryId } : {}),
        ...(product.trackInventory !== undefined ? { trackInventory: product.trackInventory } : {}),
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id))
      .returning();

    return this.mapProduct(updated);
  }

  async archive(id: string): Promise<void> {
    await db
      .update(products)
      .set({ status: "ARCHIVED", updatedAt: new Date() })
      .where(eq(products.id, id));
  }

  async saveVariant(
    productId: string,
    variant: Omit<ProductVariant, "id" | "productId" | "createdAt" | "updatedAt"> & { id?: string }
  ): Promise<ProductVariant> {
    const [row] = await db
      .insert(productVariants)
      .values({
        ...(variant.id ? { id: variant.id } : {}),
        productId,
        sku: variant.sku,
        barcode: variant.barcode || null,
        name: variant.name,
        priceMinor: variant.priceMinor,
        costMinor: variant.costMinor ?? null,
        currency: variant.currency || "COP",
        status: variant.status || "ACTIVE",
        trackInventory: variant.trackInventory ?? true,
        reorderPoint: variant.reorderPoint ?? 5,
      })
      .returning();
    return this.mapVariant(row);
  }

  async findCategories(tenantId?: string | null): Promise<ProductCategory[]> {
    const conditions = tenantId
      ? [eq(productCategories.tenantId, tenantId)]
      : [];
    const rows = await db
      .select()
      .from(productCategories)
      .where(and(...conditions))
      .orderBy(productCategories.name);
    return rows.map((r) => this.mapCategory(r));
  }

  private mapProduct(row: ProductRow): Product {
    return {
      id: row.id,
      ownerTenantId: row.ownerTenantId,
      categoryId: row.categoryId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      brand: row.brand,
      status: row.status as any,
      trackInventory: row.trackInventory,
      defaultTaxCategory: row.defaultTaxCategory,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapVariant(row: ProductVariantRow): ProductVariant {
    return {
      id: row.id,
      productId: row.productId,
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      priceMinor: row.priceMinor,
      costMinor: row.costMinor,
      currency: row.currency,
      status: row.status as any,
      trackInventory: row.trackInventory,
      reorderPoint: row.reorderPoint,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapProductWithVariants(
    productRow: ProductRow,
    variantRows: ProductVariantRow[]
  ): Product & { variants: ProductVariant[] } {
    return {
      ...this.mapProduct(productRow),
      variants: variantRows.map((v) => this.mapVariant(v)),
    };
  }

  private mapCategory(row: ProductCategoryRow): ProductCategory {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      parentId: row.parentId,
      status: row.status as any,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
