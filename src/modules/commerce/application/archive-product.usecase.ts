import { IProductRepository } from "../domain/product.repository";

export class ArchiveProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.productRepository.findById(id);
    if (!existing) {
      throw new Error("Product not found");
    }
    await this.productRepository.archive(id);
  }
}
