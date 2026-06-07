import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from './domain/entities/product.entity';
import { ProductImage } from './domain/entities/product-image.entity';
import { ProductCertification } from './domain/entities/product-certification.entity';
import { ProductCategory } from './domain/entities/product-category.entity';
import { ProductsService } from './application/products.service';
import { ProductsController } from './presentation/controllers/products.controller';
import { User } from '../users/entities/user.entity';
import { Province } from '../geography/entities/province.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductImage,
      ProductCertification,
      ProductCategory,
      User,
      Province,
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule { }