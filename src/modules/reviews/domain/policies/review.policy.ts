import { ReviewOwnershipError, ReviewStateError } from '../errors/review-domain.error';

export function assertCanReviewProduct(
  reviewerId: string,
  sellerId: string,
): void {
  if (reviewerId === sellerId) {
    throw new ReviewOwnershipError('You cannot review your own product');
  }
}

export function assertCanReplyToReview(
  revieweeId: string | null,
  sellerId: string,
  sellerReply: string | null,
): void {
  if (revieweeId !== sellerId) {
    throw new ReviewOwnershipError('You cannot reply to this review');
  }
  if (sellerReply) {
    throw new ReviewStateError('This review has already been replied to');
  }
}

export function assertCanChangeReviewVisibility(
  isHidden: boolean,
  shouldBeHidden: boolean,
): void {
  if (isHidden === shouldBeHidden) {
    throw new ReviewStateError(
      shouldBeHidden ? 'This review is already hidden' : 'This review is already visible',
    );
  }
}
