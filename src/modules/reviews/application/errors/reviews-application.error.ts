export class ReviewNotFoundError extends Error {
  constructor() {
    super('Review was not found');
    this.name = 'ReviewNotFoundError';
  }
}

export class ProductForReviewNotFoundError extends Error {
  constructor() {
    super('Product was not found');
    this.name = 'ProductForReviewNotFoundError';
  }
}

export class ReviewAlreadyExistsError extends Error {
  constructor() {
    super('A review already exists for this buyer and product');
    this.name = 'ReviewAlreadyExistsError';
  }
}

export class ReviewerNotEligibleError extends Error {
  constructor() {
    super('Reviewer account is not active');
    this.name = 'ReviewerNotEligibleError';
  }
}
