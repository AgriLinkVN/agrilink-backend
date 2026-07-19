import {
  AdminReviewFilter,
  CreateReviewInput,
  ProductReviewContext,
  PublicReviewListResult,
  ReviewListResult,
  ReviewModel,
  ReviewPagination,
  SellerReviewFilter,
} from '../../models/review.model';

export const REVIEWS_REPOSITORY = Symbol('REVIEWS_REPOSITORY');

export interface ReviewsRepositoryPort {
  findProductContext(productId: string): Promise<ProductReviewContext | null>;
  createIfAbsent(input: CreateReviewInput): Promise<ReviewModel | null>;
  findById(id: string): Promise<ReviewModel | null>;
  findPublicByProduct(
    productId: string,
    pagination: ReviewPagination,
  ): Promise<PublicReviewListResult>;
  findForSeller(
    sellerId: string,
    filter: SellerReviewFilter,
  ): Promise<ReviewListResult>;
  findForModeration(filter: AdminReviewFilter): Promise<ReviewListResult>;
  saveReplyIfUnreplied(
    id: string,
    sellerId: string,
    reply: string,
    repliedAt: Date,
  ): Promise<ReviewModel | null>;
  setVisibility(
    id: string,
    expectedHidden: boolean,
    isHidden: boolean,
    hiddenReason: string | null,
    hiddenBy: string | null,
    hiddenAt: Date | null,
  ): Promise<ReviewModel | null>;
}
