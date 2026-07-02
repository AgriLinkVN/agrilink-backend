import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from './domain/entities/product.entity';
import { ProductImage } from './domain/entities/product-image.entity';
import { ProductCertification } from './domain/entities/product-certification.entity';
import { ProductCategory } from './domain/entities/product-category.entity';
import { Wishlist } from './domain/entities/wishlist.entity';
import { ProductsService } from './application/products.service';
import { ProductsController } from './presentation/controllers/products.controller';
import { WishlistController } from './presentation/controllers/wishlist.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([
      Product,
      ProductImage,
      ProductCertification,
      ProductCategory,
      Wishlist,
    ]),
  ],
  controllers: [ProductsController, WishlistController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule { }
