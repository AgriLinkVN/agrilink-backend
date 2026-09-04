export class CommerceApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class CommerceInputError extends CommerceApplicationError {}
export class CommerceForbiddenError extends CommerceApplicationError {}
export class CommerceNotFoundError extends CommerceApplicationError {}
export class CommerceConflictError extends CommerceApplicationError {}
export class CommerceOperationInProgressError extends CommerceConflictError {}
export class IdempotencyConflictError extends CommerceConflictError {}
