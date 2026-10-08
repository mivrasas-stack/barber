import { IProductRepository } from "../domain/product.repository";
import { Product } from "../domain/product";

export interface UpdateProductInput {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  brand?: string;
  categoryId?: string;
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED";
  trackInventory?: boolean;
}

export class UpdateProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(input: UpdateProductInput): Promise<Product> {
    const existing = await this.productRepository.findById(input.id);
    if (!existing) {
      throw new Error("Product not found");
    }

    return await this.productRepository.update(input);
  }
}
