import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import {
  ProductForReviewNotFoundError,
  ReviewAlreadyExistsError,
  ReviewNotFoundError,
} from '../../application/errors/reviews-application.error';
import {
  ReviewOwnershipError,
  ReviewStateError,
} from '../../domain/errors/review-domain.error';

export function mapReviewsApplicationError(error: unknown): never {
  if (error instanceof ProductForReviewNotFoundError || error instanceof ReviewNotFoundError) {
    throw new NotFoundException(error.message);
  }
  if (error instanceof ReviewAlreadyExistsError || error instanceof ReviewStateError) {
    throw new ConflictException(error.message);
  }
  if (error instanceof ReviewOwnershipError) {
    throw new ForbiddenException(error.message);
  }
  throw error;
}
