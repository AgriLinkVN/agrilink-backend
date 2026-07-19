export class ReviewOwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewOwnershipError';
  }
}

export class ReviewStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewStateError';
  }
}
