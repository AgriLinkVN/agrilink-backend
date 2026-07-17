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
import {
  PRODUCT_CATALOG_QUERY,
  PRODUCT_CATEGORY_QUERY,
  PRODUCT_CERTIFICATION_REPOSITORY,
  PRODUCT_DETAIL_QUERY,
  PRODUCT_IMAGE_REPOSITORY,
  PRODUCT_REPOSITORY,
  PRODUCT_SEED_REPOSITORY,
  PRODUCT_WISHLIST_REPOSITORY,
} from './application/ports/outbound/product-repository.port';
import { TypeOrmProductRepository } from './infrastructure/repositories/typeorm-product.repository';
import {
  AddProductCertificationUseCase,
  AddProductImageUseCase,
  AddWishlistItemUseCase,
  ChangeProductStatusUseCase,
  CreateProductUseCase,
  DeleteProductUseCase,
  GetProductCategoryTreeUseCase,
  GetProductDetailUseCase,
  ListPendingProductCertificationsUseCase,
  ListProductCategoriesUseCase,
  ListPublicProductsUseCase,
  ListSellerProductsUseCase,
  ListWishlistUseCase,
  ListWishlistedProductIdsUseCase,
  RemoveProductCertificationUseCase,
  RemoveProductImageUseCase,
  RemoveWishlistItemUseCase,
  UpdateProductUseCase,
  VerifyProductCertificationUseCase,
} from './application/use-cases/product.use-cases';

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
  providers: [
    TypeOrmProductRepository,
    ProductsService,
    CreateProductUseCase,
    ListPublicProductsUseCase,
    GetProductDetailUseCase,
    ListSellerProductsUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    ChangeProductStatusUseCase,
    AddProductImageUseCase,
    RemoveProductImageUseCase,
    AddProductCertificationUseCase,
    RemoveProductCertificationUseCase,
    ListPendingProductCertificationsUseCase,
    VerifyProductCertificationUseCase,
    AddWishlistItemUseCase,
    RemoveWishlistItemUseCase,
    ListWishlistUseCase,
    ListWishlistedProductIdsUseCase,
    ListProductCategoriesUseCase,
    GetProductCategoryTreeUseCase,
    { provide: PRODUCT_REPOSITORY, useExisting: TypeOrmProductRepository },
    { provide: PRODUCT_CATALOG_QUERY, useExisting: TypeOrmProductRepository },
    { provide: PRODUCT_DETAIL_QUERY, useExisting: TypeOrmProductRepository },
    { provide: PRODUCT_CATEGORY_QUERY, useExisting: TypeOrmProductRepository },
    { provide: PRODUCT_IMAGE_REPOSITORY, useExisting: TypeOrmProductRepository },
    {
      provide: PRODUCT_CERTIFICATION_REPOSITORY,
      useExisting: TypeOrmProductRepository,
    },
    { provide: PRODUCT_WISHLIST_REPOSITORY, useExisting: TypeOrmProductRepository },
    { provide: PRODUCT_SEED_REPOSITORY, useExisting: TypeOrmProductRepository },
  ],
})
export class ProductsModule { }
