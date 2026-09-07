import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductsModule } from '@modules/products/products.module';
import { UsersModule } from '@modules/users/users.module';
import {
  CreateProductReviewUseCase,
  HideReviewUseCase,
  ListPublicProductReviewsUseCase,
  ListReviewsForModerationUseCase,
  ListSellerReviewsUseCase,
  ReplyToReviewUseCase,
  UnhideReviewUseCase,
} from './application/use-cases/reviews.use-cases';
import { REVIEWS_REPOSITORY } from './application/ports/outbound/reviews-repository.port';
import { Review } from './infrastructure/persistence/entities/review.entity';
import { TypeOrmReviewsRepository } from './infrastructure/persistence/repositories/typeorm-reviews.repository';
import { ReviewsController } from './presentation/controllers/reviews.controller';
import { ReviewReadModelService } from './application/services/review-read-model.service';
import { OrdersModule } from '@modules/orders/orders.module';
import {
  REVIEW_DEV_SEED_WRITER,
  ReviewDevelopmentSeedService,
} from './infrastructure/database/seeds/review-development-seed.service';
import { TypeOrmReviewDevSeedWriter } from './infrastructure/database/seeds/typeorm-review-dev-seed.writer';

@Module({
  imports: [
    ProductsModule,
    UsersModule,
    OrdersModule,
    TypeOrmModule.forFeature([Review]),
  ],
  controllers: [ReviewsController],
  providers: [
    TypeOrmReviewsRepository,
    TypeOrmReviewDevSeedWriter,
    ReviewDevelopmentSeedService,
    ReviewReadModelService,
    ListPublicProductReviewsUseCase,
    CreateProductReviewUseCase,
    ListSellerReviewsUseCase,
    ReplyToReviewUseCase,
    ListReviewsForModerationUseCase,
    HideReviewUseCase,
    UnhideReviewUseCase,
    { provide: REVIEWS_REPOSITORY, useExisting: TypeOrmReviewsRepository },
    {
      provide: REVIEW_DEV_SEED_WRITER,
      useExisting: TypeOrmReviewDevSeedWriter,
    },
  ],
})
export class ReviewsModule {}
