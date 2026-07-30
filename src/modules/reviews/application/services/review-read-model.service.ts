import { Inject, Injectable } from '@nestjs/common';

import {
  PRODUCT_REVIEW_READER,
  ProductReviewReader,
} from '@modules/products/application/ports/inbound/product-review.port';
import {
  USER_REVIEW_READER,
  UserReviewReader,
} from '@modules/users/application/ports/user-review.port';
import { ReviewModel } from '../models/review.model';

export interface ReviewCompositionOptions {
  includeReviewer?: boolean;
  includeProduct?: boolean;
  maskReviewer?: boolean;
}

@Injectable()
export class ReviewReadModelService {
  constructor(
    @Inject(PRODUCT_REVIEW_READER)
    private readonly products: ProductReviewReader,
    @Inject(USER_REVIEW_READER)
    private readonly users: UserReviewReader,
  ) {}

  async compose(
    reviews: ReviewModel[],
    options: ReviewCompositionOptions,
  ): Promise<ReviewModel[]> {
    const reviewerIds = options.includeReviewer
      ? [...new Set(reviews.map(({ reviewerId }) => reviewerId))]
      : [];
    const productIds = options.includeProduct
      ? [
          ...new Set(
            reviews
              .map(({ productId }) => productId)
              .filter((id): id is string => !!id),
          ),
        ]
      : [];

    const [reviewers, products] = await Promise.all([
      this.users.findReviewSummariesByIds(reviewerIds),
      this.products.findReviewSummariesByIds(productIds),
    ]);
    const reviewerById = new Map(reviewers.map((user) => [user.id, user]));
    const productById = new Map(products.map((product) => [product.id, product]));

    return reviews.map((review) => {
      const reviewer = reviewerById.get(review.reviewerId);
      const product = review.productId
        ? productById.get(review.productId)
        : undefined;
      return {
        ...review,
        reviewer: reviewer
          ? {
              ...reviewer,
              fullName: options.maskReviewer
                ? maskName(reviewer.fullName)
                : reviewer.fullName,
            }
          : null,
        product: product
          ? { id: product.id, name: product.name }
          : null,
      };
    });
  }

  async composeOne(review: ReviewModel): Promise<ReviewModel> {
    const [composed] = await this.compose([review], {
      includeReviewer: true,
      includeProduct: true,
    });
    return composed;
  }
}

function maskName(fullName: string | null): string {
  if (!fullName?.trim()) {
    return 'Người dùng';
  }
  const parts = fullName.trim().split(/\s+/);
  return parts.length === 1
    ? `${parts[0].charAt(0)}***`
    : `${parts[0]} ${parts.at(-1)?.charAt(0) ?? ''}***`;
}
