import { Inject, Injectable } from '@nestjs/common';

import { UserStatus } from '@common/enums';
import {
  PRODUCT_REVIEW_READER,
  ProductReviewReader,
} from '@modules/products/application/ports/inbound/product-review.port';
import {
  USER_REVIEW_READER,
  UserReviewReader,
} from '@modules/users/application/ports/user-review.port';
import {
  ProductForReviewNotFoundError,
  ReviewAlreadyExistsError,
  ReviewNotFoundError,
  ReviewerNotEligibleError,
} from '../errors/reviews-application.error';
import {
  AdminReviewFilter,
  CreateReviewInput,
  PublicReviewListResult,
  ReviewListResult,
  ReviewModel,
  ReviewPagination,
  SellerReviewFilter,
} from '../models/review.model';
import {
  REVIEWS_REPOSITORY,
  ReviewsRepositoryPort,
} from '../ports/outbound/reviews-repository.port';
import {
  assertCanChangeReviewVisibility,
  assertCanReplyToReview,
  assertCanReviewProduct,
} from '../../domain/policies/review.policy';
import { ReviewStateError } from '../../domain/errors/review-domain.error';
import { ReviewReadModelService } from '../services/review-read-model.service';

@Injectable()
export class ListPublicProductReviewsUseCase {
  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviews: ReviewsRepositoryPort,
    private readonly readModel: ReviewReadModelService,
  ) {}

  async execute(
    productId: string,
    pagination: ReviewPagination,
  ): Promise<PublicReviewListResult> {
    const result = await this.reviews.findPublicByProduct(
      productId,
      pagination,
    );
    return {
      ...result,
      data: await this.readModel.compose(result.data, {
        includeReviewer: true,
        maskReviewer: true,
      }),
    };
  }
}

@Injectable()
export class CreateProductReviewUseCase {
  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviews: ReviewsRepositoryPort,
    @Inject(PRODUCT_REVIEW_READER)
    private readonly products: ProductReviewReader,
    @Inject(USER_REVIEW_READER)
    private readonly users: UserReviewReader,
  ) {}

  async execute(
    reviewerId: string,
    input: Omit<CreateReviewInput, 'reviewerId' | 'revieweeId'>,
  ): Promise<ReviewModel> {
    const [product, reviewer] = await Promise.all([
      this.products.findReviewContext(input.productId),
      this.users.findReviewEligibility(reviewerId),
    ]);
    if (!product) {
      throw new ProductForReviewNotFoundError();
    }
    if (!reviewer || reviewer.status !== UserStatus.ACTIVE) {
      throw new ReviewerNotEligibleError();
    }
    assertCanReviewProduct(reviewerId, product.sellerId);

    const review = await this.reviews.createIfAbsent({
      ...input,
      reviewerId,
      revieweeId: product.sellerId,
    });
    if (!review) {
      throw new ReviewAlreadyExistsError();
    }
    return review;
  }
}

@Injectable()
export class ListSellerReviewsUseCase {
  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviews: ReviewsRepositoryPort,
    private readonly readModel: ReviewReadModelService,
  ) {}

  async execute(
    sellerId: string,
    filter: SellerReviewFilter,
  ): Promise<ReviewListResult> {
    const result = await this.reviews.findForSeller(sellerId, filter);
    return {
      ...result,
      data: await this.readModel.compose(result.data, {
        includeReviewer: true,
        includeProduct: true,
      }),
    };
  }
}

@Injectable()
export class ReplyToReviewUseCase {
  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviews: ReviewsRepositoryPort,
    private readonly readModel: ReviewReadModelService,
  ) {}

  async execute(id: string, sellerId: string, reply: string): Promise<ReviewModel> {
    const review = await this.getReview(id);
    assertCanReplyToReview(review.revieweeId, sellerId, review.sellerReply);

    const saved = await this.reviews.saveReplyIfUnreplied(
      id,
      sellerId,
      reply.trim(),
      new Date(),
    );
    if (!saved) {
      throw new ReviewStateError('This review is no longer available for a reply');
    }
    return this.readModel.composeOne(saved);
  }

  private async getReview(id: string): Promise<ReviewModel> {
    const review = await this.reviews.findById(id);
    if (!review) {
      throw new ReviewNotFoundError();
    }
    return review;
  }
}

@Injectable()
export class ListReviewsForModerationUseCase {
  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviews: ReviewsRepositoryPort,
    private readonly readModel: ReviewReadModelService,
  ) {}

  async execute(filter: AdminReviewFilter): Promise<ReviewListResult> {
    const result = await this.reviews.findForModeration(filter);
    return {
      ...result,
      data: await this.readModel.compose(result.data, {
        includeReviewer: true,
        includeProduct: true,
      }),
    };
  }
}

@Injectable()
export class HideReviewUseCase {
  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviews: ReviewsRepositoryPort,
    private readonly readModel: ReviewReadModelService,
  ) {}

  async execute(id: string, adminId: string, reason: string): Promise<ReviewModel> {
    const review = await this.getReview(id);
    assertCanChangeReviewVisibility(review.isHidden, true);

    const saved = await this.reviews.setVisibility(
      id,
      false,
      true,
      reason.trim(),
      adminId,
      new Date(),
    );
    if (!saved) {
      throw new ReviewStateError('This review is no longer visible');
    }
    return this.readModel.composeOne(saved);
  }

  private async getReview(id: string): Promise<ReviewModel> {
    const review = await this.reviews.findById(id);
    if (!review) {
      throw new ReviewNotFoundError();
    }
    return review;
  }
}

@Injectable()
export class UnhideReviewUseCase {
  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviews: ReviewsRepositoryPort,
    private readonly readModel: ReviewReadModelService,
  ) {}

  async execute(id: string): Promise<ReviewModel> {
    const review = await this.getReview(id);
    assertCanChangeReviewVisibility(review.isHidden, false);

    const saved = await this.reviews.setVisibility(
      id,
      true,
      false,
      null,
      null,
      null,
    );
    if (!saved) {
      throw new ReviewStateError('This review is no longer hidden');
    }
    return this.readModel.composeOne(saved);
  }

  private async getReview(id: string): Promise<ReviewModel> {
    const review = await this.reviews.findById(id);
    if (!review) {
      throw new ReviewNotFoundError();
    }
    return review;
  }
}
