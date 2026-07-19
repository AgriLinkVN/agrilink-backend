import { Inject, Injectable } from '@nestjs/common';

import {
  ProductForReviewNotFoundError,
  ReviewAlreadyExistsError,
  ReviewNotFoundError,
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

@Injectable()
export class ListPublicProductReviewsUseCase {
  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviews: ReviewsRepositoryPort,
  ) {}

  execute(
    productId: string,
    pagination: ReviewPagination,
  ): Promise<PublicReviewListResult> {
    return this.reviews.findPublicByProduct(productId, pagination);
  }
}

@Injectable()
export class CreateProductReviewUseCase {
  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviews: ReviewsRepositoryPort,
  ) {}

  async execute(
    reviewerId: string,
    input: Omit<CreateReviewInput, 'reviewerId' | 'revieweeId'>,
  ): Promise<ReviewModel> {
    const product = await this.reviews.findProductContext(input.productId);
    if (!product) {
      throw new ProductForReviewNotFoundError();
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
  ) {}

  execute(sellerId: string, filter: SellerReviewFilter): Promise<ReviewListResult> {
    return this.reviews.findForSeller(sellerId, filter);
  }
}

@Injectable()
export class ReplyToReviewUseCase {
  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviews: ReviewsRepositoryPort,
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
    return saved;
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
  ) {}

  execute(filter: AdminReviewFilter): Promise<ReviewListResult> {
    return this.reviews.findForModeration(filter);
  }
}

@Injectable()
export class HideReviewUseCase {
  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviews: ReviewsRepositoryPort,
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
    return saved;
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
    return saved;
  }

  private async getReview(id: string): Promise<ReviewModel> {
    const review = await this.reviews.findById(id);
    if (!review) {
      throw new ReviewNotFoundError();
    }
    return review;
  }
}
