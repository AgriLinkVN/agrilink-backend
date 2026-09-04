export interface ReviewUserModel {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface ReviewProductModel {
  id: string;
  name: string | null;
}

export interface ReviewModel {
  id: string;
  reviewerId: string;
  revieweeId: string | null;
  productId: string | null;
  rating: number;
  comment: string | null;
  images: string[];
  isVerifiedPurchase: boolean;
  sellerReply: string | null;
  sellerReplyAt: Date | null;
  isHidden: boolean;
  hiddenReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  reviewer?: ReviewUserModel | null;
  product?: ReviewProductModel | null;
}

export interface RatingStatsModel {
  avg: number;
  total: number;
  distribution: Record<number, number>;
}

export interface ReviewListResult {
  data: ReviewModel[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicReviewListResult extends ReviewListResult {
  stats: RatingStatsModel;
}

export interface CreateReviewInput {
  productId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  images: string[];
  isVerifiedPurchase: boolean;
}

export interface ReviewPagination {
  page?: number;
  limit?: number;
}

export interface SellerReviewFilter extends ReviewPagination {
  replied?: boolean;
}

export interface AdminReviewFilter extends ReviewPagination {
  isHidden?: boolean;
}
