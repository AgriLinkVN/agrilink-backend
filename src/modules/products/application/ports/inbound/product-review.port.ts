export const PRODUCT_REVIEW_READER = Symbol('PRODUCT_REVIEW_READER');

export interface ProductReviewContext {
  id: string;
  sellerId: string;
  name: string | null;
}

export interface ProductReviewSummary {
  id: string;
  name: string | null;
}

export interface ProductReviewReader {
  findReviewContext(productId: string): Promise<ProductReviewContext | null>;
  findReviewSummariesByIds(ids: string[]): Promise<ProductReviewSummary[]>;
}
