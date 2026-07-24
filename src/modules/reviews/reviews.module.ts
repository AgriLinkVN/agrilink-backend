import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@database/entities/user.entity';
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
import { TrustScoreService, TRUST_SCORE_SERVICE } from './application/trust-score.service';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Product, User])],
  controllers: [ReviewsController],
  providers: [
    TypeOrmReviewsRepository,
    TrustScoreService,
    ListPublicProductReviewsUseCase,
    CreateProductReviewUseCase,
    ListSellerReviewsUseCase,
    ReplyToReviewUseCase,
    ListReviewsForModerationUseCase,
    HideReviewUseCase,
    UnhideReviewUseCase,
    { provide: REVIEWS_REPOSITORY, useExisting: TypeOrmReviewsRepository },
    { provide: TRUST_SCORE_SERVICE, useExisting: TrustScoreService },
  ],
})
export class ReviewsModule {}
