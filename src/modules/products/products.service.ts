import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductCertification } from './entities/product-certification.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(ProductCertification)
    private readonly certRepo: Repository<ProductCertification>,
  ) {}

  async create(sellerId: string, dto: CreateProductDto): Promise<Product> {
    throw new Error('TODO: implement ProductsService.create()');
  }

  async findAll(filter: ProductFilterDto): Promise<{ data: Product[]; total: number }> {
    throw new Error('TODO: implement ProductsService.findAll()');
  }

  async findOne(id: string): Promise<Product | null> {
    throw new Error('TODO: implement ProductsService.findOne()');
  }

  async update(id: string, sellerId: string, dto: UpdateProductDto): Promise<Product> {
    throw new Error('TODO: implement ProductsService.update()');
  }

  async remove(id: string, sellerId: string): Promise<void> {
    throw new Error('TODO: implement ProductsService.remove()');
  }

  async addImage(productId: string, imageUrl: string, isPrimary: boolean): Promise<ProductImage> {
    throw new Error('TODO: implement ProductsService.addImage()');
  }

  async addCertification(productId: string, data: Partial<ProductCertification>): Promise<ProductCertification> {
    throw new Error('TODO: implement ProductsService.addCertification()');
  }
}
