import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Product } from "../../persistence/entities/product.entity";
import { ProductCertification } from "../../persistence/entities/product-certification.entity";
import { ProductImage } from "../../persistence/entities/product-image.entity";
import {
  ProductDevCertificationRecord,
  ProductDevCertificationWriteData,
  ProductDevPrimaryImageRecord,
  ProductDevPrimaryImageWriteData,
  ProductDevSeedRecord,
  ProductDevSeedWriteData,
  ProductDevSeedWriter,
  ProductDevelopmentSeedService,
} from "./product-development-seed.service";

@Injectable()
export class TypeOrmProductDevSeedWriter implements ProductDevSeedWriter {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepository: Repository<ProductImage>,
    @InjectRepository(ProductCertification)
    private readonly certificationRepository: Repository<ProductCertification>,
  ) {}

  findProductsBySku(sku: string): Promise<readonly ProductDevSeedRecord[]> {
    return this.productRepository.find({
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

  findCertifications(
    productId: string,
    certNumber: string,
  ): Promise<readonly ProductDevCertificationRecord[]> {
    return this.certificationRepository.find({
      select: { id: true },
      where: { productId, certNumber },
    });
  }

  async createCertification(
    data: ProductDevCertificationWriteData,
  ): Promise<void> {
    await this.certificationRepository.save(
      this.certificationRepository.create(data),
    );
  }

  async updateCertification(
    id: string,
    data: ProductDevCertificationWriteData,
  ): Promise<void> {
    await this.certificationRepository.update(id, data);
  }
}

export function createProductDevelopmentSeedGroup(
  dataSource: DataSource,
): ProductDevelopmentSeedService {
  return new ProductDevelopmentSeedService(
    new TypeOrmProductDevSeedWriter(
      dataSource.getRepository(Product),
      dataSource.getRepository(ProductImage),
      dataSource.getRepository(ProductCertification),
    ),
  );
}
