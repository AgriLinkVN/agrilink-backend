import { UserStatus } from '@common/enums';

export const USER_REVIEW_READER = Symbol('USER_REVIEW_READER');

export interface UserReviewEligibility {
  id: string;
  status: UserStatus;
}

export interface UserReviewSummary {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface UserReviewReader {
  findReviewEligibility(
    userId: string,
  ): Promise<UserReviewEligibility | null>;
  findReviewSummariesByIds(ids: string[]): Promise<UserReviewSummary[]>;
}
