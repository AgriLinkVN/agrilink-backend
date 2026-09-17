import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from './infrastructure/persistence/entities/product.entity';
import { ProductImage } from './infrastructure/persistence/entities/product-image.entity';
import { ProductCertification } from './infrastructure/persistence/entities/product-certification.entity';
import { ProductCategory } from './infrastructure/persistence/entities/product-category.entity';
import { Wishlist } from './infrastructure/persistence/entities/wishlist.entity';
import { ProductsService } from './application/products.service';
import { ProductsController } from './presentation/controllers/products.controller';
import { WishlistController } from './presentation/controllers/wishlist.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import {
  PRODUCT_CATALOG_QUERY,
  PRODUCT_COMMERCE_QUERY,
  PRODUCT_CATEGORY_QUERY,
  PRODUCT_CERTIFICATION_REPOSITORY,
  PRODUCT_DETAIL_QUERY,
  PRODUCT_IMAGE_REPOSITORY,
  PRODUCT_ADMIN_QUERY,
  PRODUCT_MODERATION_REPOSITORY,
  PRODUCT_REPOSITORY,
  PRODUCT_REVIEW_QUERY,
  PRODUCT_WISHLIST_REPOSITORY,
} from './application/ports/outbound/product-repository.port';
import {
  PRODUCT_ADMIN_READER,
  PRODUCT_MODERATION_MANAGER,
} from './application/ports/inbound/product-admin.port';
import { PRODUCT_REVIEW_READER } from './application/ports/inbound/product-review.port';
import { PRODUCT_COMMERCE_READER } from './application/ports/inbound/product-commerce.port';
import { ProductBoundaryService } from './application/services/product-boundary.service';
import { TypeOrmProductRepository } from './infrastructure/repositories/typeorm-product.repository';
import {
  PRODUCT_DEV_SEED_WRITER,
  ProductDevelopmentSeedService,
} from './infrastructure/database/seeds/product-development-seed.service';
import { TypeOrmProductDevSeedWriter } from './infrastructure/database/seeds/typeorm-product-dev-seed.writer';
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
    StorageModule,
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
    TypeOrmProductDevSeedWriter,
    ProductDevelopmentSeedService,
    ProductsService,
    ProductBoundaryService,
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
    {
      provide: PRODUCT_IMAGE_REPOSITORY,
      useExisting: TypeOrmProductRepository,
    },
    {
      provide: PRODUCT_CERTIFICATION_REPOSITORY,
      useExisting: TypeOrmProductRepository,
    },
    {
      provide: PRODUCT_WISHLIST_REPOSITORY,
      useExisting: TypeOrmProductRepository,
    },
    {
      provide: PRODUCT_DEV_SEED_WRITER,
      useExisting: TypeOrmProductDevSeedWriter,
    },
    { provide: PRODUCT_REVIEW_QUERY, useExisting: TypeOrmProductRepository },
    { provide: PRODUCT_COMMERCE_QUERY, useExisting: TypeOrmProductRepository },
    { provide: PRODUCT_ADMIN_QUERY, useExisting: TypeOrmProductRepository },
    {
      provide: PRODUCT_MODERATION_REPOSITORY,
      useExisting: TypeOrmProductRepository,
    },
    { provide: PRODUCT_REVIEW_READER, useExisting: ProductBoundaryService },
    { provide: PRODUCT_COMMERCE_READER, useExisting: ProductBoundaryService },
    { provide: PRODUCT_ADMIN_READER, useExisting: ProductBoundaryService },
    {
      provide: PRODUCT_MODERATION_MANAGER,
      useExisting: ProductBoundaryService,
    },
  ],
  exports: [
    PRODUCT_REVIEW_READER,
    PRODUCT_COMMERCE_READER,
    PRODUCT_ADMIN_READER,
    PRODUCT_MODERATION_MANAGER,
  ],
})
export class ProductsModule {}
