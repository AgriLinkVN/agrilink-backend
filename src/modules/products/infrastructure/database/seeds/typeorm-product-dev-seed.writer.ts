import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "../../persistence/entities/product.entity";
import { ProductImage } from "../../persistence/entities/product-image.entity";
import {
  ProductDevPrimaryImageRecord,
  ProductDevPrimaryImageWriteData,
  ProductDevSeedRecord,
  ProductDevSeedWriteData,
  ProductDevSeedWriter,
} from "./product-development-seed.service";

@Injectable()
export class TypeOrmProductDevSeedWriter implements ProductDevSeedWriter {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepository: Repository<ProductImage>,
  ) {}

  findProductBySku(sku: string): Promise<ProductDevSeedRecord | null> {
    return this.productRepository.findOne({
      select: { id: true },
      where: { sku },
    });
  }

  createProduct(data: ProductDevSeedWriteData): Promise<ProductDevSeedRecord> {
    return this.productRepository.save(this.productRepository.create(data));
  }

  async updateProduct(
    id: string,
    data: ProductDevSeedWriteData,
  ): Promise<void> {
    await this.productRepository.update(id, data);
  }

  findPrimaryImages(
    productId: string,
  ): Promise<readonly ProductDevPrimaryImageRecord[]> {
    return this.imageRepository.find({
      select: { id: true },
      where: { productId, isPrimary: true },
    });
  }

  async createPrimaryImage(
    data: ProductDevPrimaryImageWriteData,
  ): Promise<void> {
    await this.imageRepository.save(this.imageRepository.create(data));
  }

  async updatePrimaryImage(
    id: string,
    data: ProductDevPrimaryImageWriteData,
  ): Promise<void> {
    await this.imageRepository.update(id, data);
  }
}
