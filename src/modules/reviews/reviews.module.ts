import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from '@modules/products/infrastructure/persistence/entities/product.entity';
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

@Module({
  imports: [TypeOrmModule.forFeature([Review, Product])],
  controllers: [ReviewsController],
  providers: [
    TypeOrmReviewsRepository,
    ListPublicProductReviewsUseCase,
    CreateProductReviewUseCase,
    ListSellerReviewsUseCase,
    ReplyToReviewUseCase,
    ListReviewsForModerationUseCase,
    HideReviewUseCase,
    UnhideReviewUseCase,
    { provide: REVIEWS_REPOSITORY, useExisting: TypeOrmReviewsRepository },
  ],
})
export class ReviewsModule {}
