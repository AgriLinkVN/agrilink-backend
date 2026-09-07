import {
  PublicReviewListResult,
  ReviewListResult,
  ReviewModel,
} from '../../application/models/review.model';

export function presentReview(review: ReviewModel) {
  return {
    id: review.id,
    revieweeId: review.revieweeId,
    productId: review.productId,
    rating: review.rating,
    comment: review.comment,
    images: JSON.stringify(review.images),
    isVerifiedPurchase: review.isVerifiedPurchase,
    sellerReply: review.sellerReply,
    sellerReplyAt: review.sellerReplyAt,
    isHidden: review.isHidden,
    hiddenReason: review.hiddenReason,
    createdAt: review.createdAt,
    reviewer: review.reviewer
      ? {
          id: review.reviewer.id,
          fullName: review.reviewer.fullName ?? 'Người dùng',
          avatarUrl: review.reviewer.avatarUrl ?? undefined,
        }
      : null,
    product: review.product ?? undefined,
  };
}

export function presentReviewList(result: ReviewListResult) {
  return { ...result, data: result.data.map(presentReview) };
}

export function presentPublicReviewList(result: PublicReviewListResult) {
  return { ...presentReviewList(result), stats: result.stats };
}
