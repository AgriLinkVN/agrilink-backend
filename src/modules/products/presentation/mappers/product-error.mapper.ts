import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  InvalidProductCertificationVerificationError,
  InvalidProductStatusTransitionError,
  ProductCertificationNotFoundError,
  ProductForbiddenError,
  ProductNotFoundError,
  WishlistProductUnavailableError,
} from '../../domain/errors/product-application.error';

export function mapProductApplicationError(error: unknown): never {
  if (
    error instanceof ProductNotFoundError ||
    error instanceof ProductCertificationNotFoundError ||
    error instanceof WishlistProductUnavailableError
  ) {
    throw new NotFoundException(error.message);
  }
  if (error instanceof ProductForbiddenError) {
    throw new ForbiddenException(error.message);
  }
  if (
    error instanceof InvalidProductStatusTransitionError ||
    error instanceof InvalidProductCertificationVerificationError
  ) {
    throw new BadRequestException(error.message);
  }
  throw error;
}
