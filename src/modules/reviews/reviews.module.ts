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

@Module({
  imports: [ProductsModule, UsersModule, TypeOrmModule.forFeature([Review])],
  controllers: [ReviewsController],
  providers: [
    TypeOrmReviewsRepository,
    ReviewReadModelService,
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
