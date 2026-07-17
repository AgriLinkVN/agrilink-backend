export class ProductApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ProductNotFoundError extends ProductApplicationError {}

export class ProductForbiddenError extends ProductApplicationError {}

export class InvalidProductStatusTransitionError extends ProductApplicationError {}

export class ProductCertificationNotFoundError extends ProductApplicationError {}

export class InvalidProductCertificationVerificationError extends ProductApplicationError {}

export class WishlistProductUnavailableError extends ProductApplicationError {}
